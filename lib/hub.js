const MAX_BATTERY_LEVEL = 5;

function Hub(homebridge, logger, scoutApi, modeIds, hub, modes) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const Categories = homebridge.hap.Accessory.Categories;

    let self = this;

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
    this.services = [];

    modes.forEach(mode => {
        self.modeStates[mode.id] = mode.state;
    });

    this.services.push(new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, hub.type)
            .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, hub.reported.fw_version)
            .setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version));

    let securitySystem = new Service.SecuritySystem();

    this.autoUpdateValue(securitySystem, Characteristic.SecuritySystemCurrentState);
    this.autoUpdateValue(securitySystem, Characteristic.SecuritySystemTargetState);

    securitySystem.getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('set', function(value, callback) {
                self.setTargetState(value).then(() => callback()).catch(callback);
            });

    let batteryService = new Service.BatteryService();

    this.autoUpdateValue(batteryService, Characteristic.BatteryLevel);
    this.autoUpdateValue(batteryService, Characteristic.ChargingState);
    this.autoUpdateValue(batteryService, Characteristic.StatusLowBattery);

    this.services.push(securitySystem);
    this.services.push(batteryService);
}

Hub.prototype.identify = function(callback) {
    this.scoutApi.chirpHub(this.hub.id).then(() => callback()).catch(callback);
}

Hub.prototype.onHubEvent = async function(hub) {
    this.hub = hub;

    await this.updateValues();
}

Hub.prototype.onModeEvent = async function(event) {
    this.modeStates[event.mode_id] = event.event;

    await this.updateValues();
}

Hub.prototype.updateValues = async function() {
    let values = await this.getCharacteristicValues();

    this.services.forEach(service => {
        let serviceValues = values[service.UUID];

        if (undefined === serviceValues) {
            return;
        }

        let characteristics = service.characteristics.concat(service.optionalCharacteristics);

        characteristics.forEach(characteristic => {
            let value = serviceValues[characteristic.UUID];

            if (undefined === value) {
                return;
            }

            service.getCharacteristic(characteristic.constructor).updateValue(value);
        });
    });
}

Hub.prototype.autoUpdateValue = function(service, characteristic) {
    let self = this;

    service.getCharacteristic(characteristic)
            .on('get', function(callback) {
                self.getCharacteristicValues()
                        .then(values => callback(null, values[service.UUID][characteristic.UUID]))
                        .catch(callback);
            });
}

Hub.prototype.getCharacteristicValues = async function() {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let self = this;

    let alarmedModeId = this.modeIds.filter(modeId => 'alarmed' == self.modeStates[modeId]).pop();
    let armedModeId = this.modeIds.filter(modeId => 'armed' == self.modeStates[modeId]).pop();
    let armingModeId = this.modeIds.filter(modeId => 'arming' == self.modeStates[modeId]).pop();

    let currentState = alarmedModeId ? 4 : (armedModeId ? this.modeIds.indexOf(armedModeId) : 3);
    let targetState = alarmedModeId
            ? this.modeIds.indexOf(alarmedModeId)
            : (armingModeId ? this.modeIds.indexOf(armingModeId) : currentState);

    // This is a poor approximation. The observed max is ~5,
    // but it immediately drops to ~4 when the battery is in use.
    let batteryLevel = Math.min(this.hub.reported.battery.level, MAX_BATTERY_LEVEL);
    batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);

    let chargingState = this.hub.reported.battery.active
            ? Characteristic.ChargingState.NOT_CHARGING
            : Characteristic.ChargingState.CHARGING;

    let lowBattery = this.hub.reported.battery.low
            ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
            : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    return {
        [Service.SecuritySystem.UUID]: {
            [Characteristic.SecuritySystemCurrentState.UUID]: currentState,
            [Characteristic.SecuritySystemTargetState.UUID]: targetState,
        },
        [Service.BatteryService.UUID]: {
            [Characteristic.BatteryLevel.UUID]: batteryLevel,
            [Characteristic.ChargingState.UUID]: chargingState,
            [Characteristic.StatusLowBattery.UUID]: lowBattery,
        },
    };
}

Hub.prototype.setTargetState = async function(value) {
    let self = this;

    if (3 == value) {
        let targetModeId = this.modeIds.filter(modeId => {
            return -1 != ['alarmed', 'arming', 'armed'].indexOf(self.modeStates[modeId]);
        }).pop();

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, false);
        }
    } else {
        let targetModeId = this.modeIds[value];

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, true);
        } else {
            throw new Error("No matching mode for " + modeId);
        }
    }
}

Hub.prototype.getServices = function() {
    return this.services;
};

module.exports = Hub;
