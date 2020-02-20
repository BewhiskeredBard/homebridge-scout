/* eslint-disable @typescript-eslint/unbound-method */

import { Hub, HubType, ConnectionState, Mode } from "scout-api";
import { TypedPlatformAccessory } from "../../src/accessoryFactory";
import { SecuritySystemAccessoryFactory, SecuritySystemContext } from "../../src/accessoryFactory/securitySystemAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../src/context";
import { Categories, Service } from "../../src/types";
import * as mocks from "../mocks";

describe(`${SecuritySystemAccessoryFactory.name}`, () => {
    const locationId = "locationId1";
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let accessoryFactory: SecuritySystemAccessoryFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();
        scout = mocks.mockScoutContext();
    });

    describe(".createAccessories()", () => {
        beforeEach(() => {
            accessoryFactory = new SecuritySystemAccessoryFactory(homebridge, scout, []);
        });

        test("without configuration", async () => {
            delete homebridge.config.modes;

            const accessories = await accessoryFactory.createAccessories(locationId);

            expect(accessories).toHaveLength(0);
        });

        test("with configuration", async () => {
            const name = "Security System";
            const uuid = "uuid1";
            const manufacturer = "Scout";

            const accessory = {
                getService: jest.fn() as unknown,
            } as TypedPlatformAccessory<SecuritySystemContext>;

            const accessoryInfoService = {
                setCharacteristic: jest.fn() as unknown,
            } as Service;

            const hub = {
                id: "hubId1",
                type: HubType.Scout1S,
                // eslint-disable-next-line @typescript-eslint/camelcase
                serial_number: "serial1",
                reported: {
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    fw_version: "firmware1",
                    // eslint-disable-next-line @typescript-eslint/camelcase
                    hw_version: "hardware1",
                },
            } as Hub;

            const modes = [
                {
                    id: "modeId1",
                } as Mode,
            ];

            (scout.api.getHub as jest.Mock).mockImplementation(() => {
                return {
                    data: hub,
                };
            });

            (scout.api.getModes as jest.Mock).mockImplementation(() => {
                return {
                    data: modes,
                };
            });

            (homebridge.api.hap.uuid.generate as jest.Mock).mockImplementation(() => uuid);
            (homebridge.api.platformAccessory as jest.Mock).mockImplementation(() => accessory);
            (accessory.getService as jest.Mock).mockImplementation(() => accessoryInfoService);
            (accessoryInfoService.setCharacteristic as jest.Mock).mockImplementation(() => accessoryInfoService);
            (scout.listener.getConnectionState as jest.Mock).mockImplementation(() => ConnectionState.Connected);

            const accessories = await accessoryFactory.createAccessories(locationId);

            expect(accessories).toHaveLength(1);
            expect(accessories[0]).toBe(accessory);

            expect(accessory.context.isConnected).toStrictEqual(true);
            expect(accessory.context.locationId).toEqual(locationId);
            expect(accessory.context.custom.hub).toBe(hub);
            expect(accessory.context.custom.modes).toBe(modes);

            expect(homebridge.api.hap.uuid.generate as jest.Mock).toBeCalledWith(hub.id);
            expect(homebridge.api.platformAccessory as jest.Mock).toBeCalledWith(name, uuid, Categories.SECURITY_SYSTEM);

            expect(accessory.getService as jest.Mock).toBeCalledWith(homebridge.api.hap.Service.AccessoryInformation);

            expect(accessoryInfoService.setCharacteristic as jest.Mock).toBeCalledWith(homebridge.api.hap.Characteristic.Manufacturer, manufacturer);
            expect(accessoryInfoService.setCharacteristic as jest.Mock).toBeCalledWith(homebridge.api.hap.Characteristic.Model, HubType.Scout1S);
            expect(accessoryInfoService.setCharacteristic as jest.Mock).toBeCalledWith(homebridge.api.hap.Characteristic.SerialNumber, hub.serial_number);
            expect(accessoryInfoService.setCharacteristic as jest.Mock).toBeCalledWith(
                homebridge.api.hap.Characteristic.FirmwareRevision,
                hub.reported!.fw_version,
            );
            expect(accessoryInfoService.setCharacteristic as jest.Mock).toBeCalledWith(
                homebridge.api.hap.Characteristic.HardwareRevision,
                hub.reported!.hw_version,
            );
        });
    });

    test.todo(".configureAccessory()");
});
