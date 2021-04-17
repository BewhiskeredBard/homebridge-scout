import * as fs from 'fs';
import { default as Ajv } from 'ajv';
import type { API, Logging, PlatformConfig } from 'homebridge';

export enum HomebridgeConfigMode {
    Stay = 'stay',
    Away = 'away',
    Night = 'night',
}

export interface HomebridgeConfig extends PlatformConfig {
    platform: 'ScoutAlarm';
    auth: {
        email: string;
        password: string;
    };
    location?: string;
    modes?: {
        [key in HomebridgeConfigMode]: string[];
    };
    triggerAlarmImmediately?: boolean;
    reverseSensorState?: boolean;
}

export interface HomebridgeContext {
    api: API;
    logger: Logging;
    config: HomebridgeConfig;
}

export class HomebridgeContextFactory {
    public create(api: API, logger: Logging, config: unknown): HomebridgeContext {
        return {
            api,
            logger,
            config: this.validateConfig(this.getSchema(), config),
        };
    }

    private getSchema(): Record<string, unknown> {
        try {
            const schemaPath = require.resolve('../../config.schema.json');
            const file = fs.readFileSync(schemaPath, 'utf8');
            const schema = JSON.parse(file) as Record<string, unknown>;

            return schema.schema as Record<string, unknown>;
        } catch (e: unknown) {
            let message = 'Unable to read/parse configuration schema';

            if (this.hasMessage(e)) {
                message = `${message}: ${e.message}`;
            }

            throw new Error(message);
        }
    }

    private validateConfig(schema: Record<string, unknown>, config: unknown): HomebridgeConfig {
        const ajv = new Ajv();

        if (ajv.validate<HomebridgeConfig>(schema, config)) {
            return config;
        }

        if (ajv.errors && 0 < ajv.errors.length) {
            const error = ajv.errors[0];
            const message = `Configuration error: config${error.instancePath || ''} ${error.message || ''}`;

            throw new Error(message);
        }

        throw new Error('Unknown configuration error');
    }

    private hasMessage(error: unknown): error is { message: string } {
        return 'object' === typeof error && null !== error && 'message' in error;
    }
}
