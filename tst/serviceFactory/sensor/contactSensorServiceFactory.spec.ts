import { CharacteristicValue, Characteristic, Service } from 'homebridge';
import { DeviceType, AccessSensorState, DoorPanelState, DeviceEventType, DeviceTriggerEvent } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SensorAccessoryContext } from '../../../src/accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { ContactSensorServiceFactory } from '../../../src/serviceFactory/sensor/contactSensorServiceFactory';
import { CharacteristicConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

describe(`${ContactSensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: ContactSensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    reported: {
                        trigger: {},
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new ContactSensorServiceFactory(homebridge, scout);
    });

    describe('.getService()', () => {
        test('door panel without state', () => {
            context.custom.device.type = DeviceType.DoorPanel;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('door panel with state', () => {
            context.custom.device.type = DeviceType.DoorPanel;
            context.custom.device.reported!.trigger!.state = DoorPanelState.Open;

            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.ContactSensor);
        });

        test('access sensor without state', () => {
            context.custom.device.type = DeviceType.AccessSensor;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test('access sensor with state', () => {
            context.custom.device.type = DeviceType.AccessSensor;
            context.custom.device.reported!.trigger!.state = AccessSensorState.Open;

            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.ContactSensor);
        });

        test('other device type with state', () => {
            context.custom.device.type = DeviceType.MotionSensor;

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

        test('door panel without state', () => {
            context.custom.device.type = DeviceType.DoorPanel;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toBeUndefined();
        });

        test('door panel open', () => {
            context.custom.device.type = DeviceType.DoorPanel;
            context.custom.device.reported!.trigger!.state = DoorPanelState.Open;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toEqual(
                homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
            );
        });

        test('door panel closed', () => {
            context.custom.device.type = DeviceType.DoorPanel;
            context.custom.device.reported!.trigger!.state = DoorPanelState.Close;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED,
            );
        });

        test('access sensor without state', () => {
            context.custom.device.type = DeviceType.AccessSensor;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toBeUndefined();
        });

        test('access sensor open', () => {
            context.custom.device.type = DeviceType.AccessSensor;
            context.custom.device.reported!.trigger!.state = AccessSensorState.Open;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toEqual(
                homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
            );
        });

        test('access sensor closed', () => {
            context.custom.device.type = DeviceType.AccessSensor;
            context.custom.device.reported!.trigger!.state = AccessSensorState.Close;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED,
            );
        });

        describe('with reverseSensorState', () => {
            beforeEach(() => {
                homebridge.config.reverseSensorState = true;
                context.custom.device.type = DeviceType.AccessSensor;
            });

            test('initial state close', () => {
                context.custom.device.reported!.trigger!.state = AccessSensorState.Close;

                serviceFactory.configureService(service, context);

                expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED,
                );
            });

            test('initial state open', () => {
                context.custom.device.reported!.trigger!.state = AccessSensorState.Open;

                serviceFactory.configureService(service, context);

                expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                );
            });

            test('event state close', () => {
                (context.custom.device as DeviceTriggerEvent).event = DeviceEventType.Triggered;
                context.custom.device.reported!.trigger!.state = AccessSensorState.Close;

                serviceFactory.configureService(service, context);

                expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                );
            });

            test('event state open', () => {
                (context.custom.device as DeviceTriggerEvent).event = DeviceEventType.Triggered;
                context.custom.device.reported!.trigger!.state = AccessSensorState.Open;

                serviceFactory.configureService(service, context);

                expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.ContactSensorState)).toStrictEqual(
                    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED,
                );
            });
        });
    });
});
