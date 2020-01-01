const MAX_BATTERY_LEVEL = 5;

function Hub(homebridge, logger, scoutApi, modeIds, hub, modes) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const Categories = homebridge.hap.Accessory.Categories;

    this.name = "Security System";
    this.uuid_base = hub.id;
    this.category = Categories.SECURITY_SYSTEM;
    this.homebridge = homebridge;
    this.logger = logger;
    this.scoutApi = scoutApi;
    this.hub = hub;
    this.modeIds = modeIds;
    this.locationId = hub.location_id;
    this.modeStates = {};

    modes.forEach(mode => {
        this.modeStates[mode.id] = mode.state;
    });

    let name = "Security System";
    let uuid = this.homebridge.hap.uuid.generate(hub.id);
    let category = this.homebridge.hap.Accessory.Categories.SECURITY_SYSTEM;
    let accessory = new this.homebridge.platformAccessory(name, uuid, category);

    accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, hub.type)
            .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, hub.reported.fw_version)
            .setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version);

    this.getCharacteristicValues().forEach((serviceValues, serviceType) => {
        let service = new serviceType(name);

        for (let characteristicType of serviceValues.keys()) {
            service.getCharacteristic(characteristicType).on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues().get(serviceType).get(characteristicType));
                } catch (e) {
                    callback(e);
                }
            });
        }

        accessory.addService(service);
    });

    this.accessory = accessory;

    accessory.getService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('set', (value, callback) => {
                this.setTargetState(value).then(() => callback()).catch(callback);
            });
}

Hub.prototype.identify = function(callback) {
    this.scoutApi.chirpHub(this.hub.id).then(() => callback()).catch(callback);
}

Hub.prototype.onHubEvent = function(event) {
    this.logger.info(`Hub [${event.id}] ${event.event} event fired.`);
    this.logger.debug(`Hub Event: ${JSON.stringify(event)}`);

    this.hub = event;

    this.updateValues();
}

Hub.prototype.onModeEvent = function(event) {
    this.logger.info(`Mode [${event.mode_id}] ${event.event} event fired.`);
    this.logger.debug(`Mode Event: ${JSON.stringify(event)}`);

    this.modeStates[event.mode_id] = event.event;

    this.updateValues();
}

Hub.prototype.updateValues = function() {
    let values = this.getCharacteristicValues();

    this.accessory.services.forEach(service => {
        let serviceValues = values.get(service.constructor);

        if (undefined === serviceValues) {
            return;
        }

        let characteristics = service.characteristics.concat(service.optionalCharacteristics);

        characteristics.forEach(characteristic => {
            let value = serviceValues.get(characteristic.constructor);

            if (undefined === value) {
                return;
            }

            service.getCharacteristic(characteristic.constructor).updateValue(value);
        });
    });
}

Hub.prototype.getCharacteristicValues = function() {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let values = new Map();
    let alarmedModeId = this.modeIds.filter(modeId => 'alarmed' == this.modeStates[modeId]).pop();
    let armedModeId = this.modeIds.filter(modeId => -1 < ['armed', 'triggered'].indexOf(this.modeStates[modeId])).pop();
    let armingModeId = this.modeIds.filter(modeId => 'arming' == this.modeStates[modeId]).pop();

    let currentState = alarmedModeId ? 4 : (armedModeId ? this.modeIds.indexOf(armedModeId) : 3);
    let targetState = alarmedModeId
            ? this.modeIds.indexOf(alarmedModeId)
            : (armingModeId ? this.modeIds.indexOf(armingModeId) : currentState);

    values.set(Service.SecuritySystem, new Map([
        [Characteristic.SecuritySystemCurrentState, currentState],
        [Characteristic.SecuritySystemTargetState, targetState],
    ]));

    let reported = this.hub.reported || {};

    if (reported.temperature && undefined !== reported.temperature.degrees) {
        values.set(Service.TemperatureSensor, new Map([[
            Characteristic.CurrentTemperature,
            reported.temperature.degrees,
        ]]));
    }

    let fault = 'active' === reported.status
            ? Characteristic.StatusFault.NO_FAULT
            : Characteristic.StatusFault.GENERAL_FAULT;

    values.forEach((serviceValues, serviceType) => {
        serviceValues.set(Characteristic.StatusFault, fault);
    });

    if (reported.battery && undefined !== reported.battery.level) {
        // This is a poor approximation. The observed max is ~5,
        // but it immediately drops to ~4 when the battery is in use.
        let batteryLevel = Math.min(reported.battery.level, MAX_BATTERY_LEVEL);
        batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);

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

    return values;
}

Hub.prototype.setTargetState = async function(value) {
    if (3 == value) {
        let targetModeId = this.modeIds.filter(modeId => {
            return -1 != ['alarmed', 'arming', 'armed'].indexOf(this.modeStates[modeId]);
        }).pop();

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, false);
        }
    } else {
        let targetModeId = this.modeIds[value];

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, true);
        } else {
            throw new Error(`No matching mode found for "${modeId}".`);
        }
    }
}

Hub.prototype.getAccessory = function() {
    return this.accessory;
}

module.exports = Hub;
