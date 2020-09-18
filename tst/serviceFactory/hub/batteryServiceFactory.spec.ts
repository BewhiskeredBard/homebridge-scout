import { Service, CharacteristicValue, Characteristic } from 'homebridge';
import { HubReport, HubType } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SecuritySystemContext } from '../../../src/accessoryFactory/securitySystemAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { BatteryServiceFactory } from '../../../src/serviceFactory/hub/batteryServiceFactory';
import { CharacteristicConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

describe(`${BatteryServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SecuritySystemContext>;
    let serviceFactory: BatteryServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                hub: {
                    reported: {
                        battery: {
                            active: true,
                            level: 0,
                        },
                    },
                    type: HubType.Scout1S,
                },
            },
        } as AccessoryContext<SecuritySystemContext>;

        serviceFactory = new BatteryServiceFactory(homebridge, scout);
    });

    describe('.getService()', () => {
        test('without battery', () => {
            delete context.custom.hub.reported;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('with battery', () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.BatteryService);
        });
    });

    describe('.configureService()', () => {
        let service: Service;
        const updatedCharacteristics = new Map<CharacteristicConstructor<unknown>, CharacteristicValue>();

        beforeEach(() => {
            service = {
                getCharacteristic: jest.fn() as unknown,
            } as Service;

            updatedCharacteristics.clear();

            (service.getCharacteristic as jest.Mock<Characteristic>).mockImplementation((type: CharacteristicConstructor<unknown>) => {
                return {
                    updateValue: jest.fn().mockImplementation((value: CharacteristicValue) => {
                        updatedCharacteristics.set(type, value);
                    }) as unknown,
                } as Characteristic;
            });
        });

        test('without battery', () => {
            delete context.custom.hub.reported;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.BatteryLevel)).toBeUndefined();
        });

        test('battery charging', () => {
            context.custom.hub.reported = {
                battery: {
                    active: false,
                },
            } as HubReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ChargingState)).toEqual(
                homebridge.api.hap.Characteristic.ChargingState.CHARGING,
            );
        });

        test('battery not charging', () => {
            context.custom.hub.reported = {
                battery: {
                    active: true,
                },
            } as HubReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ChargingState)).toEqual(
                homebridge.api.hap.Characteristic.ChargingState.NOT_CHARGING,
            );
        });

        test(`${HubType.Scout1S} battery level`, () => {
            const batteryLevel = 1.23;
            context.custom.hub.type = HubType.Scout1S;
            context.custom.hub.reported = {
                battery: {
                    active: true,
                    level: batteryLevel,
                },
            } as HubReport;

            serviceFactory.configureService(service, context);

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.BatteryLevel)).toEqual(Math.round((batteryLevel / 5.0) * 100));
        });

        test(`${HubType.Scout1} battery level`, () => {
            const batteryLevel = 123;
            context.custom.hub.type = HubType.Scout1;
            context.custom.hub.reported = {
                battery: {
                    active: true,
                    level: batteryLevel,
                },
            } as HubReport;

            serviceFactory.configureService(service, context);

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.BatteryLevel)).toEqual(Math.round((batteryLevel / 255) * 100));
        });
    });
});
