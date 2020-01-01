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
    this.devices = new Map();
}

util.inherits(ScoutPlatform, EventEmitter);

ScoutPlatform.prototype.getLocation = async function() {
    let locations = await this.api.getMemberLocations();

    this.logger.debug(`Locations: ${JSON.stringify(locations)}`);

    let location = locations.filter(location => location.name == this.locationName).pop();

    if (!location) {
        throw new Error(`No location found for "${this.locationName}".`);
    }

    this.logger.info(`Using "${this.locationName}" location [${location.id}].`);

    return location;
};

ScoutPlatform.prototype.getModeIds = function(modes) {
    let keys = ['stay', 'away', 'night'];
    let modeIds = [];

    keys.forEach(key => {
        let modeName = this.modeNames[key];

        if (!modeName) {
            throw new Error(`Missing mode name mapping configuration for "${key}".`);
        }

        let modeId = modes.filter(mode => mode.name == modeName).map(mode => mode.id).pop();

        if (!modeId) {
            throw new Error(`No mode found for "${modeName}".`);
        }

        this.logger.info(`Using "${modeName}" mode [${modeId}] for ${key} state.`);

        modeIds.push(modeId);
    });

    return modeIds;
};

ScoutPlatform.prototype.registerAccessories = async function() {
    this.deregisterCachedAccessories();

    let location = await this.getLocation();
    let locationHub = await this.api.getLocationHub(location.id);
    let locationModes = await this.api.getLocationModes(location.id);
    let locationDevices = await this.api.getLocationDevices(location.id);

    this.logger.info(`Discovered hub [${locationHub.id}].`);
    this.logger.debug(`Hub: ${JSON.stringify(locationHub)}`);
    this.logger.debug(`Modes: ${JSON.stringify(locationModes)}`);
    this.logger.debug(`Devices: ${JSON.stringify(locationDevices)}`);

    let modeIds = this.getModeIds(locationModes);
    let hub = new Hub(this.homebridge, this.logger, this.api, modeIds, locationHub, locationModes);
    let channel = await this.api.subscribe(location.id);

    hub.getAccessories().forEach(accessory => this.emit('addAccessory', accessory));

    locationDevices.forEach(locationDevice => this.registerDevice(locationDevice));

    channel.bind('mode', event => hub.onModeEvent(event));

    channel.bind('hub', event => hub.onHubEvent(event));

    channel.bind('device', event => {
        let eventType = event.event;

        if (this.devices.has(event.id)) {
            let device = this.devices.get(event.id);

            if ('triggered' == eventType) {
                device.onDeviceTrigger(event);
            } else if ('unpaired' == eventType) {
                device.getAccessories().forEach(accessory => this.emit('removeAccessory', accessory));

                this.devices.delete(event.id);
            }
        } else {
            if ('paired' == eventType) {
                (async () => {
                    let locationDevice = (await this.api.getLocationDevices(location.id))
                            .filter(locationDevice => locationDevice.id == event.id)
                            .pop();
        
                    this.registerDevice(locationDevice);
                })().catch(e => {throw e});
            }
        }
    });

    channel.pusher.connection.bind('error', error => {
        this.logger.error(`An event subscription connection error has occurred: ${JSON.stringify(error)}`);
    });

    channel.pusher.connection.bind('state_change', states => {
        this.logger.info(`Event subscription connection is ${states.current}`);
        this.logger.debug(`Event subscription connection state: ${JSON.stringify(states)}`);
    });
};

ScoutPlatform.prototype.deregisterCachedAccessories = function() {
    this.logger.info('Deregistering cached accessories…');

    while (this.cachedAccessories.length > 0) {
        this.emit('removeAccessory', this.cachedAccessories.pop());
    }
};

ScoutPlatform.prototype.registerDevice = function(locationDevice) {
    this.logger.info(`Discovered "${locationDevice.name}" ${locationDevice.type} device [${locationDevice.id}].`);

    let device = new Device(this.homebridge, this.logger, locationDevice);

    this.devices.set(locationDevice.id, device);

    device.getAccessories().forEach(accessory => this.emit('addAccessory', accessory));
};

ScoutPlatform.prototype.configureAccessory = function(accessory) {
    this.cachedAccessories.push(accessory);
};

module.exports = ScoutPlatform;
