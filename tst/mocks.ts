import { HomebridgeContext, ScoutContext } from '../src/context';

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
                    StatusTampered: jest.fn() as unknown,
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
                email: 'email1',
                password: 'password1',
            },
            location: 'locationName1',
            modes: {
                away: ['awayModeName'],
                night: ['nightModeName'],
                stay: ['stayModeName'],
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

    (homebridge.api.hap.Characteristic.ChargingState.CHARGING as unknown) = 123;
    (homebridge.api.hap.Characteristic.ChargingState.NOT_CHARGING as unknown) = 234;

    (homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_DETECTED as unknown) = 123;
    (homebridge.api.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED as unknown) = 234;

    (homebridge.api.hap.Characteristic.LeakDetected.LEAK_DETECTED as unknown) = 123;
    (homebridge.api.hap.Characteristic.LeakDetected.LEAK_NOT_DETECTED as unknown) = 234;

    (homebridge.api.hap.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED as unknown) = 12;
    (homebridge.api.hap.Characteristic.SecuritySystemCurrentState.AWAY_ARM as unknown) = 23;
    (homebridge.api.hap.Characteristic.SecuritySystemCurrentState.DISARMED as unknown) = 34;
    (homebridge.api.hap.Characteristic.SecuritySystemCurrentState.NIGHT_ARM as unknown) = 45;
    (homebridge.api.hap.Characteristic.SecuritySystemCurrentState.STAY_ARM as unknown) = 56;

    (homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM as unknown) = 21;
    (homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM as unknown) = 32;
    (homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM as unknown) = 43;
    (homebridge.api.hap.Characteristic.SecuritySystemTargetState.STAY_ARM as unknown) = 54;

    (homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_DETECTED as unknown) = 123;
    (homebridge.api.hap.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED as unknown) = 234;

    (homebridge.api.hap.Characteristic.StatusTampered.TAMPERED as unknown) = 12;
    (homebridge.api.hap.Characteristic.StatusTampered.NOT_TAMPERED as unknown) = 23;

    return homebridge;
}

export function mockScoutContext(): ScoutContext {
    return {
        api: {
            getHub: jest.fn() as unknown,
            getMember: jest.fn() as unknown,
            getModes: jest.fn() as unknown,
            getLocations: jest.fn() as unknown,
            setChirp: jest.fn() as unknown,
            toggleRecipe: jest.fn() as unknown,
        },
        listener: {
            connect: jest.fn() as unknown,
            getConnectionState: jest.fn() as unknown,
            addLocation: jest.fn() as unknown,
            removeLocation: jest.fn() as unknown,
            on: jest.fn() as unknown,
            off: jest.fn() as unknown,
        },
    } as ScoutContext;
}
