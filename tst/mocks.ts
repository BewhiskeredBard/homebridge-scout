import { HomebridgeContext, ScoutContext } from "../src/context";

export function mockHomebridgeContext(): HomebridgeContext {
    const homebridge = {
        api: {
            on: jest.fn() as unknown,
            hap: {
                uuid: {
                    generate: jest.fn() as unknown,
                },
                Characteristic: {
                    BatteryLevel: jest.fn() as unknown,
                    ChargingState: jest.fn() as unknown,
                    ContactSensorState: jest.fn() as unknown,
                    CurrentRelativeHumidity: jest.fn() as unknown,
                    CurrentTemperature: jest.fn() as unknown,
                    LeakDetected: jest.fn() as unknown,
                    MotionDetected: jest.fn() as unknown,
                    SecuritySystemCurrentState: jest.fn() as unknown,
                    SecuritySystemTargetState: jest.fn() as unknown,
                    SmokeDetected: jest.fn() as unknown,
                    StatusFault: jest.fn() as unknown,
                    StatusLowBattery: jest.fn() as unknown,
                },
                Service: {
                    AccessoryInformation: jest.fn() as unknown,
                    BatteryService: jest.fn() as unknown,
                    ContactSensor: jest.fn() as unknown,
                    HumiditySensor: jest.fn() as unknown,
                    LeakSensor: jest.fn() as unknown,
                    MotionSensor: jest.fn() as unknown,
                    SecuritySystem: jest.fn() as unknown,
                    SmokeSensor: jest.fn() as unknown,
                    TemperatureSensor: jest.fn() as unknown,
                },
            },
            platformAccessory: jest.fn() as unknown,
            registerPlatformAccessories: jest.fn() as unknown,
            unregisterPlatformAccessories: jest.fn() as unknown,
        },
        config: {
            auth: {
                email: "email1",
                password: "password1",
            },
            location: "locationName1",
            modes: {
                away: "awayModeName",
                night: "nightModeName",
                stay: "stayModeName",
            },
        },
        logger: {
            debug: jest.fn() as unknown,
            error: jest.fn() as unknown,
            info: jest.fn() as unknown,
            log: jest.fn() as unknown,
            warn: jest.fn() as unknown,
        },
    } as HomebridgeContext;

    homebridge.api.hap.Characteristic.ChargingState.CHARGING = 123;
    homebridge.api.hap.Characteristic.ChargingState.NOT_CHARGING = 234;

    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED = 123;
    homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED = 123;
    homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED = 234;

    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED = 12;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM = 23;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.DISARMED = 34;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM = 45;
    homebridge.api.hap.Characteristic.SecuritySystemCurrentState.STAY_ARM = 56;

    homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM = 21;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM = 32;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM = 43;
    homebridge.api.hap.Characteristic.SecuritySystemTargetState.STAY_ARM = 54;

    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED = 123;
    homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED = 234;

    return homebridge;
}

export function mockScoutContext(): ScoutContext {
    return {
        memberId: "memberId1",
        api: {
            getHub: jest.fn() as unknown,
            getModes: jest.fn() as unknown,
            getLocations: jest.fn() as unknown,
            toggleRecipe: jest.fn() as unknown,
        },
        listener: {
            addConnectionStateListener: jest.fn() as unknown,
            getConnectionState: jest.fn() as unknown,
        },
    } as ScoutContext;
}
