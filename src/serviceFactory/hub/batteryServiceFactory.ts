import type { CharacteristicValue } from 'homebridge';
import { HubType } from 'scout-api';
import { AccessoryContext } from '../../accessoryFactory';
import { SecuritySystemContext } from '../../accessoryFactory/securitySystemAccessoryFactory';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { HubServiceFactory } from './hubServiceFactory';

export class BatteryServiceFactory extends HubServiceFactory {
    private static readonly MAX_BATTERY_LEVELS = new Map([
        // The v1 hub appears to report an unsigned byte value. When plugged in, the value is 255.
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        [HubType.Scout1, 255],
        // The v2 hub appears to report a direct voltage reading. When plugged in, the value is 5.0,
        // which is the voltage of the power adapter"s output. The value drops to just above 4.0
        // once it"s on battery power. The logic below is an extremely poor approximation.
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        [HubType.Scout1S, 5.0],
    ]);

    public getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined {
        if (undefined !== this.getBatteryLevel(context)) {
            return this.homebridge.api.hap.Service.BatteryService;
        }
    }

    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const ChargingState = this.homebridge.api.hap.Characteristic.ChargingState;
        const StatusLowBattery = this.homebridge.api.hap.Characteristic.StatusLowBattery;
        const BatteryLevel = this.homebridge.api.hap.Characteristic.BatteryLevel;

        const characteristics = super.getCharacteristics(context);
        const batteryLevel = this.getBatteryLevel(context);

        if (undefined !== batteryLevel) {
            characteristics.set(ChargingState, context.custom.hub.reported?.battery.active ? ChargingState.NOT_CHARGING : ChargingState.CHARGING);

            characteristics.set(
                StatusLowBattery,
                context.custom.hub.reported?.battery.low ? StatusLowBattery.BATTERY_LEVEL_LOW : StatusLowBattery.BATTERY_LEVEL_NORMAL,
            );

            characteristics.set(BatteryLevel, batteryLevel);
        }

        return characteristics;
    }

    private getBatteryLevel(context: AccessoryContext<SecuritySystemContext>): number | undefined {
        const hub = context.custom.hub;
        const battery = hub.reported?.battery;
        const maxBatteryLevel = BatteryServiceFactory.MAX_BATTERY_LEVELS.get(hub.type);

        if (undefined !== battery && undefined !== maxBatteryLevel) {
            let batteryLevel = Math.min(battery.level, maxBatteryLevel);
            batteryLevel = Math.round((batteryLevel / maxBatteryLevel) * 100);

            return batteryLevel;
        }
    }
}
