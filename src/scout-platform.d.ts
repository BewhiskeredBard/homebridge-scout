import * as Homebridge from "./homebridge";
import { EventEmitter } from "events";

export class ScoutPlatform extends EventEmitter implements Homebridge.Platform {
    constructor(
        homebridge: Homebridge.API,
        logger: Homebridge.Logger,
        api: unknown,
        hubManager: unknown,
        deviceManager: unknown,
        locationName: unknown,
        modeNames: unknown);

    configureAccessory(accessory: Homebridge.PlatformAccessory): void;
    registerAccessories(): Promise<void>;
}
