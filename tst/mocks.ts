import { HomebridgeContext } from "../src/context";
import { CharacteristicConstructor, ServiceConstructor } from "../src/types";

export function mockHomebridgeContext(): HomebridgeContext {
    const homebridge = {
        api: {
            hap: {
                Characteristic: {
                    LeakDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    CurrentTemperature: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    MotionDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusFault: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusLowBattery: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                },
                Service: {
                    HumiditySensor: (jest.fn() as unknown) as ServiceConstructor,
                    LeakSensor: (jest.fn() as unknown) as ServiceConstructor,
                    MotionSensor: (jest.fn() as unknown) as ServiceConstructor,
                    TemperatureSensor: (jest.fn() as unknown) as ServiceConstructor,
                },
            },
        },
    } as HomebridgeContext;

    homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED = 123;
    homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED = 234;

    return homebridge;
}
