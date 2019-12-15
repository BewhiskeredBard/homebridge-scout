const ScoutPlatform = require('./lib/scout-platform');
const ScoutApi = require('./lib/scout-api');

module.exports = (homebridge) => {
    homebridge.registerPlatform('homebridge-scout', 'ScoutAlarm', function(logger, config) {
        let api = new ScoutApi(logger, config.auth.email, config.auth.password);

        return new ScoutPlatform(homebridge, logger, api, config.location, config.modes);
    });
};
