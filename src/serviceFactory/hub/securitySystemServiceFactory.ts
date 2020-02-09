import { SecuritySystemContext } from "../../accessoryFactory/securitySystemAccessoryFactory"
import { CharacteristicConstructor, CharacteristicValue, ServiceConstructor, Service, CharacteristicSetCallback } from "../../types";
import { HubServiceFactory } from "./hubServiceFactory";
import { ModeState, ModeStateUpdateType } from "scout-api";
import { HomebridgeContext, ScoutContext } from "../../context";
import { AccessoryContext } from "../../accessoryFactory";

export class SecuritySystemServiceFactory extends HubServiceFactory {
    private static readonly ARMING_MODE_STATES = new Set<ModeState>([
        ModeState.Arming,
    ]);

    private static readonly ARMED_MODE_STATES = new Set<ModeState>([
        ModeState.Armed,
        ModeState.Triggered,
    ]);

    private static readonly ALARMING_MODE_STATES = new Set<ModeState>([
        ModeState.Alarmed,
    ]);

    private static readonly ACTIVE_MODE_STATES = new Set<ModeState>([
        ...SecuritySystemServiceFactory.ARMING_MODE_STATES,
        ...SecuritySystemServiceFactory.ARMED_MODE_STATES,
        ...SecuritySystemServiceFactory.ALARMING_MODE_STATES,
    ]);

    public constructor(homebridge: HomebridgeContext, scout: ScoutContext) {
        super(homebridge, scout);
    }

    public getService(): ServiceConstructor | undefined {
        return this.homebridge.api.hap.Service.SecuritySystem;
    }

    public configureService(service: Service, context: AccessoryContext<SecuritySystemContext>): void {
        const Characteristic = this.homebridge.api.hap.Characteristic;

        super.configureService(service, context);

        service.getCharacteristic(Characteristic.SecuritySystemTargetState)
                .on("set", (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
                    this.setTargetState(context, value).then(() => callback()).catch(callback);
                });
    }

    protected getCharacteristics(context: AccessoryContext<SecuritySystemContext>): Map<CharacteristicConstructor<unknown>, CharacteristicValue> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const characteristics = super.getCharacteristics(context);

        let currentState: number;
        let targetState: number;

        const alarmedModeId = this.getModeIdForStateSet(SecuritySystemServiceFactory.ALARMING_MODE_STATES, context);

        if (alarmedModeId) {
            currentState = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
            targetState = this.getTargetState(context, alarmedModeId);
        } else {
            const armedModeId = this.getModeIdForStateSet(SecuritySystemServiceFactory.ARMED_MODE_STATES, context);

            if (armedModeId) {
                currentState = this.getTargetState(context, armedModeId);
                targetState = currentState;
            } else {
                const armingModeId = this.getModeIdForStateSet(SecuritySystemServiceFactory.ARMING_MODE_STATES, context);

                currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
                targetState = armingModeId ? this.getTargetState(context, armingModeId) : currentState;
            }
        }

        characteristics.set(Characteristic.SecuritySystemCurrentState, currentState);
        characteristics.set(Characteristic.SecuritySystemTargetState, targetState);

        return characteristics;
    }

    private async setTargetState(context: AccessoryContext<SecuritySystemContext>, value: CharacteristicValue): Promise<void> {
        const Characteristic = this.homebridge.api.hap.Characteristic;

        const modes = context.custom.modes;
        let targetModeId: string | undefined;
        let targetState: ModeStateUpdateType | undefined;

        switch (value) {
            case Characteristic.SecuritySystemTargetState.DISARM:
                targetState = ModeStateUpdateType.Disarm;
                targetModeId = modes.find(mode => {
                    return SecuritySystemServiceFactory.ACTIVE_MODE_STATES.has(mode.state);
                })?.id;
                break;
            case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                targetState = ModeStateUpdateType.Arming;
                targetModeId = modes.find(mode => mode.name === this.homebridge.config.modes.away)?.id;
                break;
            case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                targetState = ModeStateUpdateType.Arming;
                targetModeId = modes.find(mode => mode.name === this.homebridge.config.modes.night)?.id;
                break;
            case Characteristic.SecuritySystemTargetState.STAY_ARM:
                targetState = ModeStateUpdateType.Arming;
                targetModeId = modes.find(mode => mode.name === this.homebridge.config.modes.stay)?.id;
                break;
        }

        if (targetModeId && targetState) {
            await this.scout.api.toggleRecipe(targetModeId, {
                state: targetState,
            });
        }
    }

    private getModeIdForStateSet(modeStates: Set<ModeState>, context: AccessoryContext<SecuritySystemContext>): string | undefined {
        return context.custom.modes.find(mode => modeStates.has(mode.state))?.id;
    }

    private getTargetState(context: AccessoryContext<SecuritySystemContext>, modeId: string): number {
        const mode = context.custom.modes.find(mode => mode.id === modeId);

        if (mode && SecuritySystemServiceFactory.ACTIVE_MODE_STATES.has(mode.state)) {
            switch (mode.name) {
                case this.homebridge.config.modes.away:
                    return this.homebridge.api.hap.Characteristic.SecuritySystemTargetState.AWAY_ARM;
                case this.homebridge.config.modes.stay:
                    return this.homebridge.api.hap.Characteristic.SecuritySystemTargetState.STAY_ARM;
                case this.homebridge.config.modes.night:
                    return this.homebridge.api.hap.Characteristic.SecuritySystemTargetState.NIGHT_ARM;
            }
        }

        return this.homebridge.api.hap.Characteristic.SecuritySystemTargetState.DISARM;
    }
}
