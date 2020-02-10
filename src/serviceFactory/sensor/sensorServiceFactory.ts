import { ServiceFactory } from "../../serviceFactory";
import { SensorAccessoryContext } from "../../accessoryFactory/sensorAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";

export abstract class SensorServiceFactory extends ServiceFactory<SensorAccessoryContext> {
    protected constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public abstract getService(context: AccessoryContext<SensorAccessoryContext>): ServiceConstructor | undefined;

    protected getCharacteristics(context: AccessoryContext<SensorAccessoryContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const characteristics = new Map<CharacteristicConstructor<unknown>, CharacteristicValue>();
        const reported = context.custom.device?.reported;
        let hasFault = false;

        if (reported) {
            const trigger = reported.trigger;
            const isTimedOut = true === reported.timedout;
            hasFault = isTimedOut;

            if (undefined !== trigger?.tamper) {
                characteristics.set(
                    Characteristic.StatusTampered,
                    trigger.tamper ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED,
                );
            }

            if (!isTimedOut) {
                if (undefined !== reported.battery) {
                    characteristics.set(
                        Characteristic.StatusLowBattery,
                        undefined === reported.battery.low
                            ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
                            : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW,
                    );
                }
            }
        }

        characteristics.set(
            Characteristic.StatusFault,
            !hasFault && context.isConnected ? Characteristic.StatusFault.NO_FAULT : Characteristic.StatusFault.GENERAL_FAULT,
        );

        return characteristics;
    }
}
