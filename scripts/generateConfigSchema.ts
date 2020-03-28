import * as fs from "fs";
import * as tjs from "typescript-json-schema";

const program = tjs.programFromConfig("tsconfig.json");
const schema = {
    pluginAlias: "Homebridge Scout",
    pluginType: "platform",
    singular: true,
    schema: tjs.generateSchema(program, "HomebridgeConfig", {
        noExtraProps: true,
        required: true,
        strictNullChecks: true,
    }),
    layout: [
        {
            type: "fieldset",
            expandable: false,
            title: "Required Options",
            description: "Your Scout login credentials. Use a member account, not an admin account.",
            items: [
                {
                    key: "auth.email",
                    title: "Email",
                    description: "Your Scout email.",
                },
                {
                    key: "auth.password",
                    title: "Password",
                    description: "Your Scout password.",
                },
                {
                    key: "location",
                    title: "Location Name",
                    description:
                        "The name of your Scout location. It's probably \"Home\" if you only have one Scout system and haven't renamed it. You can find this in the left-hand menu of the Scout app or dashboard.",
                },
            ],
        },
        {
            type: "fieldset",
            expandable: true,
            expanded: false,
            title: "Modes",
            description:
                "If present, this option will add your Scout system as a HomeKit security system. It maps the HomeKit modes to your Scout modes. Your Scout mode names can be found in the Scout app or dashboard. Each HomeKit mode must be mapped to one Scout mode(s).\n\nThere are caveats to mapping a HomeKit mode to multiple Scout modes. Let's assume you have four Scout modes (Home, Away, Vacation, and Night) and have mapped the Away HomeKit mode to your Away and Vacation Scout modes. If you arm either the Away or Vacation Scout modes from the Scout app, HomeKit will report the mode as Away with no way to differentiate between the two. Additionally, if you arm the Away HomeKit mode via HomeKit, the plug-in will arm whichever Scout mode is listed first. There would be no way to arm your Vacation mode via HomeKit. This limitation is due to HomeKit's strict 3-mode design.",
            items: [
                {
                    key: "modes.stay",
                    type: "array",
                    title: "Stay Mode Name",
                    items: [
                        {
                            key: "modes.stay[]",
                            notitle: true,
                        },
                    ],
                },
                {
                    key: "modes.away",
                    type: "array",
                    title: "Away Mode Name",
                    items: [
                        {
                            key: "modes.away[]",
                            notitle: true,
                        },
                    ],
                },
                {
                    key: "modes.night",
                    type: "array",
                    title: "Night Mode Name",
                    items: [
                        {
                            key: "modes.night[]",
                            notitle: true,
                        },
                    ],
                },
            ],
        },
        {
            type: "fieldset",
            expandable: true,
            expanded: false,
            title: "Optional Configuration",
            items: [
                {
                    key: "reverseSensorState",
                    title: "Reverse Sensor State",
                    description:
                        "V1 Scout systems can get into a state where all of the sensor states are reversed. If this option is enabled, it reverses the sensor state of access sensors, door panels, and motion sensors reported to HomeKit so they work correctly in this scenario.",
                },
            ],
        },
    ],
};

fs.writeFileSync("config.schema.json", JSON.stringify(schema));
