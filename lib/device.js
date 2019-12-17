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
        smoke_alarm: [
            Service.SmokeSensor,
            // Temperature is currently buggy // Service.TemperatureSensor,
        ],
    };
    
    this.homebridge = homebridge;
    this.logger = logger;
    this.name = device.name;
    this.uuid_base = device.id;
    this.category = this.getCategory(device.type);
    this.locationId = device.location_id;
    this.deviceId = device.id;
    this.device = device;
    this.services = [];

    let self = this;
    let servicesTypes = SERVICES[device.type];

    if (undefined === servicesTypes) {
        return;
    }

    this.services.push(new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, device.reported.manufacturer)
            .setCharacteristic(Characteristic.Model, device.reported.model)
            .setCharacteristic(Characteristic.SerialNumber, device.id)
            .setCharacteristic(Characteristic.FirmwareRevision, device.reported.fw_version));

    servicesTypes.forEach(serviceType => {
        let service = new serviceType();
        let characteristics = [
            Characteristic.StatusTampered,
            Characteristic.StatusLowBattery,
        ];

        switch (serviceType) {
            case Service.ContactSensor:
                characteristics.push(Characteristic.ContactSensorState);
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
            self.autoUpdateValue(service, characteristic);
        });

        self.services.push(service);
    });
}

Device.prototype.getCategory = function(deviceType) {
    const Categories = this.homebridge.hap.Accessory.Categories;

    switch (deviceType) {
        case 'door_panel':
        case 'access_sensor':
        case 'smoke_alarm':
            return Categories.SENSOR;
        default:
            return Categories.OTHER;
    }
}

Device.prototype.onDeviceEvent = async function(device) {
    this.device = device;

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

Device.prototype.autoUpdateValue = function(service, characteristic) {
    let self = this;

    service.getCharacteristic(characteristic)
            .on('get', function(callback) {
                self.getCharacteristicValues()
                        .then(values => callback(null, values[service.UUID][characteristic.UUID]))
                        .catch(callback);
            });
}

Device.prototype.getCharacteristicValues = async function() {
    const Service = this.homebridge.hap.Service;
    const Characteristic = this.homebridge.hap.Characteristic;

    let device = this.device;
    let values = {};

    this.services.forEach(service => {
        let characteristics = {};

        switch (service.constructor) {
            case Service.TemperatureSensor:
                characteristics = {
                    [Characteristic.CurrentTemperature.UUID]: device.reported.temperature.degrees,
                };
                break;
            case Service.ContactSensor:
                characteristics = {
                    [Characteristic.ContactSensorState.UUID]: 'close' == device.reported.trigger.state
                            ? Characteristic.ContactSensorState.CONTACT_DETECTED
                            : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                };
                break;
            case Service.HumiditySensor:
                characteristics = {
                    [Characteristic.CurrentRelativeHumidity.UUID]: device.reported.humidity.percent,
                };
                break;
            case Service.SmokeSensor:
                characteristics = {
                    [Characteristic.SmokeDetected.UUID]: 'ok' == device.reported.trigger.state.smoke
                            ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
                            : Characteristic.SmokeDetected.SMOKE_DETECTED,
                };
                break;
        }

        if (Service.AccessoryInformation != service.constructor) {
            characteristics[Characteristic.StatusLowBattery.UUID] = undefined === device.reported.battery.low
                    ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
                    : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

            characteristics[Characteristic.StatusTampered.UUID] = device.reported.trigger.tamper
                    ? Characteristic.StatusTampered.TAMPERED
                    : Characteristic.StatusTampered.NOT_TAMPERED;
        }

        values[service.UUID] = characteristics;
    });

    return values;
}

Device.prototype.getServices = function() {
    return this.services;
};

module.exports = Device;
