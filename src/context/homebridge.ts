import { API, Logger } from "../types";

export enum HomebridgeConfigMode {
    Stay = "stay",
    Away = "away",
    Night = "night",
}

export interface HomebridgeConfig {
    auth: {
        email: string;
        password: string;
    };
    location: string;
    modes: {
        [key in HomebridgeConfigMode]: string;
    };
    reverseSensorState: boolean | undefined;
}

export interface HomebridgeContext {
    api: API;
    logger: Logger;
    config: HomebridgeConfig;
}

export class HomebridgeContextFactory {
    public create(api: API, logger: Logger, config: unknown): HomebridgeContext {
        return {
            api,
            logger,
            // TODO: Validate configuration. 
            config: config as any,
        };
    }
}
