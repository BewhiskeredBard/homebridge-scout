import { ServiceFactory } from "../../serviceFactory";
import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";

export abstract class HubServiceFactory extends ServiceFactory<SecuritySystemContext> {
    protected constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public abstract getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined;

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
}
