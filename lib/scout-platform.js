const Pusher = require('pusher-js');
const Hub = require('./hub');

const PUSHER_APP_KEY = 'baf06f5a867d462e09d4';
const PUSHER_AUTH_ENDPOINT = 'https://api.scoutalarm.com/auth/pusher';

function ScoutPlatform(homebridge, logger, api) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
}

ScoutPlatform.prototype.getPusher = async function() {
    let jwt = await this.api.auth();

    return new Pusher(PUSHER_APP_KEY, {
        authEndpoint: PUSHER_AUTH_ENDPOINT,
        auth: {
            headers: {
                Authorization: jwt,
            }
        }
    });
};

ScoutPlatform.prototype.getAccessories = async function() {
    let accessories = [];
    let locations = await this.api.getMemberLocations();
    let self = this;

    if (0 == locations.length) {
        throw new Error("No locations found");
    }

    if (1 < locations.length) {
        throw new Error("More than one location found");
    }

    let location = locations.pop();
    let pusher = await this.getPusher();
    var channel = pusher.subscribe('private-' + location.id);
    let hub = new Hub(this.homebridge, this.logger, this.api, await this.api.getLocationHub(location.id));

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
