const ScoutApi = require('./scout-api');
const Hub = require('./hub');

function ScoutPlatform(homebridge, logger, config) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = new ScoutApi(logger, config);
}

ScoutPlatform.prototype.getAccessories = async function() {
    let accessories = [];
    let locations = await this.api.getMemberLocations();

    if (0 == locations.length) {
        throw new Error("No locations found");
    }

    if (1 < locations.length) {
        throw new Error("More than one location found");
    }

    let location = locations.pop();
    let hub = await this.api.getLocationHub(location.id);

    accessories.push(new Hub(this.homebridge, this.logger, this.api, hub));

    return accessories;
};

ScoutPlatform.prototype.accessories = function(callback) {
    this.getAccessories().then(callback).catch(e => this.logger(e));
};

module.exports = ScoutPlatform;
