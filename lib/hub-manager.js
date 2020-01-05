function HubManager(homebridge, logger, api) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
    this.accessories = new Map();
    this.modeStates = new Map();
}

HubManager.prototype.createAccessory = function(hub, modes, modeIds) {
    const Categories = this.homebridge.hap.Accessory.Categories;
    const PlatformAccessory = this.homebridge.platformAccessory;

    let name = "Security System";
    let uuid = this.homebridge.hap.uuid.generate(hub.id);
    let category = Categories.SECURITY_SYSTEM;
    let accessory = new PlatformAccessory(name, uuid, category);

    accessory.context.hub = hub;
    accessory.context.modes = modes;
    accessory.context.modeIds = modeIds;

    modes.forEach(mode => {
        this.modeStates.set(mode.id, mode.state);
    });

    return accessory;
};

HubManager.prototype.configureAccessory = function(accessory) {
    const Service = this.homebridge.hap.Service;
    const Characteristic = this.homebridge.hap.Characteristic;

    let hub = accessory.context.hub;

    this.logger.info(`Configuring hub [${hub.id}] as accessory [${accessory.UUID}].`);

    let accessoryInfo = accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, hub.type)
            .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, hub.reported.fw_version);

    if (undefined !== hub.reported.hw_version) {
        accessoryInfo.setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version);
    }

    let values = this.getCharacteristicValues(accessory);

    values.forEach((serviceValues, serviceType) => {
        let service = accessory.getService(serviceType);

        if (!service) {
            service = accessory.addService(new serviceType(accessory.displayName));
        }

        for (let characteristicType of serviceValues.keys()) {
            service.getCharacteristic(characteristicType).on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues(accessory).get(serviceType).get(characteristicType));
                } catch (e) {
                    callback(e);
                }
            });
        }
    });

    accessory.getService(Service.SecuritySystem)
            .getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('set', (value, callback) => {
                this.setTargetState(accessory, value).then(() => callback()).catch(callback);
            });

    accessory.on('identify', (paired, callback) => {
        this.identify(accessory, paired).then(() => callback()).catch(callback);
    });

    let services = new Set([Service.AccessoryInformation]
            .concat(...values.keys())
            .map(service => service.UUID));

    accessory.services.forEach(service => {
        if (!services.has(service.UUID)) {
            accessory.removeService(service);
        }
    });

    this.accessories.set(hub.id, accessory);
};

HubManager.prototype.onHubEvent = function(event) {
    this.logger.info(`Hub [${event.id}] event fired.`);
    this.logger.debug(`Hub Event: ${JSON.stringify(event)}`);

    let accessory = this.accessories.get(event.id);

    if (!accessory) {
        return;
    }

    accessory.context.hub = event;

    this.updateValues(accessory);
};

HubManager.prototype.onModeEvent = function(event) {
    this.logger.info(`Mode [${event.mode_id}] ${event.event} event fired.`);
    this.logger.debug(`Mode Event: ${JSON.stringify(event)}`);

    this.modeStates.set(event.mode_id, event.event);

    // This is less than ideal, but the mode event only contains the mode_id and event.
    this.accessories.forEach(accessory => {
        this.updateValues(accessory);
    });
};

HubManager.prototype.updateValues = function(accessory) {
    this.getCharacteristicValues(accessory).forEach((serviceValues, serviceType) => {
        let service = accessory.getService(serviceType);

        serviceValues.forEach((value, characteristicType) => {
            service.getCharacteristic(characteristicType).updateValue(value);
        });
    });
};

HubManager.prototype.getCharacteristicValues = function(accessory) {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let values = new Map();
    let modeIds = accessory.context.modeIds;
    let alarmedModeId = modeIds.filter(modeId => 'alarmed' == this.modeStates.get(modeId)).pop();
    let armedModeId = modeIds.filter(modeId => -1 < ['armed', 'triggered'].indexOf(this.modeStates.get(modeId))).pop();
    let armingModeId = modeIds.filter(modeId => 'arming' == this.modeStates.get(modeId)).pop();

    let currentState = alarmedModeId ? 4 : (armedModeId ? modeIds.indexOf(armedModeId) : 3);
    let targetState = alarmedModeId
            ? modeIds.indexOf(alarmedModeId)
            : (armingModeId ? modeIds.indexOf(armingModeId) : currentState);

    values.set(Service.SecuritySystem, new Map([
        [Characteristic.SecuritySystemCurrentState, currentState],
        [Characteristic.SecuritySystemTargetState, targetState],
    ]));

    let reported = accessory.context.hub.reported || {};

    if (reported.temperature && undefined !== reported.temperature) {
        values.set(Service.TemperatureSensor, new Map([[
            Characteristic.CurrentTemperature,
            reported.temperature,
        ]]));
    }

    let fault = 'active' === reported.status
            ? Characteristic.StatusFault.NO_FAULT
            : Characteristic.StatusFault.GENERAL_FAULT;

    values.forEach(serviceValues => {
        serviceValues.set(Characteristic.StatusFault, fault);
    });

    if (reported.battery && undefined !== reported.battery.level) {
        let type = accessory.context.hub.type;
        let batteryLevel = -1;

        if ('scout1' == type) {
            // The v1 hub appears to report an unsigned byte value. When plugged in, the value is 255.
            const MAX_BATTERY_LEVEL = 255;
            batteryLevel = Math.min(reported.battery.level, MAX_BATTERY_LEVEL);
            batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
        } else if ('scout1S' == type) {
            // The v2 hub appears to report a direct voltage reading. When plugged in, the value is 5.0,
            // which is the voltage of the power adapter's output. The value drops to just above 4.0
            // once it's on battery power. The logic below is an extremely poor approximation.
            const MAX_BATTERY_LEVEL = 5;
            batteryLevel = Math.min(reported.battery.level, MAX_BATTERY_LEVEL);
            batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
        }

        if (-1 < batteryLevel) {
            let chargingState = reported.battery.active
                    ? Characteristic.ChargingState.NOT_CHARGING
                    : Characteristic.ChargingState.CHARGING;

            let lowBattery = reported.battery.low
                    ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                    : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

            values.set(Service.BatteryService, new Map([
                [Characteristic.BatteryLevel, batteryLevel],
                [Characteristic.ChargingState, chargingState],
                [Characteristic.StatusLowBattery, lowBattery],
            ]));
        }
    }

    return values;
}

HubManager.prototype.setTargetState = async function(accessory, value) {
    if (3 == value) {
        let targetModeId = accessory.context.modeIds.filter(modeId => {
            return -1 != ['arming', 'armed', 'triggered', 'alarmed'].indexOf(this.modeStates.get(modeId));
        }).pop();

        if (targetModeId) {
            await this.api.setMode(targetModeId, false);
        }
    } else {
        let targetModeId = accessory.context.modeIds[value];

        if (targetModeId) {
            await this.api.setMode(targetModeId, true);
        } else {
            throw new Error(`No matching mode found for "${value}".`);
        }
    }
}

HubManager.prototype.identify = async function(accessory, paired) {
    await this.api.chirpHub(accessory.context.hub.id);
}

module.exports = HubManager;
