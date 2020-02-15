import { ModeState, ModeStateUpdateType, Mode } from "scout-api";
import { AccessoryContext } from "../../accessoryFactory";
import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory";
import { HomebridgeConfigMode } from "../../context";
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor, Service, CharacteristicSetCallback } from "../../types";
import { HubServiceFactory } from "./hubServiceFactory";

export class SecuritySystemServiceFactory extends HubServiceFactory {
    private static readonly ARMING_MODE_STATES = new Set<ModeState>([ModeState.Arming]);
    private static readonly ARMED_MODE_STATES = new Set<ModeState>([ModeState.Armed, ModeState.Triggered]);
    private static readonly ALARMING_MODE_STATES = new Set<ModeState>([ModeState.Alarmed]);
    private static readonly ACTIVE_MODE_STATES = new Set<ModeState>([
        ...SecuritySystemServiceFactory.ARMING_MODE_STATES,
        ...SecuritySystemServiceFactory.ARMED_MODE_STATES,
        ...SecuritySystemServiceFactory.ALARMING_MODE_STATES,
    ]);

    public getService(context: AccessoryContext<SecuritySystemContext>): ServiceConstructor | undefined {
        if (!this.homebridge.config.modes) {
            return;
        }

        // Validate that each Scout mode has a mapping to a HAP mode…
        context.custom.modes.forEach(mode => this.getTargetState(mode));

        // Validate that each HAP mode's Scout mode name(s) exist(s).
        Object.values(HomebridgeConfigMode).forEach(key => {
            const modeNames = this.getModeNames(key);

            modeNames.forEach(modeName => {
                if (!this.findModeByName(context, modeName)) {
                    throw new Error(`Could not find a Scout mode named ${modeName}.`);
                }
            });
        });

        return this.homebridge.api.hap.Service.SecuritySystem;
    }

    public configureService(service: Service, context: AccessoryContext<SecuritySystemContext>): void {
        const Characteristic = this.homebridge.api.hap.Characteristic;

        super.configureService(service, context);

        service.getCharacteristic(Characteristic.SecuritySystemTargetState).on("set", (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
            this.setTargetState(service, context, value)
                .then(() => callback())
                .catch(callback);
        });
    }

    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const SecuritySystemCurrentState = Characteristic.SecuritySystemCurrentState;
        const SecuritySystemTargetState = Characteristic.SecuritySystemTargetState;

        const characteristics = super.getCharacteristics(context);
        const activeMode = this.getActiveMode(context);
        let currentState = SecuritySystemCurrentState.DISARMED;
        let targetState = SecuritySystemTargetState.DISARM;

        if (activeMode) {
            targetState = this.getTargetState(activeMode);

            if (SecuritySystemServiceFactory.ALARMING_MODE_STATES.has(activeMode.state)) {
                currentState = SecuritySystemCurrentState.ALARM_TRIGGERED;
            } else if (SecuritySystemServiceFactory.ARMED_MODE_STATES.has(activeMode.state)) {
                currentState = targetState;
            }
        }

        characteristics.set(SecuritySystemCurrentState, currentState);
        characteristics.set(SecuritySystemTargetState, targetState);

        return characteristics;
    }

    private async setTargetState(service: Service, context: AccessoryContext<SecuritySystemContext>, state: CharacteristicValue): Promise<void> {
        const modeName = this.getModeNameForTargetState(state);

        let targetMode: Mode | undefined;
        let stateUpdate: ModeStateUpdateType | undefined;

        if (undefined !== modeName) {
            targetMode = this.findModeByName(context, modeName);
            stateUpdate = ModeStateUpdateType.Arming;
        }

        if (!targetMode) {
            targetMode = this.getActiveMode(context);
            stateUpdate = ModeStateUpdateType.Disarm;
        }

        if (targetMode && stateUpdate) {
            await this.scout.api.toggleRecipe(targetMode.id, {
                state: stateUpdate,
            });
        }
    }

    private getTargetState(mode: Mode): number {
        const SecuritySystemCurrentState = this.homebridge.api.hap.Characteristic.SecuritySystemCurrentState;

        for (const key of Object.values(HomebridgeConfigMode)) {
            const modeNames = new Set(this.getModeNames(key));

            if (modeNames.has(mode.name)) {
                switch (key) {
                    case HomebridgeConfigMode.Away:
                        return SecuritySystemCurrentState.AWAY_ARM;
                    case HomebridgeConfigMode.Night:
                        return SecuritySystemCurrentState.NIGHT_ARM;
                    case HomebridgeConfigMode.Stay:
                        return SecuritySystemCurrentState.STAY_ARM;
                }
            }
        }

        throw new Error(`No configuration for Scout mode named "${mode.name}".`);
    }

    private findModeByName(context: AccessoryContext<SecuritySystemContext>, modeName: string): Mode | undefined {
        return context.custom.modes.find(mode => mode.name === modeName);
    }

    private getActiveMode(context: AccessoryContext<SecuritySystemContext>): Mode | undefined {
        return context.custom.modes.find(mode => SecuritySystemServiceFactory.ACTIVE_MODE_STATES.has(mode.state));
    }

    private getModeNameForTargetState(value: CharacteristicValue): string | undefined {
        const SecuritySystemTargetState = this.homebridge.api.hap.Characteristic.SecuritySystemTargetState;

        let configKey: HomebridgeConfigMode | undefined;

        switch (value) {
            case SecuritySystemTargetState.AWAY_ARM:
                configKey = HomebridgeConfigMode.Away;
                break;
            case SecuritySystemTargetState.NIGHT_ARM:
                configKey = HomebridgeConfigMode.Night;
                break;
            case SecuritySystemTargetState.STAY_ARM:
                configKey = HomebridgeConfigMode.Stay;
                break;
        }

        if (configKey) {
            return this.getModeNames(configKey)[0];
        }
    }

    private getModeNames(mode: HomebridgeConfigMode): string[] {
        const modes = this.homebridge.config.modes;

        if (modes) {
            const modeNames = modes[mode];

            if (Array.isArray(modeNames)) {
                return modeNames.slice();
            } else {
                return [modeNames];
            }
        }

        return [];
    }
}
