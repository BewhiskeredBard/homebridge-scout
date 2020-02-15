import { AccessoryContext } from "./accessoryFactory";
import { HomebridgeContext, ScoutContext } from "./context";
import { ServiceConstructor, CharacteristicConstructor, CharacteristicValue, Service } from "./types/hap";

export abstract class ServiceFactory<T> {
    // eslint-disable-next-line no-useless-constructor
    public constructor(protected readonly homebridge: HomebridgeContext, protected readonly scout: ScoutContext) {}

    public configureService(service: Service, context: AccessoryContext<T>): void {
        this.updateService(service, context);
    }

    public updateService(service: Service, context: AccessoryContext<T>): void {
        const characteristics = this.getCharacteristics(context);

        characteristics.forEach((value, characteristicConstructor) => {
            service.getCharacteristic(characteristicConstructor).updateValue(value);
        });
    }

    public abstract getService(context: AccessoryContext<T>): ServiceConstructor | undefined;

    protected abstract getCharacteristics(context: AccessoryContext<T>): Map<CharacteristicConstructor<unknown>, CharacteristicValue>;
}
