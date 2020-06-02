import { Service, CharacteristicValue, Characteristic } from "homebridge";
import { DeviceType, WaterSensorState } from "scout-api";
import { AccessoryContext } from "../../../src/accessoryFactory";
import { SensorAccessoryContext } from "../../../src/accessoryFactory/sensorAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../../src/context";
import { LeakSensorServiceFactory } from "../../../src/serviceFactory/sensor/leakSensorServiceFactory";
import { CharacteristicConstructor } from "../../../src/types";
import * as mocks from "../../mocks";

describe(`${LeakSensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: LeakSensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.WaterSensor,
                    reported: {
                        trigger: {
                            state: WaterSensorState.Dry,
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new LeakSensorServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("water sensor without state", () => {
            delete context.custom.device.reported!.trigger!.state;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("water sensor with state", () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.LeakSensor);
        });

        test("other device type with state", () => {
            context.custom.device.type = DeviceType.DoorPanel;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });
    });

    describe(".configureService()", () => {
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

        test("without state", () => {
            delete context.custom.device.reported!.trigger!.state;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.LeakDetected)).toBeUndefined();
        });

        test("leak detected", () => {
            context.custom.device.reported!.trigger!.state = WaterSensorState.Wet;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.LeakDetected)).toEqual(
                homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED,
            );
        });

        test("leak not detected", () => {
            context.custom.device.reported!.trigger!.state = WaterSensorState.Dry;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.LeakDetected)).toEqual(
                homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED,
            );
        });
    });
});
