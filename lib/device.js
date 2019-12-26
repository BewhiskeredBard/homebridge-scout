function Device(homebridge, logger, device) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const SERVICES = {
        door_panel: [
            Service.ContactSensor,
            Service.TemperatureSensor,
            Service.HumiditySensor,
        ],
        access_sensor: [
            Service.ContactSensor,
            Service.TemperatureSensor,
        ],
        motion_sensor: [
            Service.MotionSensor,
        ],
        smoke_alarm: [
            Service.SmokeSensor,
            // Temperature is currently buggy // Service.TemperatureSensor,
        ],
    };
    
    this.homebridge = homebridge;
    this.logger = logger;
    this.locationId = device.location_id;
    this.deviceId = device.id;
    this.device = device;
    this.accessories = [];

    let servicesTypes = SERVICES[device.type] || [];

    if (0 == servicesTypes.length) {
        return;
    }

    let name = device.name;
    let uuid = this.homebridge.hap.uuid.generate(device.id);
    let category = this.getCategory(device.type);
    let accessory = new this.homebridge.platformAccessory(name, uuid, category);

    accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, device.reported.manufacturer)
            .setCharacteristic(Characteristic.Model, device.reported.model)
            .setCharacteristic(Characteristic.SerialNumber, device.id)
            .setCharacteristic(Characteristic.FirmwareRevision, device.reported.fw_version);

    servicesTypes.forEach(serviceType => {
        let service = new serviceType(name);
        let characteristics = [
            Characteristic.StatusTampered,
            Characteristic.StatusLowBattery,
            Characteristic.StatusFault,
        ];

        switch (serviceType) {
            case Service.ContactSensor:
                characteristics.push(Characteristic.ContactSensorState);
                break;
            case Service.MotionSensor:
                characteristics.push(Characteristic.MotionDetected);
                break;
            case Service.SmokeSensor:
                characteristics.push(Characteristic.SmokeDetected);
                break;
            case Service.TemperatureSensor:
                characteristics.push(Characteristic.CurrentTemperature);
                break;
            case Service.HumiditySensor:
                characteristics.push(Characteristic.CurrentRelativeHumidity);
                break;
        }

        characteristics.forEach(characteristic => {
            this.autoUpdateValue(service, characteristic);
        });

        accessory.addService(service);
    });

    this.accessories.push(accessory);
}

Device.prototype.getCategory = function(deviceType) {
    const Categories = this.homebridge.hap.Accessory.Categories;

    switch (deviceType) {
        case 'door_panel':
        case 'access_sensor':
        case 'motion_sensor':
        case 'smoke_alarm':
            return Categories.SENSOR;
        default:
            return Categories.OTHER;
    }
}

Device.prototype.onDeviceTrigger = function(device) {
    this.device = device;

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

Device.prototype.autoUpdateValue = function(service, characteristic) {
    service.getCharacteristic(characteristic)
            .on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues()[service.UUID][characteristic.UUID]);
                } catch (e) {
                    callback(e);
                }
            });
}

Device.prototype.getCharacteristicValues = function() {
    const Service = this.homebridge.hap.Service;
    const Characteristic = this.homebridge.hap.Characteristic;

    let reported = this.device.reported || {};
    let values = {};

    this.accessories.forEach(accessory => {
        accessory.services.forEach(service => {
            let trigger = reported.trigger || {};
            let characteristics = {};

            switch (service.constructor) {
                case Service.TemperatureSensor:
                    characteristics = {
                        [Characteristic.CurrentTemperature.UUID]: (reported.temperature || {}).degrees,
                    };
                    break;
                case Service.ContactSensor:
                    if (undefined !== trigger.state) {
                        characteristics = {
                            [Characteristic.ContactSensorState.UUID]: 'close' == trigger.state
                                    ? Characteristic.ContactSensorState.CONTACT_DETECTED
                                    : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                        };
                    }
                    break;
                case Service.MotionSensor:
                    if (undefined !== trigger.state) {
                        characteristics = {
                            [Characteristic.MotionDetected.UUID]: 'motion_start' == device.reported.trigger.state,
                        };
                    }
                    break;
                case Service.HumiditySensor:
                    characteristics = {
                        [Characteristic.CurrentRelativeHumidity.UUID]: (reported.humidity || {}).percent,
                    };
                    break;
                case Service.SmokeSensor:
                    if (undefined !== trigger.state) {
                        characteristics = {
                            [Characteristic.SmokeDetected.UUID]: 'ok' == trigger.state.smoke
                                    ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
                                    : Characteristic.SmokeDetected.SMOKE_DETECTED,
                        };
                    }
                    break;
            }

            if (Service.AccessoryInformation != service.constructor) {
                let isTimedOut = true === reported.timedout;
                let lowBatteryStatus = undefined;

                if (!isTimedOut) {
                    lowBatteryStatus = undefined === (reported.battery || {}).low
                            ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
                            : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
                }

                characteristics[Characteristic.StatusLowBattery.UUID] = lowBatteryStatus;

                characteristics[Characteristic.StatusTampered.UUID] = trigger.tamper
                        ? Characteristic.StatusTampered.TAMPERED
                        : Characteristic.StatusTampered.NOT_TAMPERED;

                characteristics[Characteristic.StatusFault.UUID] = isTimedOut
                        ? Characteristic.StatusFault.GENERAL_FAULT
                        : Characteristic.StatusFault.NO_FAULT;
            }

            values[service.UUID] = characteristics;
        });
    });

    return values;
}

Device.prototype.getAccessories = function() {
    return this.accessories;
}

module.exports = Device;
