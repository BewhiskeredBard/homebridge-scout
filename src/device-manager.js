import { EventEmitter } from 'events';
import * as util from 'util';

const SUPPORTED_DEVICE_TYPES = [
    'door_panel',
    'access_sensor',
    'motion_sensor',
    'water_sensors',
    'smoke_alarm',
];

export function DeviceManager(homebridge, logger, api, reverseSensorState) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.api = api;
    this.reverseSensorState = !!reverseSensorState;
    this.accessories = new Map();
};

util.inherits(DeviceManager, EventEmitter);

DeviceManager.prototype.isSupported = function(device) {
    return -1 !== SUPPORTED_DEVICE_TYPES.indexOf(device.type);
};

DeviceManager.prototype.createAccessory = function(device) {
    const Categories = this.homebridge.hap.Accessory.Categories;
    const PlatformAccessory = this.homebridge.platformAccessory;

    let name = device.name;
    let uuid = this.homebridge.hap.uuid.generate(device.id);
    let accessory = new PlatformAccessory(name, uuid, Categories.SENSOR);

    accessory.context.device = device;

    return accessory;
};

DeviceManager.prototype.configureAccessory = function(accessory) {
    const Service = this.homebridge.hap.Service;
    const Characteristic = this.homebridge.hap.Characteristic;

    let device = accessory.context.device;

    this.logger.info(`Configuring device [${device.id}] as accessory [${accessory.UUID}].`);

    accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, device.reported.manufacturer || 'Scout')
            .setCharacteristic(Characteristic.Model, device.reported.model || 'unknown')
            .setCharacteristic(Characteristic.SerialNumber, device.id)
            .setCharacteristic(Characteristic.FirmwareRevision, device.reported.fw_version);

    let values = this.getCharacteristicValues(accessory);

    values.forEach((serviceValues, serviceType) => {
        this.addService(accessory, serviceType, [...serviceValues.keys()]);
    });

    let services = new Set([Service.AccessoryInformation]
            .concat(...values.keys())
            .map(service => service.UUID));

    accessory.services.forEach(service => {
        if (!services.has(service.UUID)) {
            accessory.removeService(service);
        }
    });

    this.accessories.set(device.id, accessory);
};

DeviceManager.prototype.addService = function(accessory, serviceType, characteristicTypes) {
    let service = accessory.getService(serviceType);

    if (!service) {
        service = accessory.addService(new serviceType(accessory.displayName));
    }

    characteristicTypes.forEach(characteristicType => {
        let characteristic = service.getCharacteristic(characteristicType);

        if (0 == characteristic.listeners('get').length) {
            characteristic.on('get', (callback) => {
                try {
                    callback(null, this.getCharacteristicValues(accessory).get(serviceType).get(characteristicType));
                } catch (e) {
                    callback(e);
                }
            });
        }
    });

    return service;
};

DeviceManager.prototype.onDeviceEvent = function(event) {
    this.logger.info(`Device [${event.id}] ${event.event} event fired.`);
    this.logger.debug(`Device Event: ${JSON.stringify(event)}`);

    let promise;

    switch (event.event) {
        case 'triggered':
            promise = this.onDeviceTriggered(event);
            break;
        case 'paired':
            promise = this.onDevicePaired(event);
            break;
        case 'unpaired':
            promise = this.onDeviceUnpaired(event);
            break;
        default:
            return;
    }

    promise.catch(e => this.logger.error(e));
};

DeviceManager.prototype.onDeviceTriggered = async function(event) {
    let accessory = this.accessories.get(event.id);

    if (accessory) {
        accessory.context.device = event;

        this.getCharacteristicValues(accessory).forEach((serviceValues, serviceType) => {
            let service = this.addService(accessory, serviceType, [...serviceValues.keys()]);

            serviceValues.forEach((value, characteristicType) => {
                service.getCharacteristic(characteristicType).updateValue(value);
            });
        });
    } else {
        // If we haven't seen the device before, it's time to add it.
        accessory = this.createAccessory(event);

        this.configureAccessory(accessory);
        this.emit('paired', accessory);
    }
};

DeviceManager.prototype.onDevicePaired = async function(event) {
    // The device is missing reported data when paired,
    // so we add it as an accesory when it triggers for the first time.
};

DeviceManager.prototype.onDeviceUnpaired = async function(event) {
    let accessory = this.accessories.get(event.id);

    if (accessory) {
        this.accessories.delete(event.id);

        this.emit('unpaired', accessory);
    }
};

DeviceManager.prototype.getCharacteristicValues = function(accessory) {
    const Characteristic = this.homebridge.hap.Characteristic;
    const Service = this.homebridge.hap.Service;

    let device = accessory.context.device;
    let reported = device.reported || {};
    let trigger = reported.trigger || {};
    let values = new Map();

    if (trigger.state) {
        switch (device.type) {
            case 'access_sensor':
            case 'door_panel':
                values.set(Service.ContactSensor, new Map([[
                    Characteristic.ContactSensorState,
                    (1 == (('close' == trigger.state) ^ this.reverseSensorState))
                        ? Characteristic.ContactSensorState.CONTACT_DETECTED
                        : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                ]]));
                break;
            case 'motion_sensor':
                values.set(Service.MotionSensor, new Map([[
                    Characteristic.MotionDetected,
                    1 == (('motion_start' == trigger.state) ^ this.reverseSensorState),
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

    if (reported.temperature && undefined !== reported.temperature.degrees) {
        // The smoke alarm's temperature reading is entirely unreliable:
        // https://github.com/jordanryanmoore/homebridge-scout/issues/13
        if ('smoke_alarm' !== device.type) {
            values.set(Service.TemperatureSensor, new Map([[
                Characteristic.CurrentTemperature,
                reported.temperature.degrees,
            ]]));
        }
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
