import { EventEmitter } from "events";
import * as Hap from "./hap";
import * as Homebridge from "./homebridge";
import { ScoutApi } from "./scout-api";
import { Device, DeviceEvent, DeviceTriggerEvent, DevicePairEvent, DeviceEventType, DeviceType, AccessSensorState, DoorPanelState, MotionSensorState, WaterSensorState, SmokeState, SmokeAlarmState, ConnectionStateEvent, ConnectionState } from "scout-api";

const SUPPORTED_DEVICE_TYPES = new Set<DeviceType>([
    DeviceType.DoorPanel,
    DeviceType.AccessSensor,
    DeviceType.MotionSensor,
    DeviceType.WaterSensor,
    DeviceType.SmokeAlarm,
]);

interface Context {
    device: Device;
}

export class DeviceManager extends EventEmitter {
    private readonly accessories = new Map<string, Homebridge.PlatformAccessory>();
    private isConnected = false;

    constructor(
            private readonly homebridge: Homebridge.API,
            private readonly logger: Homebridge.Logger,
            private readonly api: ScoutApi,
            private readonly reverseSensorState: boolean) {
        super();
    }

    public isSupported(device: Device): boolean {
        return SUPPORTED_DEVICE_TYPES.has(device.type);
    }

    public createAccessory(device: Device): Homebridge.PlatformAccessory {
        const PlatformAccessory = this.homebridge.platformAccessory;

        const name = device.name;
        const uuid = this.homebridge.hap.uuid.generate(device.id);
        const accessory = new PlatformAccessory(name, uuid, Hap.Categories.SENSOR);

        (accessory.context as Context).device = device;

        return accessory;
    }

    public configureAccessory(accessory: Homebridge.PlatformAccessory): void {
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;

        const device = (accessory.context as Context).device;

        this.logger.info(`Configuring device [${device.id}] as accessory [${accessory.UUID}].`);

        accessory.getService(Service.AccessoryInformation)!
                .setCharacteristic(Characteristic.Manufacturer, device.reported?.manufacturer || "Scout")
                .setCharacteristic(Characteristic.Model, device.reported?.model || "unknown")
                .setCharacteristic(Characteristic.SerialNumber, device.id)
                .setCharacteristic(Characteristic.FirmwareRevision, device.reported?.fw_version || "unknown");

        const values = this.getCharacteristicValues(accessory);

        values.forEach((serviceValues, serviceType) => {
            this.addService(accessory, serviceType, [...serviceValues.keys()]);
        });

        const services = new Set([Service.AccessoryInformation]
                .concat(...values.keys())
                .map(service => service.UUID));

        accessory.services.forEach(service => {
            if (!services.has(service.UUID)) {
                accessory.removeService(service);
            }
        });

        this.accessories.set(device.id, accessory);
    }

    private addService(
            accessory: Homebridge.PlatformAccessory,
            serviceType: Hap.ServiceConstructor,
            characteristicTypes: Hap.CharacteristicConstructor<unknown>[]): Hap.Service {
        let service = accessory.getService(serviceType);

        if (!service) {
            service = accessory.addService(new serviceType());
        }

        characteristicTypes.forEach(characteristicType => {
            const characteristic = service!.getCharacteristic(characteristicType);

            if (0 == characteristic.listeners("get").length) {
                characteristic.on("get", (callback) => {
                    try {
                        callback(null, this.getCharacteristicValues(accessory).get(serviceType)!.get(characteristicType));
                    } catch (e) {
                        callback(e);
                    }
                });
            }
        });

        return service;
    }

    public onConnectionStateEvent(states: ConnectionStateEvent): void {
        this.isConnected = ConnectionState.Connected === states.current;
    }

    public async onDeviceEvent(event: DeviceEvent): Promise<void> {
        this.logger.info(`Device ${event.event} event fired.`);
        this.logger.debug(`Device Event: ${JSON.stringify(event)}`);

        let promise;

        switch (event.event) {
            case DeviceEventType.Triggered:
                promise = this.onDeviceTriggered(event as DeviceTriggerEvent);
                break;
            case DeviceEventType.Paired:
                promise = this.onDevicePaired(event as DevicePairEvent);
                break;
            case DeviceEventType.Unpaired:
                promise = this.onDeviceUnpaired(event as DevicePairEvent);
                break;
            default:
                return;
        }

        promise.catch(e => this.logger.error(e));
    }

    private async onDeviceTriggered(event: DeviceTriggerEvent): Promise<void> {
        let accessory = this.accessories.get(event.id);

        if (accessory) {
            accessory.context.device = event;

            this.getCharacteristicValues(accessory).forEach((serviceValues, serviceType) => {
                const service = this.addService(accessory!, serviceType, [...serviceValues.keys()]);

                serviceValues.forEach((value, characteristicType) => {
                    service.getCharacteristic(characteristicType).updateValue(value);
                });
            });
        } else {
            // If we haven"t seen the device before, it"s time to add it.
            accessory = this.createAccessory(event);

            this.configureAccessory(accessory);
            this.emit("paired", accessory);
        }
    }

    private async onDevicePaired(event: DevicePairEvent): Promise<void> {
        // The device is missing reported data when paired,
        // so we add it as an accesory when it triggers for the first time.
    }

    private async onDeviceUnpaired(event: DevicePairEvent): Promise<void> {
        const accessory = this.accessories.get(event.id);

        if (accessory) {
            this.accessories.delete(event.id);

            this.emit("unpaired", accessory);
        }
    }

    private getCharacteristicValues(accessory: Homebridge.PlatformAccessory): Map<Hap.ServiceConstructor, Map<Hap.CharacteristicConstructor<unknown>, Hap.CharacteristicValue>> {
        const Characteristic = this.homebridge.hap.Characteristic;
        const Service = this.homebridge.hap.Service;

        const device = (accessory.context as Context).device;
        const values = new Map<Hap.ServiceConstructor, Map<Hap.CharacteristicConstructor<unknown>, Hap.CharacteristicValue>>();

        if (device.reported?.trigger?.state !== undefined) {
            switch (device.type) {
                case DeviceType.AccessSensor:
                case DeviceType.DoorPanel:
                    values.set(Service.ContactSensor, new Map([[
                        Characteristic.ContactSensorState,
                        this.reverseState(AccessSensorState.Close == device.reported.trigger.state || DoorPanelState.Close == device.reported.trigger.state)
                            ? Characteristic.ContactSensorState.CONTACT_DETECTED
                            : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                    ]]));
                    break;
                case DeviceType.MotionSensor:
                    values.set(Service.MotionSensor, new Map([[
                        Characteristic.MotionDetected,
                        this.reverseState(MotionSensorState.Start == device.reported.trigger.state),
                    ]]));
                    break;
                case DeviceType.WaterSensor:
                    values.set(Service.LeakSensor, new Map([[
                        Characteristic.LeakDetected,
                        WaterSensorState.Dry == device.reported.trigger.state
                                ? Characteristic.LeakDetected.LEAK_NOT_DETECTED
                                : Characteristic.LeakDetected.LEAK_DETECTED,
                    ]]));
                    break;
                case DeviceType.SmokeAlarm:
                    values.set(Service.SmokeSensor, new Map([[
                        Characteristic.SmokeDetected,
                        SmokeState.Ok == (device.reported.trigger.state as SmokeAlarmState).smoke
                                ? Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
                                : Characteristic.SmokeDetected.SMOKE_DETECTED,
                    ]]));
                    break;
            }
        }

        if (device.reported?.temperature?.degrees !== undefined) {
            // The smoke alarm"s temperature reading is entirely unreliable:
            // https://github.com/jordanryanmoore/homebridge-scout/issues/13
            if (DeviceType.SmokeAlarm !== device.type) {
                values.set(Service.TemperatureSensor, new Map([[
                    Characteristic.CurrentTemperature,
                    device.reported.temperature.degrees,
                ]]));
            }
        }

        if (device.reported?.humidity?.percent !== undefined) {
            values.set(Service.HumiditySensor, new Map([[
                Characteristic.CurrentRelativeHumidity,
                device.reported.humidity.percent,
            ]]));
        }

        const isTimedOut = true === device.reported?.timedout;

        values.forEach((serviceValues, serviceType) => {
            if (undefined !== device.reported?.trigger?.tamper) {
                serviceValues.set(Characteristic.StatusTampered, device.reported.trigger.tamper
                        ? Characteristic.StatusTampered.TAMPERED
                        : Characteristic.StatusTampered.NOT_TAMPERED);
            }

            if (!isTimedOut) {
                if (undefined !== device.reported?.battery) {
                    serviceValues.set(Characteristic.StatusLowBattery, undefined === device.reported.battery.low
                            ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
                            : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                }
            }

            serviceValues.set(Characteristic.StatusFault, isTimedOut || !this.isConnected
                    ? Characteristic.StatusFault.GENERAL_FAULT
                    : Characteristic.StatusFault.NO_FAULT);
        });

        return values;
    }

    private reverseState(state: boolean): boolean {
        return 1 == (Number(state) ^ Number(this.reverseSensorState));
    }
}
