const EventEmitter = require('events');
const util = require('util');

function ScoutPlatform(homebridge, logger, api, hubManager, deviceManager, locationName, modeNames) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
    this.locationName = locationName;
    this.modeNames = modeNames;
    this.hubManager = hubManager;
    this.deviceManager = deviceManager;
    this.cachedAccessories = new Map();
    this.devices = new Map();

    deviceManager.on('paired', accessory => this.emit('addAccessory', accessory));
    deviceManager.on('unpaired', accessory => this.emit('removeAccessory', accessory));
}

util.inherits(ScoutPlatform, EventEmitter);

ScoutPlatform.prototype.getLocation = async function() {
    let memberId = await this.api.getMemberId();
    let locations = await this.api.getMemberLocations();

    this.logger.debug(`Locations: ${JSON.stringify(locations)}`);

    let adminIds = Array.prototype.concat.apply([], locations.map(location => location.admin_ids));

    if (adminIds.find(adminId => adminId == memberId)) {
        this.logger.warn(`The authenticated member [${memberId}] is an admin. It is highly recommended to use a non-admin member.`);
    }

    let location = locations.find(location => location.name == this.locationName);

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
    let location = await this.getLocation();
    let hub = await this.api.getLocationHub(location.id);
    let modes = await this.api.getLocationModes(location.id);
    let devices = await this.api.getLocationDevices(location.id);

    this.logger.info(`Discovered hub [${hub.id}].`);
    this.logger.debug(`Hub: ${JSON.stringify(hub)}`);
    this.logger.debug(`Modes: ${JSON.stringify(modes)}`);
    this.logger.debug(`Devices: ${JSON.stringify(devices)}`);

    let modeIds = this.getModeIds(modes);

    this.registerHub(hub, modes, modeIds);
    this.registerDevices(devices);

    this.deregisterCachedAccessories();

    let listener = await this.api.subscribe();

    listener.addModeListener(location.id, event => this.hubManager.onModeEvent(event));
    listener.addHubListener(location.id, event => this.hubManager.onHubEvent(event));
    listener.addDeviceTriggerListener(location.id, event => this.deviceManager.onDeviceEvent(event));
    listener.addDevicePairListener(location.id, event => this.deviceManager.onDeviceEvent(event));

    listener.addConnectionStateListener(states => {
        this.logger.info(`Event subscription connection is ${states.current}`);
        this.logger.debug(`Event subscription connection state: ${JSON.stringify(states)}`);
    });
};

ScoutPlatform.prototype.deregisterCachedAccessories = function() {
    this.cachedAccessories.forEach(accessory => {
        this.logger.info(`Removing cached accessory [${accessory.UUID}].`);

        this.emit('removeAccessory', accessory);
    });
};

ScoutPlatform.prototype.configureAccessory = function(accessory) {
    this.logger.info(`Discovered cached accessory [${accessory.UUID}]`);

    this.cachedAccessories.set(accessory.UUID, accessory);
};

ScoutPlatform.prototype.registerHub = function(hub, modes, modeIds) {
    let accessory = this.hubManager.createAccessory(hub, modes, modeIds);

    if (this.cachedAccessories.has(accessory.UUID)) {
        this.logger.info(`Using cached hub accessory [${accessory.UUID}].`);

        let cachedAccessory = this.cachedAccessories.get(accessory.UUID);
        cachedAccessory.context = accessory.context;
        accessory = cachedAccessory;

        this.cachedAccessories.delete(accessory.UUID);
    } else {
        this.logger.info(`Adding new hub accessory [${accessory.UUID}].`);

        this.emit('addAccessory', accessory);
    }

    this.hubManager.configureAccessory(accessory);

    return accessory;
}

ScoutPlatform.prototype.registerDevices = function(devices) {
    devices.filter(device => this.deviceManager.isSupported(device))
            .map(device => this.deviceManager.createAccessory(device))
            .forEach(accessory => {
                if (this.cachedAccessories.has(accessory.UUID)) {
                    this.logger.info(`Using cached device accessory [${accessory.UUID}].`);

                    let cachedAccessory = this.cachedAccessories.get(accessory.UUID);
                    cachedAccessory.context = accessory.context;
                    accessory = cachedAccessory;

                    this.cachedAccessories.delete(accessory.UUID);
                } else {
                    this.logger.info(`Adding new device accessory [${accessory.UUID}].`);

                    this.emit('addAccessory', accessory);
                }

                this.deviceManager.configureAccessory(accessory);
            });
}

module.exports = ScoutPlatform;
