import type { CharacteristicValue } from 'homebridge';
import { DeviceType } from 'scout-api';
import { AccessoryContext } from '../../accessoryFactory';
import { SensorAccessoryContext } from '../../accessoryFactory/sensorAccessoryFactory';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { SensorServiceFactory } from './sensorServiceFactory';

export class TemperatureSensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (this.getTemperature(context) !== undefined) {
            return this.homebridge.api.hap.Service.TemperatureSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const temp = this.getTemperature(context);

        if (temp !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.CurrentTemperature, temp);
        }

        return characteristics;
    }

    private getTemperature(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        const device = context.custom.device;

        // The smoke alarm's temperature reading is entirely unreliable:
        // https://github.com/BewhiskeredBard/homebridge-scout/issues/13
        if (device.type === DeviceType.SmokeAlarm) {
            return;
        }

        return device.reported?.temperature?.degrees;
    }
}
