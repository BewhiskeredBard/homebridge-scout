import type { CharacteristicValue } from 'homebridge';
import { AccessoryContext } from '../../accessoryFactory';
import { SensorAccessoryContext } from '../../accessoryFactory/sensorAccessoryFactory';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { SensorServiceFactory } from './sensorServiceFactory';

export class HumiditySensorServiceFactory extends SensorServiceFactory {
    public getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined {
        if (undefined !== this.getHumidity(context)) {
            return this.homebridge.api.hap.Service.HumiditySensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = super.getCharacteristics(context);
        const humidity = this.getHumidity(context);

        if (humidity !== undefined) {
            characteristics.set(this.homebridge.api.hap.Characteristic.CurrentRelativeHumidity, humidity);
        }

        return characteristics;
    }

    private getHumidity(context: AccessoryContext<SensorAccessoryContext>): number | undefined {
        return context.custom.device.reported?.humidity?.percent;
    }
}
