/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */

import { Service, Categories } from 'homebridge';
import { Hub, HubType, ConnectionState, Mode, HubChirpType } from 'scout-api';
import { TypedPlatformAccessory } from '../../src/accessoryFactory';
import { SecuritySystemAccessoryFactory, SecuritySystemContext } from '../../src/accessoryFactory/securitySystemAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../src/context';
import * as mocks from '../mocks';

describe(`${SecuritySystemAccessoryFactory.name}`, () => {
    const locationId = 'locationId1';
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let hub: Hub;
    let accessoryFactory: SecuritySystemAccessoryFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();
        scout = mocks.mockScoutContext();
        hub = {
            id: 'hubId1',
            type: HubType.Scout1S,
            serial_number: 'serial1',
            reported: {
                fw_version: 'firmware1',
                hw_version: 'hardware1',
            },
        } as Hub;

        accessoryFactory = new SecuritySystemAccessoryFactory(homebridge, scout, []);
    });

    describe('.createAccessories()', () => {
        test('without configuration', async () => {
            delete homebridge.config.modes;

            const accessories = await accessoryFactory.createAccessories(locationId);

            expect(accessories).toHaveLength(0);
        });

        test('with configuration', async () => {
            const name = 'Security System';
            const uuid = 'uuid1';
            const manufacturer = 'Scout';

            const accessory = {
                getService: jest.fn() as unknown,
            } as TypedPlatformAccessory<SecuritySystemContext>;

            const accessoryInfoService = {
                setCharacteristic: jest.fn() as unknown,
            } as Service;

            const modes = [
                {
                    id: 'modeId1',
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
            (homebridge.api.platformAccessory as unknown as jest.Mock).mockImplementation(() => accessory);
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
            expect(homebridge.api.platformAccessory as unknown as jest.Mock).toBeCalledWith(name, uuid, Categories.SECURITY_SYSTEM);

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

    describe('.configureAccessory()', () => {
        let accessory: TypedPlatformAccessory<SecuritySystemContext>;

        beforeEach(() => {
            accessory = {
                context: {
                    custom: {
                        hub,
                    },
                    locationId,
                },
                on: jest.fn() as unknown,
                services: new Array<Service>(),
                getService: jest.fn() as unknown,
            } as TypedPlatformAccessory<SecuritySystemContext>;
        });

        describe('identify event', () => {
            test('success', async () => {
                (scout.api.setChirp as jest.Mock).mockImplementation(() => {
                    return accessory.context.custom.hub;
                });

                accessoryFactory.configureAccessory(accessory);

                // invoke the "identify" event listener
                (accessory.on as jest.Mock).mock.calls[0][1]();

                await new Promise(resolve => setTimeout(resolve, 1));

                expect(scout.api.setChirp).toBeCalledWith(accessory.context.custom.hub.id, {
                    type: HubChirpType.Single,
                });
            });

            test('failure', async () => {
                const error = new Error();

                (scout.api.setChirp as jest.Mock).mockImplementation(() => {
                    throw error;
                });

                accessoryFactory.configureAccessory(accessory);

                // invoke the "identify" event listener
                (accessory.on as jest.Mock).mock.calls[0][1]();

                await new Promise(resolve => setTimeout(resolve, 1));

                expect(scout.api.setChirp).toBeCalledWith(accessory.context.custom.hub.id, {
                    type: HubChirpType.Single,
                });

                expect(homebridge.logger.error).toBeCalledWith(error);
            });
        });
    });
});
