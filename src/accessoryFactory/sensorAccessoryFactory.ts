import { Device, DeviceType, DeviceEventType, DeviceTriggerEvent, DevicePairEvent, LocationEventType } from 'scout-api';
import { AccessoryFactory, AccessoryInfo, TypedPlatformAccessory } from '../accessoryFactory';
import { ScoutPlatformPlugin } from '../scoutPlatformPlugin';

export interface SensorAccessoryContext {
    device: Device;
}

export class SensorAccessoryFactory extends AccessoryFactory<SensorAccessoryContext> {
    private static readonly SUPPORTED_DEVICE_TYPES = new Set<DeviceType>([
        DeviceType.DoorPanel,
        DeviceType.AccessSensor,
        DeviceType.MotionSensor,
        DeviceType.WaterSensor,
        DeviceType.SmokeAlarm,
    ]);

    private readonly accessories = new Map<string, TypedPlatformAccessory<SensorAccessoryContext>>();

    public configureAccessory(accessory: TypedPlatformAccessory<SensorAccessoryContext>): void {
        super.configureAccessory(accessory);

        this.accessories.set(accessory.context.custom.device.id, accessory);
    }

    protected async createAccessoryInfo(locationId: string): Promise<AccessoryInfo<SensorAccessoryContext>[]> {
        const devices = (await this.scout.api.getDevices(locationId)).data;

        this.homebridge.logger.debug(`Devices: ${JSON.stringify(devices)}`);

        return devices.filter(device => this.isSupportedDevice(device)).map(device => this.createDeviceAccessoryInfo(device));
    }

    protected isSupportedDevice(device: Device): boolean {
        if (!SensorAccessoryFactory.SUPPORTED_DEVICE_TYPES.has(device.type)) {
            return false;
        }

        // Scout's original mesh-based motion sensors do not properly trigger motion events.
        // See https://github.com/jordanryanmoore/homebridge-scout/issues/51 for more details.
        if (DeviceType.MotionSensor === device.type && undefined !== device.reported?.mesh_address) {
            return false;
        }

        return true;
    }

    protected createDeviceAccessoryInfo(device: Device): AccessoryInfo<SensorAccessoryContext> {
        return {
            name: device.name,
            id: device.id,
            category: this.homebridge.api.hap.Categories.SENSOR,
            context: {
                device,
            },
            manufacturer: device.reported?.manufacturer || 'Scout',
            model: device.reported?.model || 'unknown',
            serialNumber: device.id,
            firmwareRevision: device.reported?.fw_version || 'unknown',
        };
    }

    protected addLocationListeners(): void {
        this.scout.listener.on(LocationEventType.DeviceTrigger, event => {
            this.onDeviceTriggerEvent(event);
        });

        this.scout.listener.on(LocationEventType.DevicePair, event => {
            this.onDevicePairEvent(event);
        });
    }

    protected onDeviceTriggerEvent(event: DeviceTriggerEvent): void {
        let accessory = this.accessories.get(event.id);

        this.homebridge.logger.debug(`Device trigger event: ${JSON.stringify(event)}`);

        if (accessory) {
            accessory.context.custom.device = event;

            this.updateAccessory(accessory);
        } else {
            accessory = this.createAccessory(event.location_id, this.createDeviceAccessoryInfo(event));

            this.configureAccessory(accessory);

            this.homebridge.api.registerPlatformAccessories(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [accessory]);
        }
    }

    protected onDevicePairEvent(event: DevicePairEvent): void {
        const accessory = this.accessories.get(event.id);

        this.homebridge.logger.debug(`Device pair event: ${JSON.stringify(event)}`);

        if (accessory && event.event === DeviceEventType.Unpaired) {
            this.homebridge.api.unregisterPlatformAccessories(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, [accessory]);

            this.accessories.delete(event.id);
        }
    }
}
