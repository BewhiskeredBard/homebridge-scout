import { EventEmitter } from "events";

export enum Categories {
    OTHER = 1,
    BRIDGE = 2,
    FAN = 3,
    GARAGE_DOOR_OPENER = 4,
    LIGHTBULB = 5,
    DOOR_LOCK = 6,
    OUTLET = 7,
    SWITCH = 8,
    THERMOSTAT = 9,
    SENSOR = 10,
    ALARM_SYSTEM = 11,
    SECURITY_SYSTEM = 11, //Added to conform to HAP naming
    DOOR = 12,
    WINDOW = 13,
    WINDOW_COVERING = 14,
    PROGRAMMABLE_SWITCH = 15,
    RANGE_EXTENDER = 16,
    CAMERA = 17,
    IP_CAMERA = 17, //Added to conform to HAP naming
    VIDEO_DOORBELL = 18,
    AIR_PURIFIER = 19,
    AIR_HEATER = 20, //Not in HAP Spec
    AIR_CONDITIONER = 21, //Not in HAP Spec
    AIR_HUMIDIFIER = 22, //Not in HAP Spec
    AIR_DEHUMIDIFIER = 23, // Not in HAP Spec
    APPLE_TV = 24,
    HOMEPOD = 25, // HomePod
    SPEAKER = 26,
    AIRPORT = 27,
    SPRINKLER = 28,
    FAUCET = 29,
    SHOWER_HEAD = 30,
    TELEVISION = 31,
    TARGET_CONTROLLER = 32, // Remote Control
    ROUTER = 33 // HomeKit enabled router
}

export declare type Nullable<T> = T | null;
export declare type WithUUID<T> = T & { UUID: string };
export declare type PrimitiveTypes = string | number | boolean;
export declare type CharacteristicValue = PrimitiveTypes | PrimitiveTypes[] | { [key: string]: PrimitiveTypes };
export declare type CharacteristicGetCallback<T = Nullable<CharacteristicValue>> = (error?: Error | null , value?: T) => void
export declare type CharacteristicSetCallback = (error?: Error | null, value?: CharacteristicValue) => void
export declare type CharacteristicConstructor<T> = WithUUID<(new () => Characteristic) & T>;
export declare type ServiceConstructor = WithUUID<(new () => Service)>;

export declare interface Service extends EventEmitter {
    UUID: string;

    addCharacteristic<T>(characteristic: CharacteristicConstructor<T> | Characteristic, ...constructorArgs: any[]): Characteristic;
    removeCharacteristic(characteristic: Characteristic): void;
    getCharacteristic(name: CharacteristicConstructor<unknown> | string): Characteristic;
    testCharacteristic(name: Characteristic | string): boolean;
    setCharacteristic<T>(name: CharacteristicConstructor<T> | string, value: CharacteristicValue): Service;
    updateCharacteristic(name: string, value: CharacteristicValue): Service;
}

export declare interface Characteristic extends EventEmitter {
    displayName?: string;
    UUID?: string;

    getValue(callback?: CharacteristicGetCallback, context?: any, connectionID?: string): void;
    setValue(newValue: Nullable<CharacteristicValue | Error>, callback?: CharacteristicSetCallback, context?: any, connectionID?: string): Characteristic;
    updateValue(newValue: Nullable<CharacteristicValue | Error>, callback?: () => void, context?: any): Characteristic;
}

export declare interface Hap {
    Characteristic: {
        BatteryLevel: CharacteristicConstructor<{}>;
        ChargingState: CharacteristicConstructor<{
            CHARGING: number;
            NOT_CHARGING: number;
        }>;
        CurrentTemperature: CharacteristicConstructor<{}>;
        FirmwareRevision: CharacteristicConstructor<{}>;
        HardwareRevision: CharacteristicConstructor<{}>;
        Manufacturer: CharacteristicConstructor<{}>;
        Model: CharacteristicConstructor<{}>;
        SecuritySystemCurrentState: CharacteristicConstructor<{}>;
        SecuritySystemTargetState: CharacteristicConstructor<{}>;
        SerialNumber: CharacteristicConstructor<{}>;
        StatusFault: CharacteristicConstructor<{
            NO_FAULT: number;
            GENERAL_FAULT: number;
        }>;
        StatusLowBattery: CharacteristicConstructor<{
            BATTERY_LEVEL_LOW: number;
            BATTERY_LEVEL_NORMAL: number;
        }>;

        new(): CharacteristicConstructor<unknown>;
    };
    Service: {
        AccessoryInformation: ServiceConstructor;
        BatteryService: ServiceConstructor;
        SecuritySystem: ServiceConstructor;
        TemperatureSensor: ServiceConstructor;

        new(): ServiceConstructor;
    };
    uuid: {
        generate: (data: string | Buffer | NodeJS.TypedArray | DataView) => string;
    };
}
