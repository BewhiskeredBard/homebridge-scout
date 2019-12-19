const Hub = require('./hub');
const Device = require('./device');
const EventEmitter = require('events');
const util = require('util');

function ScoutPlatform(homebridge, logger, api, locationName, modeNames) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
    this.locationName = locationName;
    this.modeNames = modeNames;
    this.cachedAccessories = [];
}

util.inherits(ScoutPlatform, EventEmitter);

ScoutPlatform.prototype.getLocation = async function() {
    let location = (await this.api.getMemberLocations())
            .filter(location => location.name == this.locationName)
            .pop();

    if (!location) {
        throw new Error("No location found for name '" + this.locationName + "'");
    }

    this.logger("Found location: " + location.id);

    return location;
};

ScoutPlatform.prototype.getModeIds = function(modes) {
    let keys = ['stay', 'away', 'night'];
    let modeIds = [];

    keys.forEach(key => {
        let modeName = this.modeNames[key];

        if (!modeName) {
            throw new Error("Missing mode name mapping configuration for '" + key + "'");
        }

        let modeId = modes.filter(mode => mode.name == modeName).map(mode => mode.id).pop();

        if (!modeId) {
            throw new Error("No mode found for name '" + modeName +"'");
        }

        this.logger("Found " + modeName + " mode: " + modeId);

        modeIds.push(modeId);
    });

    return modeIds;
};

ScoutPlatform.prototype.getAccessories = async function() {
    let location = await this.getLocation();
    let modes = await this.api.getLocationModes(location.id);
    let modeIds = this.getModeIds(modes);
    let hub = await this.api.getLocationHub(location.id);
    let devices = await this.api.getLocationDevices(location.id);
    let hubAccessory = new Hub(this.homebridge, this.logger, this.api, modeIds, hub, modes);
    let channel = await this.api.subscribe(location.id);

    while (this.cachedAccessories.length > 0) {
        let accessory = this.cachedAccessories.pop();

        this.emit('removeAccessory', accessory);
    }

    hubAccessory.getAccessories().forEach(accessory => {
        this.emit('addAccessory', accessory);
    });

    channel.bind('mode', function(event) {
        hubAccessory.onModeEvent(event);
    });

    channel.bind('hub', function(event) {
        hubAccessory.onHubEvent(event);
    });

    devices.forEach(device => {
        let d = new Device(this.homebridge, this.logger, device);

        d.getAccessories().forEach(accessory => {
            this.emit('addAccessory', accessory);
        });

        channel.bind('device', event => {
            if (event.id == device.id) {
                d.onDeviceEvent(event);
            }
        });
    });
};

ScoutPlatform.prototype.configureAccessory = function(accessory) {
    this.cachedAccessories.push(accessory);
}

module.exports = ScoutPlatform;
