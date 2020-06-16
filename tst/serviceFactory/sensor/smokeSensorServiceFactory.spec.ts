import { Service, CharacteristicValue, Characteristic } from 'homebridge';
import { DeviceReport, DeviceType, SmokeState, CoState } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SensorAccessoryContext } from '../../../src/accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { SmokeSensorServiceFactory } from '../../../src/serviceFactory/sensor/smokeSensorServiceFactory';
import { CharacteristicConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

describe(`${SmokeSensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: SmokeSensorServiceFactory;

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
                                co: CoState.Ok,
                            },
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new SmokeSensorServiceFactory(homebridge, scout);
    });

    describe('.getService()', () => {
        test('smoke alarm without state', () => {
            delete context.custom.device.reported?.trigger?.state;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('smoke alarm with state', () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.SmokeSensor);
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
                        smoke: SmokeState.Emergency,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SmokeDetected)).toEqual(
                homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED,
            );
        });

        test('ok', () => {
            context.custom.device.reported = {
                trigger: {
                    state: {
                        smoke: SmokeState.Ok,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SmokeDetected)).toEqual(
                homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
            );
        });

        test('testing', () => {
            context.custom.device.reported = {
                trigger: {
                    state: {
                        smoke: SmokeState.Testing,
                    },
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SmokeDetected)).toEqual(
                homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED,
            );
        });
    });
});
