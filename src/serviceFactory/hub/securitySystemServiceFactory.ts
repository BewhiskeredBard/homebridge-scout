import type { Service, CharacteristicValue, CharacteristicSetCallback } from 'homebridge';
import { ModeState, ModeStateUpdateType, Mode } from 'scout-api';
import { AccessoryContext } from '../../accessoryFactory';
import { SecuritySystemContext } from '../../accessoryFactory/securitySystemAccessoryFactory';
import { HomebridgeConfigMode } from '../../context';
import { ServiceConstructor, CharacteristicConstructor } from '../../types';
import { HubServiceFactory } from './hubServiceFactory';

export class SecuritySystemServiceFactory extends HubServiceFactory {
    private static readonly ACTIVE_MODE_STATES = new Set<ModeState>([ModeState.Arming, ModeState.Armed, ModeState.Triggered, ModeState.Alarmed]);

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
                    throw new Error(`Could not find a Scout mode named "${modeName}".`);
                }
            });
        });

        return this.homebridge.api.hap.Service.SecuritySystem;
    }

    public configureService(service: Service, context: AccessoryContext<SecuritySystemContext>): void {
        super.configureService(service, context);

        service
            .getCharacteristic(this.homebridge.api.hap.Characteristic.SecuritySystemTargetState)
            .setProps({
                validValues: this.getValidTargetStates(),
            })
            .on('set', (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
                this.setTargetState(context, value)
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

            if (this.isAlarming(activeMode)) {
                currentState = SecuritySystemCurrentState.ALARM_TRIGGERED;
            } else if (this.isArmed(activeMode)) {
                currentState = this.getCurrentState(activeMode);
            }
        }

        characteristics.set(SecuritySystemCurrentState, currentState);
        characteristics.set(SecuritySystemTargetState, targetState);

        return characteristics;
    }

    protected hasStatusFault(): boolean {
        return true;
    }

    private async setTargetState(context: AccessoryContext<SecuritySystemContext>, state: CharacteristicValue): Promise<void> {
        const modeName = this.getModeNameForTargetState(state);

        let targetMode: Mode | undefined;
        let stateUpdate: ModeStateUpdateType | undefined;

        if (undefined !== modeName) {
            targetMode = this.findModeByName(context, modeName);
            stateUpdate = ModeStateUpdateType.Arming;
        }

        if (!targetMode) {
            // There's always a chance that a mode event was missed because the event listener was (temporarily) disconnected.
            // Grab the latest mode state so we're certain which one to disarm.
            context.custom.modes = (await this.scout.api.getModes(context.locationId)).data;
            targetMode = this.getActiveMode(context);
            stateUpdate = ModeStateUpdateType.Disarm;
        }

        if (targetMode && stateUpdate) {
            await this.scout.api.toggleRecipe(targetMode.id, {
                state: stateUpdate,
            });
        }
    }

    private getCurrentState(mode: Mode): number {
        const SecuritySystemCurrentState = this.homebridge.api.hap.Characteristic.SecuritySystemCurrentState;

        return this.getState(mode, config => {
            switch (config) {
                case HomebridgeConfigMode.Away:
                    return SecuritySystemCurrentState.AWAY_ARM;
                case HomebridgeConfigMode.Night:
                    return SecuritySystemCurrentState.NIGHT_ARM;
                case HomebridgeConfigMode.Stay:
                    return SecuritySystemCurrentState.STAY_ARM;
            }
        });
    }

    private getTargetState(mode: Mode): number;
    private getTargetState(mode: HomebridgeConfigMode): number;
    private getTargetState(mode: Mode | HomebridgeConfigMode): number {
        if ('string' === typeof mode) {
            const SecuritySystemTargetState = this.homebridge.api.hap.Characteristic.SecuritySystemTargetState;

            switch (mode) {
                case HomebridgeConfigMode.Away:
                    return SecuritySystemTargetState.AWAY_ARM;
                case HomebridgeConfigMode.Night:
                    return SecuritySystemTargetState.NIGHT_ARM;
                case HomebridgeConfigMode.Stay:
                    return SecuritySystemTargetState.STAY_ARM;
            }
        }

        return this.getState(mode, config => {
            return this.getTargetState(config);
        });
    }

    private getValidTargetStates(): number[] {
        const validTargetStates: number[] = [this.homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM];

        for (const key of Object.values(HomebridgeConfigMode)) {
            if (0 < this.getModeNames(key).length) {
                validTargetStates.push(this.getTargetState(key));
            }
        }

        return validTargetStates;
    }

    private getState(mode: Mode, mapper: (key: HomebridgeConfigMode) => number | undefined): number {
        for (const key of Object.values(HomebridgeConfigMode)) {
            const modeNames = new Set(this.getModeNames(key));

            if (modeNames.has(mode.name)) {
                const state = mapper(key);

                if (undefined !== state) {
                    return state;
                }
            }
        }

        throw new Error(`No configuration for Scout mode named "${mode.name}".`);
    }

    private isArmed(mode: Mode): boolean {
        switch (mode.state) {
            case ModeState.Armed:
                return true;
            case ModeState.Triggered:
                return !this.homebridge.config.triggerAlarmImmediately;
            default:
                return false;
        }
    }

    private isAlarming(mode: Mode): boolean {
        switch (mode.state) {
            case ModeState.Alarmed:
                return true;
            case ModeState.Triggered:
                return !!this.homebridge.config.triggerAlarmImmediately;
            default:
                return false;
        }
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
            return modes[mode].slice();
        }

        return [];
    }
}
