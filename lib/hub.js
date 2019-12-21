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

    new Map([
        [Service.SecuritySystem, [
            Characteristic.SecuritySystemCurrentState,
            Characteristic.SecuritySystemTargetState,
            Characteristic.StatusFault,
        ]],
        [Service.BatteryService, [
            Characteristic.BatteryLevel,
            Characteristic.ChargingState,
            Characteristic.StatusLowBattery,
        ]],
        [Service.TemperatureSensor, [
            Characteristic.CurrentTemperature,
            Characteristic.StatusLowBattery,
            Characteristic.StatusFault,
        ]]
    ]).forEach((characteristics, serviceType) => {
        let service = accessory.addService(serviceType, name);

        characteristics.forEach(characteristicType => {
            service.getCharacteristic(characteristicType).on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues()[serviceType.UUID][characteristicType.UUID]);
                } catch (e) {
                    callback(e);
                }
            });
        });
    });

    accessory.getService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('set', (value, callback) => {
                this.setTargetState(value).then(() => callback()).catch(callback);
            });

    this.accessories = [accessory];
}

Hub.prototype.identify = function(callback) {
    this.scoutApi.chirpHub(this.hub.id).then(() => callback()).catch(callback);
}

Hub.prototype.onHubEvent = function(hub) {
    this.hub = hub;

    this.updateValues();
}

Hub.prototype.onModeEvent = function(event) {
    this.modeStates[event.mode_id] = event.event;

    this.updateValues();
}

Hub.prototype.updateValues = function() {
    let values = this.getCharacteristicValues();

    this.accessories.forEach(accessory => {
        accessory.services.forEach(service => {
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
    });
}

Hub.prototype.getCharacteristicValues = function() {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let alarmedModeId = this.modeIds.filter(modeId => 'alarmed' == this.modeStates[modeId]).pop();
    let armedModeId = this.modeIds.filter(modeId => 'armed' == this.modeStates[modeId]).pop();
    let armingModeId = this.modeIds.filter(modeId => 'arming' == this.modeStates[modeId]).pop();

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

    let fault = 'active' !== this.hub.reported.status
            ? Characteristic.StatusFault.NO_FAULT
            : Characteristic.StatusFault.GENERAL_FAULT;

    return {
        [Service.SecuritySystem.UUID]: {
            [Characteristic.SecuritySystemCurrentState.UUID]: currentState,
            [Characteristic.SecuritySystemTargetState.UUID]: targetState,
            [Characteristic.StatusFault.UUID]: fault,
        },
        [Service.BatteryService.UUID]: {
            [Characteristic.BatteryLevel.UUID]: batteryLevel,
            [Characteristic.ChargingState.UUID]: chargingState,
            [Characteristic.StatusLowBattery.UUID]: lowBattery,
        },
        [Service.TemperatureSensor.UUID]: {
            [Characteristic.CurrentTemperature.UUID]: this.hub.reported.temperature,
            [Characteristic.StatusFault.UUID]: fault,
        },
    };
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
            throw new Error("No matching mode for " + modeId);
        }
    }
}

Hub.prototype.getAccessories = function() {
    return this.accessories;
}

module.exports = Hub;
