import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";
import { HubServiceFactory } from "./hubServiceFactory";

export class TemperatureServiceFactory extends HubServiceFactory {
    public constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined {
        if (undefined !== this.getTemperature(context)) {
            return this.homebridge.api.hap.Service.TemperatureSensor;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const characteristics = super.getCharacteristics(context);
        const temperature = this.getTemperature(context);

        if (undefined !== temperature) {
            characteristics.set(Characteristic.CurrentTemperature, temperature);
        }

        return characteristics;
    }

    private getTemperature(context: AccessoryContext<SecuritySystemContext>): number | undefined {
        return context.custom.hub.reported?.temperature;
    }
}
