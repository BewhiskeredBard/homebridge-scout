import { Service, CharacteristicValue, Characteristic } from "homebridge";
import { DeviceType } from "scout-api";
import { AccessoryContext } from "../../../src/accessoryFactory";
import { SensorAccessoryContext } from "../../../src/accessoryFactory/sensorAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../../src/context";
import { HumiditySensorServiceFactory } from "../../../src/serviceFactory/sensor/humiditySensorServiceFactory";
import { CharacteristicConstructor } from "../../../src/types";
import * as mocks from "../../mocks";

describe(`${HumiditySensorServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SensorAccessoryContext>;
    let serviceFactory: HumiditySensorServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                device: {
                    type: DeviceType.DoorPanel,
                    reported: {
                        humidity: {
                            percent: 12.3,
                        },
                    },
                },
            },
        } as AccessoryContext<SensorAccessoryContext>;

        serviceFactory = new HumiditySensorServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("without humdity", () => {
            delete context.custom.device.reported!.humidity;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("with humidity", () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.HumiditySensor);
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

        test("without humidity", () => {
            delete context.custom.device.reported!.humidity;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentRelativeHumidity)).toBeUndefined();
        });

        test("with humidity", () => {
            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentRelativeHumidity)).toEqual(
                context.custom.device.reported?.humidity?.percent,
            );
        });
    });
});
