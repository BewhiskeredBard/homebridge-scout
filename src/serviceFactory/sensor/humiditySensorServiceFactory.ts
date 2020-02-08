import { SensorServiceFactory } from "./sensorServiceFactory";
import { ServiceConstructor, CharacteristicConstructor, CharacteristicValue } from "../../types";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";

export class HumiditySensorServiceFactory extends SensorServiceFactory {
    public constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

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
