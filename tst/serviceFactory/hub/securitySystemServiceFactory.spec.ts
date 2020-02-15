import { Mode } from "scout-api";
import { AccessoryContext } from "../../../src/accessoryFactory";
import { SecuritySystemContext } from "../../../src/accessoryFactory/securitySystemAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../../src/context";
import { SecuritySystemServiceFactory } from "../../../src/serviceFactory/hub/securitySystemServiceFactory";
import { Service, CharacteristicConstructor, Characteristic, CharacteristicValue } from "../../../src/types";
import * as mocks from "../../mocks";

describe(`${SecuritySystemServiceFactory.name}`, () => {
    let homebridge: HomebridgeContext;
    let scout: ScoutContext;
    let context: AccessoryContext<SecuritySystemContext>;
    let serviceFactory: SecuritySystemServiceFactory;

    beforeEach(() => {
        homebridge = mocks.mockHomebridgeContext();

        context = {
            custom: {
                hub: {},
                modes: [] as Array<Mode>,
            },
        } as AccessoryContext<SecuritySystemContext>;

        serviceFactory = new SecuritySystemServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("without configured modes", () => {
            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("with configured modes", () => {
            homebridge.config.modes = {
                away: ["mode1"],
                night: ["mode2"],
                stay: ["mode3"],
            };

            context.custom.modes = [
                {
                    name: "mode1",
                },
                {
                    name: "mode2",
                },
                {
                    name: "mode3",
                },
            ] as Array<Mode>;

            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.SecuritySystem);
        });

        test.todo("with invalid configured modes");
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

        test.todo("so many use cases…");
    });
});
