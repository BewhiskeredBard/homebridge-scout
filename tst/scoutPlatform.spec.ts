/* eslint-disable @typescript-eslint/unbound-method */

import { Location } from "scout-api";
import { AccessoryFactory } from "../src/accessoryFactory";
import { HomebridgeContext, ScoutContextFactory, ScoutContext } from "../src/context";
import { ScoutPlatform } from "../src/scoutPlatform";
import { PlatformAccessory } from "../src/types";
import * as mocks from "./mocks";

describe(`${ScoutPlatform.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let scoutContextFactory: ScoutContextFactory;
    let location: Location;
    let scoutPlatform: ScoutPlatform;
    let accessoryFactories: (scoutContext: ScoutContext) => AccessoryFactory<unknown>[];
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
        scout = mocks.mockScoutContext();

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

        accessory = {
            UUID: "uuid1",
            context: {
                foo: "bar",
            },
        } as PlatformAccessory;

        cachedAccessory = {
            UUID: "uuid1",
            context: {
                boo: "baz",
            },
        } as PlatformAccessory;

        scoutPlatform = new ScoutPlatform(homebridge, scoutContextFactory, accessoryFactories);
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
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, [accessory]);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, []);
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

        scoutPlatform.configureAccessory(cachedAccessory);

        await listen();

        expect(accessoryFactory.configureAccessory as jest.Mock).not.toBeCalled();
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, [
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

        scoutPlatform.configureAccessory(cachedAccessory);

        await listen();

        expect(cachedAccessory.context).toStrictEqual(accessory.context);
        expect(accessoryFactory.configureAccessory as jest.Mock).toBeCalledWith(cachedAccessory);
        expect(homebridge.api.registerPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, []);
        expect(homebridge.api.unregisterPlatformAccessories as jest.Mock).toBeCalledWith(ScoutPlatform.PLUGIN_NAME, ScoutPlatform.PLATFORM_NAME, []);
        expect(homebridge.logger.error as jest.Mock).not.toBeCalled();
    });
});
