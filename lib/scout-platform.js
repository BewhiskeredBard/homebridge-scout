const Hub = require('./hub');
const Device = require('./device');

function ScoutPlatform(homebridge, logger, api, locationName, modeNames) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
    this.locationName = locationName;
    this.modeNames = modeNames;
}

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

ScoutPlatform.prototype.getModeIds = async function(locationId) {
    let modes = (await this.api.getLocationModes(locationId));
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
    let self = this;
    let accessories = [];
    let location = await this.getLocation();
    let modeIds = await this.getModeIds(location.id);
    let hubData = await this.api.getLocationHub(location.id);
    let devices = await this.api.getLocationDevices(location.id);
    let hub = new Hub(this.homebridge, this.logger, this.api, hubData, modeIds);
    var channel = await this.api.subscribe(location.id);

    devices.forEach(device => {
        let accessory = new Device(this.homebridge, this.logger, device);

        if (accessory.getServices().length == 0) {
            this.logger("No services for device type: " + device.type);
        } else {
            channel.bind('device', function(data) {
                if (data.id == device.id) {
                    accessory.onDeviceEvent(data).catch(e => self.logger(e));
                }
            });

            accessories.push(accessory);
        }
    });

    channel.bind('mode', function(data) {
        hub.onModeEvent(data).catch(e => self.logger(e));
    });

    accessories.push(hub);

    return accessories;
};

ScoutPlatform.prototype.accessories = function(callback) {
    this.getAccessories().then(callback).catch(e => this.logger(e));
};

module.exports = ScoutPlatform;
