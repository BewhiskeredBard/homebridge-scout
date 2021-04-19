import * as fs from 'fs';
import * as tjs from 'typescript-json-schema';
import { ScoutPlatformPlugin } from '../src/scoutPlatformPlugin';

const program = tjs.programFromConfig('tsconfig.json');
const generator = tjs.buildGenerator(program, {
    uniqueNames: true,
    noExtraProps: true,
    required: true,
    strictNullChecks: true,
});

if (!generator) {
    throw new Error('Failed to build schema generator.');
}

const configSymbol = generator.getSymbols('HomebridgeConfig').find(symbol => 0 < symbol.fullyQualifiedName.indexOf('src/context/homebridge'));

if (!configSymbol) {
    throw new Error('Failed to find HomebridgeConfig symbol.');
}

const schema = {
    pluginAlias: ScoutPlatformPlugin.PLATFORM_NAME,
    pluginType: 'platform',
    singular: true,
    schema: generator.getSchemaForSymbol(configSymbol.name),
    layout: [
        {
            type: 'fieldset',
            expandable: false,
            title: 'Basic Options',
            description: 'Your Scout login credentials. Use a member account, not an admin account.',
            items: [
                {
                    key: 'auth.email',
                    title: 'Email',
                    description: 'Your Scout email.',
                },
                {
                    key: 'auth.password',
                    title: 'Password',
                    type: 'password',
                    description: 'Your Scout password.',
                }
            ],
        },
        {
            type: 'fieldset',
            expandable: true,
            expanded: false,
            title: 'Modes',
            items: [
                {
                    type: 'help',
                    helpvalue:
                        'If modes are defined, your Scout system will be added as a HomeKit security system. These map the HomeKit modes to your Scout modes. Your Scout mode names can be found in the Scout app or dashboard. Each HomeKit can be mapped to zero or more† Scout mode(s). If a HomeKit mode is empty or not provided, it will not be shown in Apple’s Home app.',
                },
                {
                    key: 'modes.stay',
                    type: 'array',
                    title: 'Stay Mode Name',
                    items: [
                        {
                            key: 'modes.stay[]',
                            notitle: true,
                            placeholder: 'e.g., Home',
                        },
                    ],
                },
                {
                    key: 'modes.away',
                    type: 'array',
                    title: 'Away Mode Name',
                    items: [
                        {
                            key: 'modes.away[]',
                            notitle: true,
                            placeholder: 'e.g., Away',
                        },
                    ],
                },
                {
                    key: 'modes.night',
                    type: 'array',
                    title: 'Night Mode Name',
                    items: [
                        {
                            key: 'modes.night[]',
                            notitle: true,
                            placeholder: 'e.g., Night',
                        },
                    ],
                },
                {
                    type: 'help',
                    helpvalue:
                        "<small>†There are caveats to mapping a HomeKit mode to multiple Scout modes. Let's assume you have four Scout modes (<em>Home</em>, <em>Away</em>, <em>Vacation</em>, and <em>Night</em>) and have mapped the <em>Away</em> HomeKit mode to your <em>Away</em> and <em>Vacation</em> Scout modes. If you arm either the <em>Away</em> or <em>Vacation</em> Scout modes from the Scout app, HomeKit will report the mode as <em>Away</em> with no way to differentiate between the two. Additionally, if you arm the <em>Away</em> HomeKit mode via HomeKit, the plug-in will arm whichever Scout mode is listed first. There would be no way to arm your <em>Vacation</em> mode via HomeKit. This limitation is due to HomeKit's strict 3-mode design.</small>",
                },
            ],
        },
        {
            type: 'fieldset',
            expandable: true,
            expanded: false,
            title: 'Other Options',
            items: [
                {
                    key: 'location',
                    title: 'Location Name',
                    placeholder: 'e.g., Home',
                    description:
                        'The name of the Scout location you want to integrate. If you only have a single location (most common), this option is unnecessary. If you have multiple locations, you need to choose which one to use. You can find your location names in the sidebar of the Scout app or dashboard.',
                },
                {
                    key: 'triggerAlarmImmediately',
                    title: 'Trigger Alarm Immediately',
                    description:
                        'By default, HomeKit will not consider the alarm triggered until the (optional) alarm delay has expired. Enabling this option causes HomeKit to consider the alarm triggered immediately.',
                },
                {
                    key: 'reverseSensorState',
                    title: 'Reverse Sensor State',
                    description:
                        'V1 Scout systems can get into a state where all of the sensor states are reversed. If this option is enabled, it reverses the sensor state of access sensors, door panels, and motion sensors reported to HomeKit so they work correctly in this scenario.',
                },
            ],
        },
    ],
};

fs.writeFileSync('config.schema.json', JSON.stringify(schema));
