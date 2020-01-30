import { DeviceManager } from "./device-manager";
import { HubManager } from "./hub-manager";
import { ScoutApi } from "./scout-api";
import { ScoutPlatform } from "./scout-platform";
import * as Homebridge from "./homebridge";

const PLUGIN_NAME = "homebridge-scout";
const PLATFORM_NAME = "ScoutAlarm";

const plugin: Homebridge.Plugin = (homebridge: Homebridge.API): void => {
    const pluginVersion = require("../package.json").version;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, function(logger: Homebridge.Logger, config: Homebridge.Config): Homebridge.Platform {
        logger.info(`Running ${PLUGIN_NAME}-${pluginVersion} on homebridge-${homebridge.serverVersion}.`);

        const api = new ScoutApi(logger, config.auth.email, config.auth.password);
        const hubManager = new HubManager(homebridge, logger, api);
        const deviceManager = new DeviceManager(homebridge, logger, api, config.reverseSensorState);
        const platform = new ScoutPlatform(homebridge, logger, api, hubManager, deviceManager, config.location, config.modes);

        homebridge.on("didFinishLaunching", () => {
            platform.registerAccessories().catch(e => logger.error(e));
        });

        platform.on("addAccessory", (accessory: Homebridge.PlatformAccessory) => {
            try {
                homebridge.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            } catch (e) {
                logger.error(e);
            }
        });

        platform.on("removeAccessory", (accessory: Homebridge.PlatformAccessory) => {
            try {
                homebridge.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            } catch (e) {
                logger.error(e);
            }
        });

        return platform;
    }, false);
};

export default plugin;
