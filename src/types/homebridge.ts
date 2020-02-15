import { EventEmitter } from "events";
import * as Hap from "./hap";

export declare type Config = object;

export declare type Plugin = (homebridge: API) => void;

export declare type PlatformConstructor = (platformLogger: Logger, platformConfig: Config, api: API) => Platform;

export declare type AccessoryConstructor = new (logger: Logger, config: Config) => unknown;

export declare type PlatformAccessoryConstructor = new (displayName: string, UUID: string, category: number) => PlatformAccessory;

export declare type ConfigurationRequestHandler = (config: Config) => void;

export declare type PlatformResponseHandler = (response: unknown | undefined, type: string, replace: boolean, config: Config | undefined) => void;

export declare interface API extends EventEmitter {
    version: number;
    serverVersion: number;
    user: unknown;
    hap: Hap.Hap;
    hapLegacyTypes: unknown;
    platformAccessory: PlatformAccessoryConstructor;

    accessory(name: string): PlatformAccessory;
    registerAccessory(
        pluginName: string,
        accessoryName: string,
        constructor: AccessoryConstructor,
        configurationRequestHandler?: ConfigurationRequestHandler,
    ): void;
    publishCameraAccessories(pluginName: string, accessories: PlatformAccessory[]): void;
    publishExternalAccessories(pluginName: string, accessories: PlatformAccessory[]): void;
    platform(name: string): Platform;
    registerPlatform(pluginName: string, platformName: string, constructor: PlatformConstructor, dynamic: boolean): void;
    registerPlatformAccessories(pluginName: string, platformName: string, accessories: PlatformAccessory[]): void;
    updatePlatformAccessories(accessories: PlatformAccessory[]): void;
    unregisterPlatformAccessories(pluginName: string, platformName: string, accessories: PlatformAccessory[]): void;
}

export declare interface PlatformAccessory extends EventEmitter {
    displayName: string;
    UUID: string;
    category: number;
    services: Hap.Service[];
    reachable: boolean;
    context: unknown;

    addService(service: Hap.ServiceConstructor | Hap.Service, ...args: unknown[]): Hap.Service;
    removeService<T extends Hap.Service>(service: T): void;
    getService(name: Hap.ServiceConstructor | string): Hap.Service | undefined;
    getServiceByUUIDAndSubType<T extends Hap.Service>(UUID: string, subtype: string): T | undefined;
    updateReachability(reachable: boolean): void;
    configureCameraSource(cameraSource: unknown): void;
}

export declare interface Platform {
    configureAccessory?(accessory: PlatformAccessory): void;
    configurationRequestHandler?(context: unknown, request: unknown | null, responseHandler: PlatformResponseHandler): void;
}

export declare class Logger {
    public static withPrefix(prefix: string): Logger;

    public debug(msg: string): void;
    public info(msg: string): void;
    public warn(msg: string): void;
    public error(msg: string): void;
    public log(level: string, msg: string): void;
}
