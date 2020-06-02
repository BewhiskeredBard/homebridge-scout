import type { CharacteristicValue } from 'homebridge';
import { AccessoryContext } from '../../accessoryFactory';
import { SensorAccessoryContext } from '../../accessoryFactory/sensorAccessoryFactory';
import { ServiceFactory } from '../../serviceFactory';
import { CharacteristicConstructor, ServiceConstructor } from '../../types';

export abstract class SensorServiceFactory extends ServiceFactory<SensorAccessoryContext> {
    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const characteristics = new Map<CharacteristicConstructor<unknown>, CharacteristicValue>();

        this.withTamperedStatus(characteristics, context);
        this.withLowBatteryStatus(characteristics, context);
        this.withFaultStatus(characteristics, context);

        return characteristics;
    }

    private withTamperedStatus(
        characteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>,
        context: AccessoryContext<SensorAccessoryContext>,
    ): void {
        const isTampered = context.custom.device.reported?.trigger?.tamper;

        if (undefined !== isTampered) {
            const StatusTampered = this.homebridge.api.hap.Characteristic.StatusTampered;

            characteristics.set(StatusTampered, isTampered ? StatusTampered.TAMPERED : StatusTampered.NOT_TAMPERED);
        }
    }

    private withLowBatteryStatus(
        characteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>,
        context: AccessoryContext<SensorAccessoryContext>,
    ): void {
        const StatusLowBattery = this.homebridge.api.hap.Characteristic.StatusLowBattery;
        const reported = context.custom.device.reported;

        if (true !== reported?.timedout && undefined !== reported?.battery) {
            characteristics.set(StatusLowBattery, reported.battery.low ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_NORMAL);
        }
    }

    private withFaultStatus(
        characteristics: Map<CharacteristicConstructor<unknown>, CharacteristicValue>,
        context: AccessoryContext<SensorAccessoryContext>,
    ): void {
        const StatusFault = this.homebridge.api.hap.Characteristic.StatusFault;
        const hasFault = !context.isConnected || true === context.custom.device.reported?.timedout;

        characteristics.set(StatusFault, hasFault ? StatusFault.GENERAL_FAULT : StatusFault.NO_FAULT);
    }

    public abstract getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined;
}
