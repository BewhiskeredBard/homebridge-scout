import * as Scout from "scout-api";
import * as Hap from "./hap";
import * as Homebridge from "./homebridge";
import { ScoutApi } from "./scout-api";
import { Hub, ModeState, ConnectionStateEvent, ConnectionState } from "scout-api";

interface Context {
    hub: Hub;
    modes: Scout.Mode[];
    modeIds: string[];
}

export class HubManager {
    private readonly accessories = new Map<string, Homebridge.PlatformAccessory>();
    private readonly modeStates = new Map<string, Scout.ModeState>();
    private isConnected = false;

    public constructor(
            private readonly homebridge: Homebridge.API,
            private readonly logger: Homebridge.Logger,
            private readonly api: ScoutApi) {
    }

    public createAccessory(hub: Scout.Hub, modes: Scout.Mode[], modeIds: string[]): Homebridge.PlatformAccessory {
        const PlatformAccessory = this.homebridge.platformAccessory;

        const name = "Security System";
        const uuid = this.homebridge.hap.uuid.generate(hub.id);
        const category = Hap.Categories.SECURITY_SYSTEM;
        const accessory = new PlatformAccessory(name, uuid, category);

        accessory.context = {
            hub,
            modes,
            modeIds,
        } as Context;

        modes.forEach(mode => {
            this.modeStates.set(mode.id, mode.state);
        });

        return accessory;
    }

    public configureAccessory(accessory: Homebridge.PlatformAccessory): void {
        const Service = this.homebridge.hap.Service;
        const Characteristic = this.homebridge.hap.Characteristic;
        const hub = (accessory.context as Context).hub;

        this.logger.info(`Configuring hub [${hub.id}] as accessory [${accessory.UUID}].`);

        const accessoryInfo = accessory.getService(Service.AccessoryInformation)!;

        accessoryInfo
                .setCharacteristic(Characteristic.Manufacturer, "Scout")
                .setCharacteristic(Characteristic.Model, hub.type)
                .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
                .setCharacteristic(Characteristic.FirmwareRevision, hub.reported?.fw_version || "unknown");

        if (undefined !== hub.reported?.hw_version) {
            accessoryInfo.setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version);
        }

        const values = this.getCharacteristicValues(accessory);

        values.forEach((serviceValues, serviceType) => {
            let service = accessory.getService(serviceType);

            if (!service) {
                service = accessory.addService(serviceType, accessory.displayName);
            }

            for (const characteristicType of serviceValues.keys()) {
                const characteristic = service!.getCharacteristic(characteristicType);

                if (0 == characteristic.listeners("get").length) {
                    characteristic.on("get", (callback: Hap.CharacteristicGetCallback) => {
                        try {
                            callback(null, this.getCharacteristicValues(accessory)?.get(serviceType)?.get(characteristicType));
                        } catch (e) {
                            callback(e);
                        }
                    });
                }
            }
        });

        accessory.getService(Service.SecuritySystem)!
                .getCharacteristic(Characteristic.SecuritySystemTargetState)
                .on("set", (value: Hap.CharacteristicValue, callback: Hap.CharacteristicSetCallback) => {
                    this.setTargetState(accessory, value).then(() => callback()).catch(callback);
                });

        accessory.on("identify", (paired: boolean, callback) => {
            this.identify(accessory, paired).then(() => callback()).catch(callback);
        });

        const services = new Set([Service.AccessoryInformation]
                .concat(...values.keys())
                .map(service => service.UUID));

        accessory.services.forEach(service => {
            if (!services.has(service.UUID)) {
                accessory.removeService(service);
            }
        });

        this.accessories.set(hub.id, accessory);
    }

    public onConnectionStateEvent(states: ConnectionStateEvent): void {
        this.isConnected = ConnectionState.Connected === states.current;
    }

    public onHubEvent(event: Scout.Hub): void {
        this.logger.info(`Hub [${event.id}] event fired.`);
        this.logger.debug(`Hub Event: ${JSON.stringify(event)}`);

        const accessory = this.accessories.get(event.id);

        if (!accessory) {
            return;
        }

        (accessory.context as Context).hub = event;

        this.updateValues(accessory);
    }

    public onModeEvent(event: Scout.ModeEvent): void {
        this.logger.info(`Mode [${event.mode_id}] ${event.event} event fired.`);
        this.logger.debug(`Mode Event: ${JSON.stringify(event)}`);

        this.modeStates.set(event.mode_id, event.event);

        // This is less than ideal, but the mode event only contains the mode_id and event.
        this.accessories.forEach(accessory => {
            this.updateValues(accessory);
        });
    }

    private updateValues(accessory: Homebridge.PlatformAccessory): void {
        this.getCharacteristicValues(accessory).forEach((serviceValues, serviceType) => {
            const service = accessory.getService(serviceType);

            serviceValues.forEach((value, characteristicType) => {
                service!.getCharacteristic(characteristicType).updateValue(value);
            });
        });
    }

    private getCharacteristicValues(accessory: Homebridge.PlatformAccessory): Map<Hap.ServiceConstructor, Map<Hap.CharacteristicConstructor<unknown>, Hap.CharacteristicValue>> {
        const Characteristic = this.homebridge.hap.Characteristic;
        const Service = this.homebridge.hap.Service;

        const context = accessory.context as Context;
        const values = new Map();
        const modeIds = context.modeIds;
        const alarmedModeId = modeIds.find(modeId => ModeState.Alarmed == this.modeStates.get(modeId));
        const armedModeId = modeIds.find(modeId => -1 < [ModeState.Armed, ModeState.Triggered].indexOf(this.modeStates.get(modeId)!));
        const armingModeId = modeIds.find(modeId => ModeState.Arming == this.modeStates.get(modeId));

        const currentState = alarmedModeId ? 4 : (armedModeId ? modeIds.indexOf(armedModeId) : 3);
        const targetState = alarmedModeId
                ? modeIds.indexOf(alarmedModeId)
                : (armingModeId ? modeIds.indexOf(armingModeId) : currentState);

        values.set(Service.SecuritySystem, new Map([
            [Characteristic.SecuritySystemCurrentState, currentState],
            [Characteristic.SecuritySystemTargetState, targetState],
        ]));

        const reported = context.hub.reported;

        if (undefined !== reported?.temperature) {
            values.set(Service.TemperatureSensor, new Map([[
                Characteristic.CurrentTemperature,
                reported.temperature,
            ]]));
        }

        const fault = ("active" === reported?.status && this.isConnected)
                ? Characteristic.StatusFault.NO_FAULT
                : Characteristic.StatusFault.GENERAL_FAULT;

        values.forEach(serviceValues => {
            serviceValues.set(Characteristic.StatusFault, fault);
        });

        if (undefined !== reported?.battery.level) {
            const type = context.hub.type;
            let batteryLevel = -1;

            if (Scout.HubType.Scout1 == type) {
                // The v1 hub appears to report an unsigned byte value. When plugged in, the value is 255.
                const MAX_BATTERY_LEVEL = 255;
                batteryLevel = Math.min(reported.battery.level, MAX_BATTERY_LEVEL);
                batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
            } else if (Scout.HubType.Scout1S == type) {
                // The v2 hub appears to report a direct voltage reading. When plugged in, the value is 5.0,
                // which is the voltage of the power adapter"s output. The value drops to just above 4.0
                // once it"s on battery power. The logic below is an extremely poor approximation.
                const MAX_BATTERY_LEVEL = 5;
                batteryLevel = Math.min(reported.battery.level, MAX_BATTERY_LEVEL);
                batteryLevel = Math.round((batteryLevel / MAX_BATTERY_LEVEL) * 100);
            }

            if (-1 < batteryLevel) {
                const chargingState = reported.battery.active
                        ? Characteristic.ChargingState.NOT_CHARGING
                        : Characteristic.ChargingState.CHARGING;

                const lowBattery = reported.battery.low
                        ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                        : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

                values.set(Service.BatteryService, new Map([
                    [Characteristic.BatteryLevel, batteryLevel],
                    [Characteristic.ChargingState, chargingState],
                    [Characteristic.StatusLowBattery, lowBattery],
                ]));
            }
        }

        return values;
    }

    private async setTargetState(accessory: Homebridge.PlatformAccessory, value: Hap.CharacteristicValue): Promise<void> {
        const context = accessory.context as Context;

        if ('number' != typeof value) {
            throw new Error(`Unsupported type [${typeof value}] for target state value.`);
        }

        if (3 == value) {
            const targetModeId = context.modeIds.find(modeId => {
                return -1 != [ModeState.Arming, ModeState.Armed, ModeState.Triggered, ModeState.Alarmed].indexOf(this.modeStates.get(modeId)!);
            });

            if (targetModeId) {
                await this.api.setMode(targetModeId, false);
            }
        } else {
            const targetModeId = context.modeIds[value];

            if (targetModeId) {
                await this.api.setMode(targetModeId, true);
            } else {
                throw new Error(`No matching mode found for "${value}".`);
            }
        }
    }

    private async identify(accessory: Homebridge.PlatformAccessory, paired: boolean): Promise<void> {
        await this.api.chirpHub((accessory.context as Context).hub.id);
    }
}
