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

        homebridge.config.modes = {
            away: "name0",
            night: ["name1"],
            stay: ["name2", "name3"],
        };

        context = {
            custom: {
                hub: {},
                modes: [
                    {
                        id: "mode0",
                        name: "name0",
                    },
                    {
                        id: "mode1",
                        name: "name1",
                    },
                    {
                        id: "mode2",
                        name: "name2",
                    },
                    {
                        id: "mode3",
                        name: "name3",
                    },
                ],
            },
        } as AccessoryContext<SecuritySystemContext>;

        serviceFactory = new SecuritySystemServiceFactory(homebridge, scout);
    });

    describe(".getService()", () => {
        test("without configured modes", () => {
            delete homebridge.config.modes;

            expect(serviceFactory.getService(context)).toBeUndefined();
        });

        test("with configured modes", () => {
            expect(serviceFactory.getService(context)).toStrictEqual(homebridge.api.hap.Service.SecuritySystem);
        });

        test("missing configured mode", () => {
            context.custom.modes[0].name = "nameMissing";

            expect(() => serviceFactory.getService(context)).toThrowError(`No configuration for Scout mode named "nameMissing"`);
        });

        test("missing Scout mode", () => {
            homebridge.config.modes!.away = "nameMissing";

            context.custom.modes.shift();

            expect(() => serviceFactory.getService(context)).toThrowError(`Could not find a Scout mode named "nameMissing".`);
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

        test.todo("so many use cases…");
    });
});
