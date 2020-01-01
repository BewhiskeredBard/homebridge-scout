const SUPPORTED_DEVICE_TYPES = [
    'door_panel',
    'access_sensor',
    'motion_sensor',
    'water_sensors',
    'smoke_alarm',
];

function Device(homebridge, logger, device) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;

    this.homebridge = homebridge;
    this.logger = logger;
    this.locationId = device.location_id;
    this.deviceId = device.id;
    this.device = device;

    if (-1 == SUPPORTED_DEVICE_TYPES.indexOf(device.type)) {
        return;
    }

    let name = device.name;
    let uuid = this.homebridge.hap.uuid.generate(device.id);
    let accessory = new this.homebridge.platformAccessory(name, uuid, Categories.SENSOR);

    accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, device.reported.manufacturer)
            .setCharacteristic(Characteristic.Model, device.reported.model)
            .setCharacteristic(Characteristic.SerialNumber, device.id)
            .setCharacteristic(Characteristic.FirmwareRevision, device.reported.fw_version);

    this.getCharacteristicValues().forEach((serviceValues, serviceType) => {
        let service = new serviceType(name);

        for (let characteristicType of serviceValues.keys()) {
            this.autoUpdateValue(service, characteristicType);
        }

        accessory.addService(service);
    });

    this.accessory = accessory;
}

Device.prototype.onDeviceTrigger = function(event) {
    this.logger.info(`Device [${event.id}] ${event.event} event fired.`);
    this.logger.debug(`Device Event: ${JSON.stringify(event)}`);

    this.device = event;

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

Device.prototype.autoUpdateValue = function(service, characteristicType) {
    service.getCharacteristic(characteristicType)
            .on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues().get(service.constructor).get(characteristicType));
                } catch (e) {
                    callback(e);
                }
            });
}

Device.prototype.getCharacteristicValues = function() {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let reported = this.device.reported || {};
    let trigger = reported.trigger || {};
    let values = new Map();

    if (trigger.state) {
        switch (this.device.type) {
            case 'access_sensor':
            case 'door_panel':
                values.set(Service.ContactSensor, new Map([[
                    Characteristic.ContactSensorState,
                     'close' == trigger.state
                            ? Characteristic.ContactSensorState.CONTACT_DETECTED
                            : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                ]]));
                break;
            case 'motion_sensor':
                values.set(Service.MotionSensor, new Map([[
                    Characteristic.MotionDetected,
                    'motion_start' == trigger.state,
                ]]));
                break;
            case 'water_sensor':
                values.set(Service.LeakSensor, new Map([[
                    Characteristic.LeakDetected,
                    'dry' == trigger.state
                            ? Characteristic.LeakDetected.LEAK_NOT_DETECTED
                            : Characteristic.LeakDetected.LEAK_DETECTED,
                ]]));
                break;
            case 'smoke_alarm':
                values.set(Service.SmokeSensor, new Map([[
                    Characteristic.SmokeDetected,
                    'ok' == trigger.state.smoke
                            ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
                            : Characteristic.SmokeDetected.SMOKE_DETECTED,
                ]]));
                break;
        }
    }

    if ('smoke_alarm' !== this.device.type && reported.temperature && undefined !== reported.temperature.degrees) {
        values.set(Service.TemperatureSensor, new Map([[
            Characteristic.CurrentTemperature,
            reported.temperature.degrees,
        ]]));
    }

    if (reported.humidity && undefined !== reported.humidity.percent) {
        values.set(Service.HumiditySensor, new Map([[
            Characteristic.CurrentRelativeHumidity,
            reported.humidity.percent,
        ]]));
    }

    let isTimedOut = true === reported.timedout;

    values.forEach((serviceValues, serviceType) => {
        if (undefined !== trigger.tamper) {
            serviceValues.set(Characteristic.StatusTampered, trigger.tamper
                    ? Characteristic.StatusTampered.TAMPERED
                    : Characteristic.StatusTampered.NOT_TAMPERED);
        }

        if (!isTimedOut) {
            if (undefined !== reported.battery) {
                serviceValues.set(Characteristic.StatusLowBattery, undefined === reported.battery.low
                        ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
                        : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
            }
        }

        serviceValues.set(Characteristic.StatusFault, isTimedOut
                ? Characteristic.StatusFault.GENERAL_FAULT
                : Characteristic.StatusFault.NO_FAULT);
    });

    return values;
}

Device.prototype.getAccessory = function() {
    return this.accessory;
}

module.exports = Device;
