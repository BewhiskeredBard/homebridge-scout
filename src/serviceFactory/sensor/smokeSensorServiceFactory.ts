import { Device, DeviceType, SmokeAlarmState, SmokeState } from "scout-api";
import { AccessoryContext } from "../../accessoryFactory";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { SensorServiceFactory } from "./sensorServiceFactory";

export class SmokeSensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.getSensorState(context)) {
            return this.homebridge.api.hap.Service.SmokeSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const state = this.getSensorState(context);

        if (state !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.SmokeDetected, state);
        }

        return characteristics;
    }

    private getSensorState(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        const SmokeDetected = this.homebridge.api.hap.Characteristic.SmokeDetected;

        switch (this.getDeviceState(context.custom.device)) {
            case SmokeState.Ok:
            case SmokeState.Testing:
                return SmokeDetected.SMOKE_NOT_DETECTED;
            case SmokeState.Emergency:
                return SmokeDetected.SMOKE_DETECTED;
        }
    }

    private getDeviceState(device: Device): SmokeState | undefined {
        if (device.type === DeviceType.SmokeAlarm) {
            return (device?.reported?.trigger?.state as SmokeAlarmState).smoke;
        }
    }
}
