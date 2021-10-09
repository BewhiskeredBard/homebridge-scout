/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

import { API, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';
import { AuthenticatedMember, Location } from 'scout-api';
import { AccessoryFactory } from '../src/accessoryFactory';
import { HomebridgeContext, ScoutContextFactory, ScoutContext, HomebridgeContextFactory } from '../src/context';
import { Orchestrator } from '../src/orchestrator';
import { ScoutPlatformPlugin } from '../src/scoutPlatformPlugin';
import * as mocks from './mocks';

describe(`${Orchestrator.name}`, () => {
    let api: API;
    let logger: Logging;
    let config: PlatformConfig;
    let homebridge: HomebridgeContext;
    let homebridgeContextFactory: HomebridgeContextFactory;
    let scout: ScoutContext;
    let scoutContextFactory: ScoutContextFactory;
    let authMember: AuthenticatedMember;
    let location1: Location;
    let location2: Location;
    let orchestrator: Orchestrator;
    let accessoryFactories: (homebridgeContext: HomebridgeContext, scoutContext: ScoutContext) => AccessoryFactory<unknown>[];
    let accessoryFactory: AccessoryFactory<unknown>;
    let accessory: PlatformAccessory;
    let cachedAccessory: PlatformAccessory;

    const listen = async (): Promise<void> => {
        const listener = (homebridge.api.on as jest.Mock).mock.calls[0][1] as () => void;

        listener();

        await new Promise(resolve => setTimeout(resolve, 1));
    };

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();
        api = homebridge.api;
        logger = homebridge.logger;
        config = homebridge.config;
        scout = mocks.mockScoutContext();

        homebridgeContextFactory = {
            create: jest.fn(),
        } as unknown as HomebridgeContextFactory;

        (homebridgeContextFactory.create as jest.Mock).mockImplementation(() => {
            return homebridge;
        });

        scoutContextFactory = {
            create: jest.fn(),
        };

        (scoutContextFactory.create as jest.Mock).mockImplementation(() => {
            return scout;
        });

        authMember = {
            id: 'memberId1',
            email: 'email@domain.tld',
            fname: 'name1',
        };

        (scout.api.getMember as jest.Mock).mockImplementation(() => {
            return {
                data: authMember,
            };
        });

        location1 = {
            id: 'locationId1',
            name: 'Location 1',
        } as Location;

        location2 = {
            id: 'locationId2',
            name: 'Location 2',
        } as Location;

        accessoryFactories = jest.fn();
        accessoryFactory = {
            createAccessories: jest.fn() as unknown,
            configureAccessory: jest.fn() as unknown,
        } as AccessoryFactory<unknown>;

        accessory = {
            UUID: 'uuid1',
            context: {
                foo: 'bar',
            },
        } as unknown as PlatformAccessory;

        cachedAccessory = {
            UUID: 'uuid1',
            context: {
                boo: 'baz',
            },
        } as unknown as PlatformAccessory;

        orchestrator = new Orchestrator(api, logger, config, homebridgeContextFactory, scoutContextFactory, accessoryFactories);
    });

    afterEach(() => {
        expect(scoutContextFactory.create).toBeCalledWith(homebridge);
    });

    test('no Scout locations', async () => {
        delete homebridge.config.location;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [],
            };
        });

        await listen();

        expect(homebridge.logger.error).toBeCalledWith(new Error(`No locations found.`));
    });

    test('no matching Scout locations', async () => {
        homebridge.config.location = 'foo';

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        await listen();

        expect(homebridge.logger.error).toBeCalledWith(new Error(`No location found for "${homebridge.config.location}".`));
    });

    test('multiple Scout locations without config', async () => {
        delete homebridge.config.location;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1, location2],
            };
        });

        await listen();

        expect(homebridge.logger.error).toBeCalledWith(new Error(`You must configure one of the following locations: ${location1.name}, ${location2.name}.`));
    });

    test('using admin account', async () => {
        homebridge.config.location = location1.name;
        location1.admin_ids = [authMember.id];

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [];
        });

        await listen();

        expect(scout.listener.connect).toBeCalled();
        expect(scout.listener.addLocation).toBeCalledWith(location1.id);
        expect(homebridge.logger.warn).toBeCalledWith('The authenticated member [memberId1] is an admin. It is highly recommended to use a non-admin member.');
        expect(homebridge.logger.error).not.toBeCalled();
    });

    test('register new accessory', async () => {
        homebridge.config.location = location1.name;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [accessoryFactory];
        });

        (accessoryFactory.createAccessories as jest.Mock).mockImplementation(() => {
            return [accessory];
        });

        await listen();

        expect(scout.listener.connect).toBeCalled();
        expect(scout.listener.addLocation).toBeCalledWith(location1.id);
        expect(accessoryFactory.configureAccessory).toBeCalledWith(accessory);
        expect(homebridge.api.registerPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [accessory]);
        expect(homebridge.api.unregisterPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.logger.error).not.toBeCalled();
    });

    test('single uncofigured location', async () => {
        delete homebridge.config.location;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [];
        });

        await listen();

        expect(scout.listener.connect).toBeCalled();
        expect(scout.listener.addLocation).toBeCalledWith(location1.id);
        expect(homebridge.logger.error).not.toBeCalled();
    });

    test('configured accessory not found', async () => {
        homebridge.config.location = location1.name;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [accessoryFactory];
        });

        (accessoryFactory.createAccessories as jest.Mock).mockImplementation(() => {
            return [];
        });

        orchestrator.configureAccessory(cachedAccessory);

        await listen();

        expect(scout.listener.connect).toBeCalled();
        expect(scout.listener.addLocation).toBeCalledWith(location1.id);
        expect(accessoryFactory.configureAccessory).not.toBeCalled();
        expect(homebridge.api.registerPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [
            cachedAccessory,
        ]);
        expect(homebridge.logger.error).not.toBeCalled();
    });

    test('configured accessory found', async () => {
        homebridge.config.location = location1.name;

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location1],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [accessoryFactory];
        });

        (accessoryFactory.createAccessories as jest.Mock).mockImplementation(() => {
            return [accessory];
        });

        orchestrator.configureAccessory(cachedAccessory);

        await listen();

        expect(scout.listener.connect).toBeCalled();
        expect(scout.listener.addLocation).toBeCalledWith(location1.id);
        expect(cachedAccessory.context).toStrictEqual(accessory.context);
        expect(accessoryFactory.configureAccessory).toBeCalledWith(cachedAccessory);
        expect(homebridge.api.registerPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.logger.error).not.toBeCalled();
    });
});
