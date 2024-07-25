import { Hub, HubChirpType, LocationEventType, ModeEvent, Mode } from 'scout-api';
import { AccessoryFactory, AccessoryInfo, TypedPlatformAccessory, AccessoryContext } from '../accessoryFactory';

export interface SecuritySystemContext {
    hub: Hub;
    modes: Mode[];
}

export class SecuritySystemAccessoryFactory extends AccessoryFactory<SecuritySystemContext> {
    private static readonly NAME = 'Security System';
    private static readonly MANUFACTURER = 'Scout';

    private readonly accessories = new Map<string, TypedPlatformAccessory<SecuritySystemContext>>();
    private readonly locationHubs = new Map<string, string>();

    public configureAccessory(accessory: TypedPlatformAccessory<SecuritySystemContext>): void {
        super.configureAccessory(accessory);

        const locationId = accessory.context.locationId;
        const hubId = accessory.context.custom.hub.id;

        this.locationHubs.set(locationId, hubId);
        this.accessories.set(hubId, accessory);

        accessory.on('identify', () => {
            this.identify(accessory.context).catch(e => {
                this.homebridge.logger.error(e instanceof Error ? e.message : String(e));
            });
        });
    }

    protected async createAccessoryInfo(locationId: string): Promise<AccessoryInfo<SecuritySystemContext>[]> {
        if (!this.homebridge.config.modes) {
            return [];
        }

        const hub = (await this.scout.api.getHub(locationId)).data;
        const modes = (await this.scout.api.getModes(locationId)).data;

        this.homebridge.logger.debug(`Hub: ${JSON.stringify(hub)}`);
        this.homebridge.logger.debug(`Modes: ${JSON.stringify(modes)}`);

        return [
            {
                name: SecuritySystemAccessoryFactory.NAME,
                id: hub.id,
                category: this.homebridge.api.hap.Categories.SECURITY_SYSTEM,
                context: {
                    hub,
                    modes,
                },
                manufacturer: SecuritySystemAccessoryFactory.MANUFACTURER,
                model: hub.type,
                serialNumber: hub.serial_number,
                firmwareRevision: hub?.reported?.fw_version || 'unknown',
                hardwareRevision: hub?.reported?.hw_version,
            },
        ];
    }

    protected addLocationListeners(): void {
        super.addLocationListeners();

        this.scout.listener.on(LocationEventType.Hub, event => {
            this.onHubEvent(event);
        });

        this.scout.listener.on(LocationEventType.Mode, (event, locationId) => {
            this.onModeEvent(event, locationId);
        });
    }

    private onHubEvent(event: Hub): void {
        const accessory = this.accessories.get(event.id);

        this.homebridge.logger.debug(`Hub event: ${JSON.stringify(event)}`);

        if (accessory) {
            accessory.context.custom.hub = event;

            this.updateAccessory(accessory);
        }
    }

    private onModeEvent(event: ModeEvent, locationId: string): void {
        const hubId = this.locationHubs.get(locationId);

        this.homebridge.logger.debug(`Mode event: ${JSON.stringify(event)}`);

        if (hubId) {
            const accessory = this.accessories.get(hubId);

            if (accessory) {
                accessory.context.custom.modes
                    .filter(mode => mode.id === event.mode_id)
                    .forEach(mode => {
                        mode.state = event.event;
                    });

                this.updateAccessory(accessory);
            }
        }
    }

    private async identify(context: AccessoryContext<SecuritySystemContext>): Promise<void> {
        await this.scout.api.setChirp(context.custom.hub.id, {
            type: HubChirpType.Single,
        });
    }
}
