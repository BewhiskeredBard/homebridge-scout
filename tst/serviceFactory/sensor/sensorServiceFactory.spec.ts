import { Service, CharacteristicValue, Characteristic } from 'homebridge';
import { DeviceReport, DeviceType } from 'scout-api';
import { AccessoryContext } from '../../../src/accessoryFactory';
import { SensorAccessoryContext } from '../../../src/accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContext, ScoutContext } from '../../../src/context';
import { SensorServiceFactory } from '../../../src/serviceFactory/sensor/sensorServiceFactory';
import { CharacteristicConstructor, ServiceConstructor } from '../../../src/types';
import * as mocks from '../../mocks';

class MockSensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor {
        return this.homebridge.api.hap.Service.ServiceLabel;
    }
}

describe(`${SensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: MockSensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.AccessSensor,
                    reported: {
                        battery: {},
                        trigger: {},
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new MockSensorServiceFactory(homebridge, scout);
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

        test.each`
            tamper       | isTampered
            ${undefined} | ${undefined}
            ${false}     | ${false}
            ${true}      | ${true}
        `('tamper status with tamper = $tamper', ({ tamper, isTampered }) => {
            const StatusTampered = homebridge.api.hap.Characteristic.StatusTampered;
            context.custom.device.reported = {
                trigger: {
                    tamper: tamper as boolean | undefined,
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(StatusTampered)).toBe(
                undefined === isTampered ? undefined : isTampered ? StatusTampered.TAMPERED : StatusTampered.NOT_TAMPERED,
            );
        });

        test.each`
            timedout | lowBattery    | isBatteryLow
            ${false} | ${undefined}  | ${false}
            ${false} | ${new Date()} | ${true}
            ${true}  | ${undefined}  | ${true}
            ${true}  | ${new Date()} | ${true}
        `('low battery status with timedout = $timedout and low battery = $lowBattery', ({ timedout, lowBattery, isBatteryLow }) => {
            const StatusLowBattery = homebridge.api.hap.Characteristic.StatusLowBattery;
            context.custom.device.reported = {
                timedout: timedout as boolean,
                battery: {
                    low: lowBattery as string | null,
                },
            } as DeviceReport;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(StatusLowBattery)).toBe(isBatteryLow ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_LOW);
        });
    });
});
