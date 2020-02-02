import { EventEmitter } from "events";
import * as Homebridge from "./homebridge";
import { ScoutApi } from "./scout-api";
import { HubManager } from "./hub-manager";
import { DeviceManager } from "./device-manager";
import { ModesConfig, ModesConfigKey } from "./config";
import { Location, Hub, Device, Mode } from "scout-api";

export class ScoutPlatform extends EventEmitter {
    private readonly cachedAccessories = new Map<string, Homebridge.PlatformAccessory>();

    public constructor(
            private readonly logger: Homebridge.Logger,
            private readonly api: ScoutApi,
            private readonly hubManager: HubManager,
            private readonly deviceManager: DeviceManager,
            private readonly locationName: string,
            private readonly modeNames: ModesConfig) {
        super();

        deviceManager.on("paired", accessory => this.emit("addAccessory", accessory));
        deviceManager.on("unpaired", accessory => this.emit("removeAccessory", accessory));
    }

    private async getLocation(): Promise<Location> {
        const memberId = await this.api.getMemberId();
        const locations = await this.api.getMemberLocations();

        this.logger.debug(`Locations: ${JSON.stringify(locations)}`);

        const adminIds = Array.prototype.concat.apply([], locations.map(location => location.admin_ids));

        if (adminIds.find(adminId => adminId == memberId)) {
            this.logger.warn(`The authenticated member [${memberId}] is an admin. It is highly recommended to use a non-admin member.`);
        }

        const location = locations.find(location => location.name == this.locationName);

        if (!location) {
            throw new Error(`No location found for "${this.locationName}".`);
        }

        this.logger.info(`Using "${this.locationName}" location [${location.id}].`);

        return location;
    }

    private getModeIds(modes: Mode[]): string[] {
        const keys = [ModesConfigKey.Stay, ModesConfigKey.Away, ModesConfigKey.Night];
        const modeIds: string[] = [];

        keys.forEach(key => {
            const modeName = this.modeNames[key];

            if (!modeName) {
                throw new Error(`Missing mode name mapping configuration for "${key}".`);
            }

            const modeId = modes.filter(mode => mode.name == modeName).map(mode => mode.id).pop();

            if (!modeId) {
                throw new Error(`No mode found for "${modeName}".`);
            }

            this.logger.info(`Using "${modeName}" mode [${modeId}] for ${key} state.`);

            modeIds.push(modeId);
        });

        return modeIds;
    }

    public async registerAccessories(): Promise<void> {
        const location = await this.getLocation();
        const hub = await this.api.getLocationHub(location.id);
        const modes = await this.api.getLocationModes(location.id);
        const devices = await this.api.getLocationDevices(location.id);

        this.logger.info(`Discovered hub [${hub.id}].`);
        this.logger.debug(`Hub: ${JSON.stringify(hub)}`);
        this.logger.debug(`Modes: ${JSON.stringify(modes)}`);
        this.logger.debug(`Devices: ${JSON.stringify(devices)}`);

        const modeIds = this.getModeIds(modes);

        this.registerHub(hub, modes, modeIds);
        this.registerDevices(devices);

        this.deregisterCachedAccessories();

        const listener = await this.api.subscribe();

        listener.addModeListener(location.id, event => this.hubManager.onModeEvent(event));
        listener.addHubListener(location.id, event => this.hubManager.onHubEvent(event));
        listener.addDeviceTriggerListener(location.id, event => this.deviceManager.onDeviceEvent(event));
        listener.addDevicePairListener(location.id, event => this.deviceManager.onDeviceEvent(event));

        listener.addConnectionStateListener(states => {
            this.logger.info(`Event subscription connection is ${states.current}`);
            this.logger.debug(`Event subscription connection state: ${JSON.stringify(states)}`);

            this.hubManager.onConnectionStateEvent(states);
            this.deviceManager.onConnectionStateEvent(states);
        });
    }

    public deregisterCachedAccessories(): void {
        this.cachedAccessories.forEach(accessory => {
            this.logger.info(`Removing cached accessory [${accessory.UUID}].`);

            this.emit("removeAccessory", accessory);
        });
    }

    public configureAccessory(accessory: Homebridge.PlatformAccessory): void {
        this.logger.info(`Discovered cached accessory [${accessory.UUID}]`);

        this.cachedAccessories.set(accessory.UUID, accessory);
    }

    private registerHub(hub: Hub, modes: Mode[], modeIds: string[]): Homebridge.PlatformAccessory {
        let accessory = this.hubManager.createAccessory(hub, modes, modeIds);

        if (this.cachedAccessories.has(accessory.UUID)) {
            this.logger.info(`Using cached hub accessory [${accessory.UUID}].`);

            const cachedAccessory = this.cachedAccessories.get(accessory.UUID);
            cachedAccessory!.context = accessory.context;
            accessory = cachedAccessory!;

            this.cachedAccessories.delete(accessory.UUID);
        } else {
            this.logger.info(`Adding new hub accessory [${accessory.UUID}].`);

            this.emit("addAccessory", accessory);
        }

        this.hubManager.configureAccessory(accessory);

        return accessory;
    }

    private registerDevices(devices: Device[]): void {
        devices.filter(device => this.deviceManager.isSupported(device))
                .map(device => this.deviceManager.createAccessory(device))
                .forEach(accessory => {
                    if (this.cachedAccessories.has(accessory.UUID)) {
                        this.logger.info(`Using cached device accessory [${accessory.UUID}].`);

                        const cachedAccessory = this.cachedAccessories.get(accessory.UUID);
                        cachedAccessory!.context = accessory.context;
                        accessory = cachedAccessory!;

                        this.cachedAccessories.delete(accessory.UUID);
                    } else {
                        this.logger.info(`Adding new device accessory [${accessory.UUID}].`);

                        this.emit("addAccessory", accessory);
                    }

                    this.deviceManager.configureAccessory(accessory);
                });
    }
}
