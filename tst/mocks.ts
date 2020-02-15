import { HomebridgeContext } from "../src/context";
import { CharacteristicConstructor, ServiceConstructor } from "../src/types";

export function mockHomebridgeContext(): HomebridgeContext {
    const homebridge = {
        api: {
            hap: {
                Characteristic: {
                    ContactSensorState: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    CurrentRelativeHumidity: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    CurrentTemperature: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    LeakDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    MotionDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    SmokeDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusFault: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusLowBattery: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                },
                Service: {
                    ContactSensor: (jest.fn() as unknown) as ServiceConstructor,
                    HumiditySensor: (jest.fn() as unknown) as ServiceConstructor,
                    LeakSensor: (jest.fn() as unknown) as ServiceConstructor,
                    MotionSensor: (jest.fn() as unknown) as ServiceConstructor,
                    SmokeSensor: (jest.fn() as unknown) as ServiceConstructor,
                    TemperatureSensor: (jest.fn() as unknown) as ServiceConstructor,
                },
            },
        },
        config: {},
    } as HomebridgeContext;

    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED = 123;
    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED = 123;
    homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED = 123;
    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED = 234;

    return homebridge;
}
