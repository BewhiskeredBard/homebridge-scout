import { HomebridgeContext } from "../src/context";
import { CharacteristicConstructor, ServiceConstructor } from "../src/types";

export function mockHomebridgeContext(): HomebridgeContext {
    const homebridge = {
        api: {
            hap: {
                Characteristic: {
                    BatteryLevel: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    ChargingState: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    ContactSensorState: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    CurrentRelativeHumidity: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    CurrentTemperature: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    LeakDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    MotionDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    SecuritySystemCurrentState: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    SecuritySystemTargetState: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    SmokeDetected: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusFault: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                    StatusLowBattery: (jest.fn() as unknown) as CharacteristicConstructor<unknown>,
                },
                Service: {
                    BatteryService: (jest.fn() as unknown) as ServiceConstructor,
                    ContactSensor: (jest.fn() as unknown) as ServiceConstructor,
                    HumiditySensor: (jest.fn() as unknown) as ServiceConstructor,
                    LeakSensor: (jest.fn() as unknown) as ServiceConstructor,
                    MotionSensor: (jest.fn() as unknown) as ServiceConstructor,
                    SecuritySystem: (jest.fn() as unknown) as ServiceConstructor,
                    SmokeSensor: (jest.fn() as unknown) as ServiceConstructor,
                    TemperatureSensor: (jest.fn() as unknown) as ServiceConstructor,
                },
            },
        },
        config: {},
    } as HomebridgeContext;

    homebridge.api.hap.Characteristic.ChargingState.CHARGING = 123;
    homebridge.api.hap.Characteristic.ChargingState.NOT_CHARGING = 234;

    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED = 123;
    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED = 123;
    homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED = 123;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM = 234;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.DISARMED = 345;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM = 456;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.STAY_ARM = 567;

    homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM = 123;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM = 234;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM = 345;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.STAY_ARM = 456;

    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED = 123;
    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED = 234;

    return homebridge;
}
