import { Device, AccessSensorState, DoorPanelState, DeviceType } from "scout-api";
import { SensorServiceFactory } from "./sensorServiceFactory";
import { ServiceConstructor, CharacteristicConstructor, CharacteristicValue } from "../../types";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";

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

        let isContactDetected: boolean | undefined;

        switch (this.getDeviceState(context.custom.device)) {
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
            if (this.homebridge.config.reverseSensorState) {
                isContactDetected = !isContactDetected;
            }

            return isContactDetected ? ContactSensorState.CONTACT_DETECTED : ContactSensorState.CONTACT_NOT_DETECTED;
        }
    }

    private getDeviceState(device: Device): AccessSensorState | DoorPanelState | undefined {
        switch (device.type) {
            case DeviceType.AccessSensor:
                return (device?.reported?.trigger?.state as AccessSensorState);
            case DeviceType.DoorPanel:
                return (device?.reported?.trigger?.state as DoorPanelState);
        }
    }
}
