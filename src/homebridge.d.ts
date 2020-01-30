import { EventEmitter } from "events";

export declare type Plugin = (homebridge: API) => void;

export declare type PlatformConstructor = (platformLogger: Logger, platformConfig: any, api: API) => Platform;

export declare type ServiceConstructor = new (...args: any[]) => any;

export declare type AccessoryConstructor = new (logger: Logger, config: any) => any;

export declare type PlatformAccessoryConstructor = new (displayName: string, UUID: string, category: number) => PlatformAccessory;

export declare type ConfigurationRequestHandler = (config: any) => void;

export declare type PlatformResponseHandler = (response: unknown | undefined, type: string, replace: boolean, config: any | undefined) => void;

export declare interface API extends EventEmitter {
    version: number;
    serverVersion: number;
    user: any;
    hap: any;
    hapLegacyTypes: any;
    platformAccessory: PlatformAccessoryConstructor;

    accessory(name: string): PlatformAccessory;
    registerAccessory<T>(pluginName: string, accessoryName: string, constructor: AccessoryConstructor, configurationRequestHandler?: ConfigurationRequestHandler): void;
    publishCameraAccessories(pluginName: string, accessories: PlatformAccessory[]): void;
    publishExternalAccessories(pluginName: string, accessories: PlatformAccessory[]): void;
    platform(name: string): Platform;
    registerPlatform(pluginName: string, platformName: string, constructor: PlatformConstructor, dynamic: boolean): void;
    registerPlatformAccessories(pluginName: string, platformName: string, accessories: PlatformAccessory[]): void;
    updatePlatformAccessories(accessories: PlatformAccessory[]): void;
    unregisterPlatformAccessories(pluginName: string, platformName: string, accessories: PlatformAccessory[]): void;
}

export declare interface PlatformAccessory {
    displayName: string;
    UUID: string;
    category: number;
    services: any[];
    reachable: boolean;
    context: any;

    addService<T>(service: ServiceConstructor | T, ...args: any[]): T;
    removeService<T>(service: T): void;
    getService<T>(name: ServiceConstructor | string): T | undefined;
    getServiceByUUIDAndSubType<T>(UUID: string, subtype: string): T | undefined;
    updateReachability(reachable: boolean): void;
    configureCameraSource(cameraSource: unknown): void;
}

export declare interface Platform {
    configureAccessory?(accessory: PlatformAccessory): void;
    configurationRequestHandler?(context: any, request: unknown | null, responseHandler: PlatformResponseHandler): void;
}

export declare class Logger {
    static withPrefix(prefix: string): Logger;

    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    log(level: string, msg: string): void;
}
