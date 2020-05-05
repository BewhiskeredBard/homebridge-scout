/* eslint-disable @typescript-eslint/unbound-method */

import { API, Logging, PlatformAccessory, PlatformConfig } from "homebridge";
import { Location } from "scout-api";
import { AccessoryFactory } from "../src/accessoryFactory";
import { HomebridgeContext, ScoutContextFactory, ScoutContext, HomebridgeContextFactory } from "../src/context";
import { Orchestrator } from "../src/orchestrator";
import { ScoutPlatformPlugin } from "../src/scoutPlatformPlugin";
import * as mocks from "./mocks";

describe(`${Orchestrator.name}`, () => {
    let api: API;
    let logger: Logging;
    let config: PlatformConfig;
    let homebridge: HomebridgeContext;
    let homebridgeContextFactory: HomebridgeContextFactory;
    let scout: ScoutContext;
    let scoutContextFactory: ScoutContextFactory;
    let location: Location;
    let orchestrator: Orchestrator;
    let accessoryFactories: (homebridgeContext: HomebridgeContext, scoutContext: ScoutContext) => AccessoryFactory<unknown>[];
    let accessoryFactory: AccessoryFactory<unknown>;
    let accessory: PlatformAccessory;
    let cachedAccessory: PlatformAccessory;

    const listen = async (): Promise<void> => {
        const listener = (homebridge.api.on as jest.Mock).mock.calls[0][1];

        listener();

        await new Promise(resolve => setTimeout(resolve, 1));
    };

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();
        api = homebridge.api;
        logger = homebridge.logger;
        config = homebridge.config;
        scout = mocks.mockScoutContext();

        homebridgeContextFactory = ({
            create: jest.fn(),
        } as unknown) as HomebridgeContextFactory;

        (homebridgeContextFactory.create as jest.Mock).mockImplementation(() => {
            return homebridge;
        });

        scoutContextFactory = {
            create: jest.fn(),
        };

        (scoutContextFactory.create as jest.Mock).mockImplementation(() => {
            return scout;
        });

        location = {
            id: "locationId1",
            name: homebridge.config.location,
        } as Location;

        accessoryFactories = jest.fn();
        accessoryFactory = {
            createAccessories: jest.fn() as unknown,
            configureAccessory: jest.fn() as unknown,
        } as AccessoryFactory<unknown>;

        accessory = ({
            UUID: "uuid1",
            context: {
                foo: "bar",
            },
        } as unknown) as PlatformAccessory;

        cachedAccessory = ({
            UUID: "uuid1",
            context: {
                boo: "baz",
            },
        } as unknown) as PlatformAccessory;

        orchestrator = new Orchestrator(api, logger, config, homebridgeContextFactory, scoutContextFactory, accessoryFactories);
    });

    afterEach(() => {
        expect(scoutContextFactory.create as jest.Mock).toBeCalledWith(homebridge);
    });

    test("no Scout locations", async () => {
        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [],
            };
        });

        await listen();

        expect(homebridge.logger.error as jest.Mock).toBeCalledWith(new Error(`No location found for "${homebridge.config.location}".`));
    });

    test("no matching Scout locations", async () => {
        location.name = "foo";

        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location],
            };
        });

        await listen();

        expect(homebridge.logger.error as jest.Mock).toBeCalledWith(new Error(`No location found for "${homebridge.config.location}".`));
    });

    test("register new accessory", async () => {
        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location],
            };
        });

        (accessoryFactories as jest.Mock).mockImplementation(() => {
            return [accessoryFactory];
        });

        (accessoryFactory.createAccessories as jest.Mock).mockImplementation(() => {
            return [accessory];
        });

        await listen();

        expect(accessoryFactory.configureAccessory as jest.Mock).toBeCalledWith(accessory);
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [
            accessory,
        ]);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(
            ScoutPlatformPlugin.PLUGIN_NAME,
            ScoutPlatformPlugin.PLATFORM_NAME,
            [],
        );
        expect(homebridge.logger.error as jest.Mock).not.toBeCalled();
    });

    test("configured accessory not found", async () => {
        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location],
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

        expect(accessoryFactory.configureAccessory as jest.Mock).not.toBeCalled();
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [
            cachedAccessory,
        ]);
        expect(homebridge.logger.error as jest.Mock).not.toBeCalled();
    });

    test("configured accessory found", async () => {
        (scout.api.getLocations as jest.Mock).mockImplementation(() => {
            return {
                data: [location],
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

        expect(cachedAccessory.context).toStrictEqual(accessory.context);
        expect(accessoryFactory.configureAccessory as jest.Mock).toBeCalledWith(cachedAccessory);
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(
            ScoutPlatformPlugin.PLUGIN_NAME,
            ScoutPlatformPlugin.PLATFORM_NAME,
            [],
        );
        expect(homebridge.logger.error as jest.Mock).not.toBeCalled();
    });
});
