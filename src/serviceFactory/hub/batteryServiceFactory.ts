import { HubType } from "scout-api";
import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor } from "../../types";
import { AccessoryContext } from "../../accessoryFactory";
import { HomebridgeContext, ScoutContext } from "../../context";
import { HubServiceFactory } from "./hubServiceFactory";

export class BatteryServiceFactory extends HubServiceFactory {
    public constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined {
        if (undefined !== this.getBatteryLevel(context)) {
            return this.homebridge.api.hap.Service.BatteryService;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const characteristics = super.getCharacteristics(context);
        const batteryLevel = this.getBatteryLevel(context);

        if (undefined !== batteryLevel) {
            characteristics.set(
                Characteristic.ChargingState,
                context.custom.hub.reported?.battery.active ? Characteristic.ChargingState.NOT_CHARGING : Characteristic.ChargingState.CHARGING,
            );

            characteristics.set(
                Characteristic.StatusLowBattery,
                context.custom.hub.reported?.battery.low
                    ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                    : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
            );

            characteristics.set(Characteristic.BatteryLevel, batteryLevel);
        }

        return characteristics;
    }

    private getBatteryLevel(context: AccessoryContext<SecuritySystemContext>): number | undefined {
        const hub = context.custom.hub;
        const battery = hub.reported?.battery;
        let batteryLevel = undefined;

        if (undefined !== battery) {
            if (HubType.Scout1 == hub.type) {
                // The v1 hub appears to report an unsigned byte value. When plugged in, the value is 255.
                const MAX_BATTERY_LEVEL = 255;
                batteryLevel = Math.min(battery.level, MAX_BATTERY_LEVEL);
                batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
            } else if (HubType.Scout1S == hub.type) {
                // The v2 hub appears to report a direct voltage reading. When plugged in, the value is 5.0,
                // which is the voltage of the power adapter"s output. The value drops to just above 4.0
                // once it"s on battery power. The logic below is an extremely poor approximation.
                const MAX_BATTERY_LEVEL = 5;
                batteryLevel = Math.min(battery.level, MAX_BATTERY_LEVEL);
                batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
            }
        }

        return batteryLevel;
    }
}
