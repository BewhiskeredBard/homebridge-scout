import { AccessSensorState, Device, DeviceEvent, DeviceType, DoorPanelState } from "scout-api";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { SensorServiceFactory } from "./sensorServiceFactory";

export class ContactSensorServiceFactory extends SensorServiceFactory {
    public constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.getSensorState(context)) {
            return this.homebridge.api.hap.Service.ContactSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const state = this.getSensorState(context);

        if (state !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.ContactSensorState, state);
        }

        return characteristics;
    }

    private getSensorState(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        const ContactSensorState = this.homebridge.api.hap.Characteristic.ContactSensorState;

        const device = context.custom.device;
        let isContactDetected: boolean | undefined;

        switch (this.getDeviceState(device)) {
            case AccessSensorState.Open:
            case DoorPanelState.Open:
                isContactDetected = false;
                break;
            case AccessSensorState.Close:
            case DoorPanelState.Close:
                isContactDetected = true;
                break;
        }

        if (isContactDetected !== undefined) {
            if (this.shouldReverseSensorState(device)) {
                isContactDetected = !isContactDetected;
            }

            return isContactDetected ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED;
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
    private shouldReverseSensorState(device: Device): boolean {
        return true === this.homebridge.config.reverseSensorState && this.isDeviceEvent(device);
    }

    private isDeviceEvent(device: Device | DeviceEvent): device is DeviceEvent {
        return "event" in device;
    }
}
