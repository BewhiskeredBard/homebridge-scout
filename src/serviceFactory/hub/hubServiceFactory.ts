import { AccessoryContext } from "../../accessoryFactory";
import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory";
import { ServiceFactory } from "../../serviceFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";

export abstract class HubServiceFactory extends ServiceFactory<SecuritySystemContext> {
    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const characteristics = new Map<CharacteristicConstructor<unknown>, CharacteristicValue>();

        const faultStatus =
            "active" === context.custom.hub.reported?.status && context.isConnected
                ? Characteristic.StatusFault.NO_FAULT
                : Characteristic.StatusFault.GENERAL_FAULT;

        characteristics.set(Characteristic.StatusFault, faultStatus);

        return characteristics;
    }

    public abstract getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined;
}
