import { AccessSensorState, Device, DeviceEvent, DeviceType, DoorPanelState } from "scout-api";
import { AccessoryContext } from "../../accessoryFactory";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { SensorServiceFactory } from "./sensorServiceFactory";

export class ContactSensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.isContactDetected(context)) {
            return this.homebridge.api.hap.Service.ContactSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);

        this.withContactSensorState(characteristics, context);

        return characteristics;
    }

    private withContactSensorState(
        characteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>,
        context: AccessoryContext<SensorAccessoryContext>,
    ): void {
        const ContactSensorState = this.homebridge.api.hap.Characteristic.ContactSensorState;

        let isContactDetected = this.isContactDetected(context);

        if (isContactDetected !== undefined) {
            if (this.shouldReverseSensorState(context)) {
                isContactDetected = !isContactDetected;
            }

            characteristics.set(ContactSensorState, isContactDetected ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED);
        }
    }

    private isContactDetected(context: AccessoryContext<SensorAccessoryContext>): boolean | undefined {
        switch (this.getDeviceState(context.custom.device)) {
            case AccessSensorState.Open:
            case DoorPanelState.Open:
                return false;
            case AccessSensorState.Close:
            case DoorPanelState.Close:
                return true;
        }
    }

    private getDeviceState(device: Device): AccessSensorState | DoorPanelState | undefined {
        switch (device.type) {
            case DeviceType.AccessSensor:
                return device?.reported?.trigger?.state as AccessSensorState;
            case DeviceType.DoorPanel:
                return device?.reported?.trigger?.state as DoorPanelState;
        }
    }

    /**
     * Scout systems that are inversely reporting contact sensor state only do so for device events,
     * not for calls to the Scout API. Thus, the sensor state should only be reversed if:
     *
     * 1) The configuration option is enabled.
     * AND
     * 2) The current context data is from a DeviceEvent, not the original Device data.
     */
    private shouldReverseSensorState(context: AccessoryContext<SensorAccessoryContext>): boolean {
        return true === this.homebridge.config.reverseSensorState && this.isDeviceEvent(context.custom.device);
    }

    private isDeviceEvent(device: Device | DeviceEvent): device is DeviceEvent {
        return "event" in device;
    }
}
