import type { CharacteristicValue } from 'homebridge';
import { CoState, Device, DeviceType, SmokeAlarmState } from 'scout-api';
import { AccessoryContext } from '../../accessoryFactory';
import { SensorAccessoryContext } from '../../accessoryFactory/sensorAccessoryFactory';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { SensorServiceFactory } from './sensorServiceFactory';

export class CarbonMonoxideSensorFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.getSensorState(context)) {
            return this.homebridge.api.hap.Service.CarbonMonoxideSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const state = this.getSensorState(context);

        if (state !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.CarbonMonoxideDetected, state);
        }

        return characteristics;
    }

    private getSensorState(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        const CarbonMonoxideDetected = this.homebridge.api.hap.Characteristic.CarbonMonoxideDetected;

        switch (this.getDeviceState(context.custom.device)) {
            case CoState.Ok:
                return CarbonMonoxideDetected.CO_LEVELS_NORMAL;
            case CoState.Emergency:
            case CoState.Testing:
                return CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
        }
    }

    private getDeviceState(device: Device): CoState | undefined {
        if (device.type === DeviceType.SmokeAlarm) {
            return (device?.reported?.trigger?.state as SmokeAlarmState)?.co;
        }
    }
}
