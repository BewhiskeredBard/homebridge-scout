import { Service, CharacteristicValue, Characteristic } from 'homebridge';
import { DeviceReport, DeviceType, SmokeState, CarbonMonoxideState } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SensorAccessoryContext } from '../../../src/accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { CarbonMonoxideSensorFactory } from '../../../src/serviceFactory/sensor/carbonMonoxideSensorFactory';
import { CharacteristicConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

describe(`${CarbonMonoxideSensorFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: CarbonMonoxideSensorFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.SmokeAlarm,
                    reported: {
                        trigger: {
                            state: {
                                smoke: SmokeState.Ok,
                                co: CarbonMonoxideState.Ok,
                            },
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new CarbonMonoxideSensorFactory(homebridge, scout);
    });

    describe('.getService()', () => {
        test('smoke alarm without state', () => {
            delete context.custom.device.reported?.trigger?.state;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('smoke alarm with state', () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.CarbonMonoxideSensor);
        });

        test('other device type with state', () => {
            context.custom.device.type = DeviceType.DoorPanel;

            expect(serviceFactory.getService(context)).toBeUndefined();
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

        test('without state', () => {
            delete context.custom.device.reported?.trigger?.state;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.LeakDetected)).toBeUndefined();
        });

        test('emergency', () => {
            context.custom.device.reported = {
                trigger: {
                    state: {
                        co: CarbonMonoxideState.Emergency,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CarbonMonoxideDetected)).toEqual(
                homebridge.api.hap.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL,
            );
        });

        test('ok', () => {
            context.custom.device.reported = {
                trigger: {
                    state: {
                        co: CarbonMonoxideState.Ok,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CarbonMonoxideDetected)).toEqual(
                homebridge.api.hap.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL,
            );
        });

        test('testing', () => {
            context.custom.device.reported = {
                trigger: {
                    state: {
                        co: CarbonMonoxideState.Testing,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CarbonMonoxideDetected)).toEqual(
                homebridge.api.hap.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL,
            );
        });
    });
});
