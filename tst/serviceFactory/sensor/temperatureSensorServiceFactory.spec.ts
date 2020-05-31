import { Service, CharacteristicValue, Characteristic } from "homebridge";
import { DeviceType } from "scout-api";
import { AccessoryContext } from "../../../src/accessoryFactory";
import { SensorAccessoryContext } from "../../../src/accessoryFactory/sensorAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../../src/context";
import { TemperatureSensorServiceFactory } from "../../../src/serviceFactory/sensor/temperatureSensorServiceFactory";
import { CharacteristicConstructor } from "../../../src/types";
import * as mocks from "../../mocks";

describe(`${TemperatureSensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: TemperatureSensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.DoorPanel,
                    reported: {
                        temperature: {
                            degrees: 12.3,
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new TemperatureSensorServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("without temperature", () => {
            delete context.custom.device.reported!.temperature;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("with temperature", () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.TemperatureSensor);
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

        test("smoke alarm", () => {
            context.custom.device.type = DeviceType.SmokeAlarm;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentTemperature)).toBeUndefined();
        });

        test("other device type", () => {
            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentTemperature)).toEqual(
                context.custom.device.reported?.temperature?.degrees,
            );
        });
    });
});
