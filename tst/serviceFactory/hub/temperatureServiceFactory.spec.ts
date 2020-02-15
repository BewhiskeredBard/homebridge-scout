import { AccessoryContext } from "../../../src/accessoryFactory";
import { SecuritySystemContext } from "../../../src/accessoryFactory/securitySystemAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../../src/context";
import { TemperatureServiceFactory } from "../../../src/serviceFactory/hub/temperatureServiceFactory";
import { Service, CharacteristicConstructor, Characteristic, CharacteristicValue } from "../../../src/types";
import * as mocks from "../../mocks";

describe(`${TemperatureServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SecuritySystemContext>;
    let serviceFactory: TemperatureServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                hub: {
                    reported: {
                        temperature: 12.3,
                    },
                },
            },
        } as AccessoryContext<SecuritySystemContext>;

        serviceFactory = new TemperatureServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("without temperature", () => {
            delete context.custom.hub.reported!.temperature;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("with temperature", () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.TemperatureSensor);
        });
    });

    describe(".configureService()", () => {
        let service: Service;
        let updatedCharacteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>;

        beforeEach(() => {
            service = {
                getCharacteristic: jest.fn() as unknown,
            } as Service;

            updatedCharacteristics = new Map();

            (service.getCharacteristic as jest.Mock<Characteristic>).mockImplementation((type: CharacteristicConstructor<unknown>) => {
                return {
                    updateValue: jest.fn().mockImplementation((value: CharacteristicValue) => {
                        updatedCharacteristics.set(type, value);
                    }) as unknown,
                } as Characteristic;
            });
        });

        test("without temperature", () => {
            delete context.custom.hub.reported!.temperature;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentTemperature)).toBeUndefined();
        });

        test("with temperature", () => {
            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.CurrentTemperature)).toEqual(context.custom.hub.reported?.temperature);
        });
    });
});
