import { ModeState, Mode, ModeStateUpdateType } from "scout-api";
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
        scout = mocks.mockScoutContext();
        homebridge = mocks.mockHomebridgeContext();

        homebridge.config.modes = {
            away: ["name0"],
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
            homebridge.config.modes!.away = ["nameMissing"];

            context.custom.modes.shift();

            expect(() => serviceFactory.getService(context)).toThrowError(`Could not find a Scout mode named "nameMissing".`);
        });
    });

    describe(".configureService()", () => {
        let service: Service;
        let characteristics: Map<CharacteristicConstructor<unknown>, Characteristic>;
        let updatedCharacteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>;

        beforeEach(() => {
            service = {
                getCharacteristic: jest.fn() as unknown,
            } as Service;

            characteristics = new Map();
            updatedCharacteristics = new Map();

            (service.getCharacteristic as jest.Mock<Characteristic>).mockImplementation((type: CharacteristicConstructor<unknown>) => {
                let characteristic = characteristics.get(type);

                if (!characteristic) {
                    characteristic = {
                        updateValue: jest.fn().mockImplementation((value: CharacteristicValue) => {
                            updatedCharacteristics.set(type, value);
                        }) as unknown,
                        on: jest.fn() as unknown,
                    } as Characteristic;

                    characteristics.set(type, characteristic);
                }

                return characteristic;
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

        test("arm when disarmed", () => {
            (scout.api.toggleRecipe as jest.Mock<unknown>).mockImplementation(() => {
                return new Promise(resolve => {
                    resolve();
                });
            });

            serviceFactory.configureService(service, context);

            const characteristic = characteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)!;
            const listener = (characteristic.on as jest.Mock<unknown>).mock.calls[0][1];

            return new Promise(resolve => {
                listener(homebridge.api.hap.Characteristic.SecuritySystemTargetState.STAY_ARM, resolve);
            }).then(() => {
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect((scout.api.toggleRecipe as unknown) as jest.Mock<Mode>).toHaveBeenCalledWith("mode2", {
                    state: ModeStateUpdateType.Arming,
                });
            });
        });

        test("arm when already armed", () => {
            (scout.api.toggleRecipe as jest.Mock<unknown>).mockImplementation(() => {
                return new Promise(resolve => {
                    resolve();
                });
            });

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            context.custom.modes[2].state = ModeState.Armed;

            serviceFactory.configureService(service, context);

            const characteristic = characteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)!;
            const listener = (characteristic.on as jest.Mock<unknown>).mock.calls[0][1];

            return new Promise(resolve => {
                listener(homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM, resolve);
            }).then(() => {
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect((scout.api.toggleRecipe as unknown) as jest.Mock<Mode>).toHaveBeenCalledWith("mode1", {
                    state: ModeStateUpdateType.Arming,
                });
            });
        });

        test("disarm when already armed", () => {
            (scout.api.toggleRecipe as jest.Mock<unknown>).mockImplementation(() => {
                return new Promise(resolve => {
                    resolve();
                });
            });

            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            context.custom.modes[2].state = ModeState.Armed;

            serviceFactory.configureService(service, context);

            const characteristic = characteristics.get(homebridge.api.hap.Characteristic.SecuritySystemTargetState)!;
            const listener = (characteristic.on as jest.Mock<unknown>).mock.calls[0][1];

            return new Promise(resolve => {
                listener(homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM, resolve);
            }).then(() => {
                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect((scout.api.toggleRecipe as unknown) as jest.Mock<Mode>).toHaveBeenCalledWith("mode2", {
                    state: ModeStateUpdateType.Disarm,
                });
            });
        });

        test.todo("so many use cases…");
    });
});
