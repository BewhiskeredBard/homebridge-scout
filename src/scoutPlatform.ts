import { Platform, PlatformAccessory } from "./types";
import { AccessoryFactory, TypedPlatformAccessory } from "./accessoryFactory";
import { Location } from "scout-api";
import { HomebridgeContext, ScoutContextFactory, ScoutContext } from "./context";

export class ScoutPlatform implements Platform {
    public static PLUGIN_NAME = "homebridge-scout";
    public static PLATFORM_NAME = "ScoutAlarm";

    private readonly cachedAccessories = new Map<string, PlatformAccessory>();

    public constructor(
            private readonly homebridge: HomebridgeContext,
            private readonly scoutContextFactory: ScoutContextFactory,
            private readonly accessoryFactories: (scout: ScoutContext) => AccessoryFactory<unknown>[]) {
        homebridge.api.on("didFinishLaunching", () => {
            this.init().catch(e => homebridge.logger.error(e));
        });
    }

    public configureAccessory(accessory: PlatformAccessory): void {
        this.homebridge.logger.info(`Discovered cached accessory [${accessory.UUID}]`);

        this.cachedAccessories.set(accessory.UUID, accessory);
    }

    private async init(): Promise<void> {
        const scout = await this.scoutContextFactory.create(this.homebridge);
        const location = await this.getLocation(scout);

        this.registerAccessories(scout, location.id);
    }

    private async getLocation(scout: ScoutContext): Promise<Location> {
        const memberId = scout.memberId;
        const locations = (await scout.api.getLocations(memberId)).data;

        this.homebridge.logger.debug(`Locations: ${JSON.stringify(locations)}`);

        const adminIds = Array.prototype.concat.apply([], locations.map(location => location.admin_ids));

        if (adminIds.find(adminId => adminId == memberId)) {
            this.homebridge.logger.warn(`The authenticated member [${memberId}] is an admin. It is highly recommended to use a non-admin member.`);
        }

        const location = locations.find(location => location.name == this.homebridge.config.location);

        if (!location) {
            throw new Error(`No location found for "${this.homebridge.config.location}".`);
        }

        this.homebridge.logger.info(`Using "${this.homebridge.config.location}" location [${location.id}].`);

        return location;
    }

    private async registerAccessories(scout: ScoutContext, locationId: string): Promise<void> {
        const newAccessories = new Array<PlatformAccessory>();

        for (const accessoryFactory of this.accessoryFactories(scout)) {
            const accessories = await accessoryFactory.createAccessories(locationId);

            for (let accessory of accessories) {
                const cachedAccessory = this.cachedAccessories.get(accessory.UUID);

                if (cachedAccessory) {
                    cachedAccessory.context = accessory.context;
                    accessory = cachedAccessory as TypedPlatformAccessory<unknown>;

                    this.homebridge.logger.info(`Using cached accessory [${accessory.UUID}].`);

                    this.cachedAccessories.delete(accessory.UUID);
                } else {
                    this.homebridge.logger.info(`Creating new accessory [${accessory.UUID}].`);
                }

                accessoryFactory.configureAccessory(accessory);
            }
        }

        this.homebridge.logger.info(`Registering new accessories [${[...this.cachedAccessories.values()].join(", ")}].`);

        this.homebridge.api.registerPlatformAccessories(
                ScoutPlatform.PLUGIN_NAME,
                ScoutPlatform.PLATFORM_NAME,
                newAccessories);

        this.homebridge.logger.info(`Removing old cached accessories [${[...this.cachedAccessories.values()].join(", ")}].`);

        this.homebridge.api.unregisterPlatformAccessories(
            ScoutPlatform.PLUGIN_NAME,
            ScoutPlatform.PLATFORM_NAME,
            [...this.cachedAccessories.values()]);

        this.cachedAccessories.clear();
    }
}
