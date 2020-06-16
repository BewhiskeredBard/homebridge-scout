import { CharacteristicValue, Service, Characteristic } from 'homebridge';
import { DeviceType, DeviceReport, MotionSensorState } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SensorAccessoryContext } from '../../../src/accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { MotionSensorServiceFactory } from '../../../src/serviceFactory/sensor/motionSensorServiceFactory';
import { CharacteristicConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

describe(`${MotionSensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: MotionSensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.MotionSensor,
                    reported: {
                        trigger: {
                            state: MotionSensorState.Start,
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new MotionSensorServiceFactory(homebridge, scout);
    });

    describe('.getService()', () => {
        test('motion sensor without state', () => {
            delete context.custom.device.reported?.trigger?.state;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('motion sensor with state', () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.MotionSensor);
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

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.MotionDetected)).toBeUndefined();
        });

        test('motion detected', () => {
            context.custom.device.reported = {
                trigger: {
                    state: MotionSensorState.Start,
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.MotionDetected)).toStrictEqual(true);
        });

        test('motion not detected', () => {
            context.custom.device.reported = {
                trigger: {
                    state: MotionSensorState.Stop,
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.MotionDetected)).toStrictEqual(false);
        });
    });
});
