import { ModeState } from "scout-api";
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
                        state: ModeState.Disarmed,
                    },
                    {
                        id: "mode1",
                        name: "name1",
                        state: ModeState.Disarmed,
                    },
                    {
                        id: "mode2",
                        name: "name2",
                        state: ModeState.Disarmed,
                    },
                    {
                        id: "mode3",
                        name: "name3",
                        state: ModeState.Disarmed,
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
                    on: jest.fn() as unknown,
                } as Characteristic;
            });
        });

        test("disarmed", () => {
            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemCurrentState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemCurrentState.DISARMED,
            );

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM,
            );
        });

        test("arming", () => {
            context.custom.modes[0].state = ModeState.Arming;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemCurrentState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemCurrentState.DISARMED,
            );

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            );
        });

        test("armed", () => {
            context.custom.modes[1].state = ModeState.Armed;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemCurrentState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM,
            );

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM,
            );
        });

        test("triggered", () => {
            context.custom.modes[0].state = ModeState.Triggered;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemCurrentState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM,
            );

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            );
        });

        test("alarmed", () => {
            context.custom.modes[0].state = ModeState.Alarmed;

            serviceFactory.configureService(service, context);

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemCurrentState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED,
            );

            expect(updatedCharacteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)).toEqual(
                homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM,
            );
        });

        test.todo("so many use cases…");
    });
});
