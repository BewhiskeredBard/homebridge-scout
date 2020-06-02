import type { CharacteristicValue } from 'homebridge';
import { Device, DeviceType, WaterSensorState } from 'scout-api';
import { AccessoryContext } from '../../accessoryFactory';
import { SensorAccessoryContext } from '../../accessoryFactory/sensorAccessoryFactory';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { SensorServiceFactory } from './sensorServiceFactory';

export class LeakSensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.getSensorState(context)) {
            return this.homebridge.api.hap.Service.LeakSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const state = this.getSensorState(context);

        if (state !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.LeakDetected, state);
        }

        return characteristics;
    }

    private getSensorState(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        const LeakDetected = this.homebridge.api.hap.Characteristic.LeakDetected;

        switch (this.getDeviceState(context.custom.device)) {
            case WaterSensorState.Dry:
                return LeakDetected.LEAK_NOT_DETECTED;
            case WaterSensorState.Wet:
                return LeakDetected.LEAK_DETECTED;
        }
    }

    private getDeviceState(device: Device): WaterSensorState | undefined {
        if (device.type === DeviceType.WaterSensor) {
            return device?.reported?.trigger?.state as WaterSensorState;
        }
    }
}
