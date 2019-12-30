const ScoutPlatform = require('./lib/scout-platform');
const ScoutApi = require('./lib/scout-api');

const PLUGIN_NAME = 'homebridge-scout';
const PLATFORM_NAME = 'ScoutAlarm';

module.exports = (homebridge) => {
    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, function(logger, config) {
        let api = new ScoutApi(logger, config.auth.email, config.auth.password);
        let platform = new ScoutPlatform(homebridge, logger, api, config.location, config.modes);

        homebridge.on('didFinishLaunching', () => {
            platform.registerAccessories().catch(e => logger(e));
        });

        platform.on('addAccessory', accessory => {
            try {
                homebridge.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            } catch (e) {
                this.logger(e);
            }
        });

        platform.on('removeAccessory', accessory => {
            try {
                homebridge.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            } catch (e) {
                this.logger(e);
            }
        });

        return platform;
    });
};
