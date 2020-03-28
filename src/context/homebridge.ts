import * as Ajv from "ajv";
import { API, Logger } from "../types";

export enum HomebridgeConfigMode {
    Stay = "stay",
    Away = "away",
    Night = "night",
}

export interface HomebridgeConfig {
    platform: "ScoutAlarm";
    auth: {
        email: string;
        password: string;
    };
    location: string;
    modes?: {
        [key in HomebridgeConfigMode]: string | string[];
    };
    reverseSensorState?: boolean;
}

export interface HomebridgeContext {
    api: API;
    logger: Logger;
    config: HomebridgeConfig;
}

export class HomebridgeContextFactory {
    private static readonly JSON_SCHEMA_PATH = "../../config.schema.json";

    private readonly schema: object;

    public constructor() {
        this.schema = require(HomebridgeContextFactory.JSON_SCHEMA_PATH).schema;
    }

    public create(api: API, logger: Logger, config: unknown): HomebridgeContext {
        const ajv = new Ajv();
        const isValid = ajv.validate(this.schema, config) as boolean;

        if (!isValid && ajv.errors && 0 < ajv.errors.length) {
            const error = ajv.errors[0];
            const message = `Configuration error: config${error.dataPath} ${error.message}`;

            throw new Error(message);
        }

        return {
            api,
            logger,
            config: config as HomebridgeConfig,
        };
    }
}
