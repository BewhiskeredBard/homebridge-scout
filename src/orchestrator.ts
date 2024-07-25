import type { PlatformAccessory, API, Logging, PlatformConfig } from 'homebridge';
import { Location } from 'scout-api';
import { AccessoryFactory, TypedPlatformAccessory } from './accessoryFactory';
import { HomebridgeContext, ScoutContextFactory, ScoutContext, HomebridgeContextFactory } from './context';
import { ScoutPlatformPlugin } from './scoutPlatformPlugin';

export class Orchestrator {
    private readonly cachedAccessories = new Map<string, PlatformAccessory>();

    public constructor(
        private readonly api: API,
        private readonly logger: Logging,
        private readonly config: PlatformConfig,
        private readonly homebridgeContextFactory: HomebridgeContextFactory,
        private readonly scoutContextFactory: ScoutContextFactory,
        private readonly accessoryFactories: (homebridge: HomebridgeContext, scout: ScoutContext) => AccessoryFactory<unknown>[],
    ) {
        api.on('didFinishLaunching', () => {
            this.init().catch(e => logger.error(e instanceof Error ? e.message : String(e)));
        });
    }

    public configureAccessory(accessory: PlatformAccessory): void {
        this.logger.info(`Discovered cached accessory [${accessory.UUID}]`);

        this.cachedAccessories.set(accessory.UUID, accessory);
    }

    public async init(): Promise<void> {
        const homebridge = this.homebridgeContextFactory.create(this.api, this.logger, this.config);
        const scout = this.scoutContextFactory.create(homebridge);
        const location = await this.getLocation(homebridge, scout);

        await scout.listener.connect();
        scout.listener.addLocation(location.id);

        await this.registerAccessories(homebridge, scout, location.id);
    }

    private async getLocation(homebridge: HomebridgeContext, scout: ScoutContext): Promise<Location> {
        const memberId = (await scout.api.getMember()).data.id;
        const locations = (await scout.api.getLocations(memberId)).data;

        this.logger.debug(`Locations: ${JSON.stringify(locations)}`);

        const adminIds = Array.prototype.concat.apply(
            [],
            locations.map(location => location.admin_ids),
        );

        if (adminIds.find(adminId => adminId === memberId)) {
            this.logger.warn(`The authenticated member [${memberId}] is an admin. It is highly recommended to use a non-admin member.`);
        }

        const location = this.chooseLocation(homebridge, locations);

        this.logger.info(`Using "${location.name}" location [${location.id}].`);

        return location;
    }

    private chooseLocation(homebridge: HomebridgeContext, locations: Location[]): Location {
        const defaultLocation = locations[0];

        if (!defaultLocation) {
            throw new Error('No locations found.');
        }

        if (homebridge.config.location) {
            const matchingLocation = locations.find(location => location.name === homebridge.config.location);

            if (!matchingLocation) {
                throw new Error(`No location found for "${homebridge.config.location}".`);
            }

            return matchingLocation;
        } else if (1 < locations.length) {
            throw new Error(`You must configure one of the following locations: ${locations.map(location => location.name).join(', ')}.`);
        } else {
            return defaultLocation;
        }
    }

    private async registerAccessories(homebridge: HomebridgeContext, scout: ScoutContext, locationId: string): Promise<void> {
        const newAccessories = new Array<PlatformAccessory>();

        for (const accessoryFactory of this.accessoryFactories(homebridge, scout)) {
            const accessories = await accessoryFactory.createAccessories(locationId);

            for (let accessory of accessories) {
                const cachedAccessory = this.cachedAccessories.get(accessory.UUID);

                if (cachedAccessory) {
                    cachedAccessory.context = accessory.context;
                    accessory = cachedAccessory as TypedPlatformAccessory<unknown>;

                    this.logger.info(`Using cached accessory [${accessory.UUID}].`);

                    this.cachedAccessories.delete(accessory.UUID);
                } else {
                    this.logger.info(`Creating new accessory [${accessory.UUID}].`);

                    newAccessories.push(accessory);
                }

                accessoryFactory.configureAccessory(accessory);
            }
        }

        this.logger.info(`Registering new accessories [${[...newAccessories.map(accessory => accessory.UUID)].join(', ')}].`);

        this.api.registerPlatformAccessories(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, newAccessories);

        this.logger.info(`Removing old cached accessories [${[...this.cachedAccessories.keys()].join(', ')}].`);

        this.api.unregisterPlatformAccessories(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [...this.cachedAccessories.values()]);

        this.cachedAccessories.clear();
    }
}
