import { API, Logging } from 'homebridge';
import { HomebridgeContextFactory, HomebridgeConfigMode, HomebridgeConfig } from '../../src/context';

describe(`${HomebridgeContextFactory.name}`, () => {
    const factory = new HomebridgeContextFactory();

    let api: API;
    let logger: Logging;
    let config: HomebridgeConfig;

    beforeEach(() => {
        api = {} as API;
        logger = {} as Logging;
        config = {
            platform: 'ScoutAlarm',
            auth: {
                email: 'email1',
                password: 'password1',
            },
            location: 'location1',
            modes: {
                away: ['mode1'],
                stay: ['mode2'],
                night: ['mode3'],
            },
        };
    });

    describe('.create(api, logger, config)', () => {
        test('undefined config', () => {
            expect(() => factory.create(api, logger, undefined)).toThrowError('Configuration error: config should be object');
        });

        test('empty config', () => {
            expect(() => factory.create(api, logger, {})).toThrowError("Configuration error: config should have required property 'platform'");
        });

        test('missing config.auth.email', () => {
            delete config.auth.email;

            expect(() => factory.create(api, logger, config)).toThrowError("Configuration error: config.auth should have required property 'email'");
        });

        test('missing config.auth.password', () => {
            delete config.auth.password;

            expect(() => factory.create(api, logger, config)).toThrowError("Configuration error: config.auth should have required property 'password'");
        });

        test('missing config.location', () => {
            delete config.location;

            expect(() => factory.create(api, logger, config)).toThrowError("Configuration error: config should have required property 'location'");
        });

        test('missing config.modes', () => {
            delete config.modes;

            expect(factory.create(api, logger, config).config).toEqual(config);
        });

        Object.values(HomebridgeConfigMode).forEach(mode => {
            test(`missing config.modes.${mode}`, () => {
                if (config.modes) {
                    delete config.modes[mode];
                }

                expect(() => factory.create(api, logger, config)).toThrowError(`Configuration error: config.modes should have required property '${mode}'`);
            });
        });

        test('invalid config.reverseSensorState', () => {
            (config.reverseSensorState as unknown) = 'true';

            expect(() => factory.create(api, logger, config)).toThrowError('Configuration error: config.reverseSensorState should be boolean');
        });

        test('valid', () => {
            expect(factory.create(api, logger, config).config).toEqual(config);
        });
    });
});
