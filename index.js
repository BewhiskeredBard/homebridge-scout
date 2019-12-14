const ScoutPlatform = require('./lib/scout-platform');

'use strict';

module.exports = (homebridge) => {
    homebridge.registerPlatform('homebridge-scout', 'ScoutAlarm', function(logger, config) {
        return new ScoutPlatform(homebridge, logger, config);
    });
};
