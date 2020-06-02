import type { CharacteristicValue } from 'homebridge';
import { AccessoryContext } from '../../accessoryFactory';
import { SecuritySystemContext } from '../../accessoryFactory/securitySystemAccessoryFactory';
import { ServiceFactory } from '../../serviceFactory';
import { CharacteristicConstructor, ServiceConstructor } from '../../types';

export abstract class HubServiceFactory extends ServiceFactory<SecuritySystemContext> {
    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const StatusFault = this.homebridge.api.hap.Characteristic.StatusFault;
        const characteristics = new Map<CharacteristicConstructor<unknown>, CharacteristicValue>();

        const faultStatus = 'active' === context.custom.hub.reported?.status && context.isConnected ? StatusFault.NO_FAULT : StatusFault.GENERAL_FAULT;

        characteristics.set(StatusFault, faultStatus);

        return characteristics;
    }

    public abstract getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined;
}
