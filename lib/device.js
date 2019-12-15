function Device(homebridge, logger, scoutApi, device) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const SERVICES = {
        door_panel: [
            Service.AccessoryInformation,
            Service.ContactSensor,
            Service.TemperatureSensor,
            Service.HumiditySensor,
        ],
        access_sensor: [
            Service.AccessoryInformation,
            Service.ContactSensor,
            Service.TemperatureSensor,
        ],
        smoke_alarm: [
            Service.AccessoryInformation,
            Service.SmokeSensor,
            // Temperature is currently buggy // Service.TemperatureSensor,
        ],
    };
    
    this.homebridge = homebridge;
    this.logger = logger;
    this.scoutApi = scoutApi;
    this.name = device.name;
    this.uuid_base = device.id;
    this.category = this.getCategory(device.type);
    this.locationId = device.location_id;
    this.deviceId = device.id;
    this.services = [];

    let self = this;
    let servicesTypes = SERVICES[device.type];

    if (undefined === servicesTypes) {
        return;
    }

    servicesTypes.forEach(serviceType => {
        let service = new serviceType();
        let characteristics = [];

        switch (serviceType) {
            case Service.AccessoryInformation:
                characteristics = [
                    Characteristic.Manufacturer,
                    Characteristic.Model,
                    Characteristic.FirmwareRevision,
                ];
                break;
            case Service.ContactSensor:
                characteristics = [Characteristic.ContactSensorState];
                break;
            case Service.SmokeSensor:
                characteristics = [Characteristic.SmokeDetected];
                break;
            case Service.TemperatureSensor:
                characteristics = [Characteristic.CurrentTemperature];
                break;
            case Service.HumiditySensor:
                characteristics = [Characteristic.CurrentRelativeHumidity];
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

Device.prototype.onDeviceEvent = async function(data) {
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

    let devices = await this.scoutApi.getLocationDevices(this.locationId);
    let device = devices.filter(device => device.id == this.deviceId).pop();
    let values = {};

    this.services.forEach(service => {
        let characteristics = {};

        switch (service.constructor) {
            case Service.AccessoryInformation:
                characteristics = {
                    [Characteristic.Manufacturer.UUID]: device.reported.manufacturer,
                    [Characteristic.Model.UUID]: device.reported.model,
                    [Characteristic.FirmwareRevision.UUID]: device.reported.fw_version,
                };
                break;
            case Service.TemperatureSensor:
                characteristics = {
                    [Characteristic.CurrentTemperature.UUID]: device.reported.temperature.degrees,
                };
                break;
            case Service.ContactSensor:
                characteristics = {
                    [Characteristic.ContactSensorState.UUID]: 'close' == device.reported.trigger.state ? 0 : 1,
                };
                break;
            case Service.HumiditySensor:
                characteristics = {
                    [Characteristic.CurrentRelativeHumidity.UUID]: device.reported.humidity.percent,
                };
                break;
            case Service.SmokeSensor:
                characteristics = {
                    [Characteristic.SmokeDetected.UUID]: 'ok' != device.reported.trigger.state.smoke,
                };
                break;
        }

        values[service.UUID] = characteristics;
    });

    return values;
}

Device.prototype.getServices = function() {
    return this.services;
};

module.exports = Device;
