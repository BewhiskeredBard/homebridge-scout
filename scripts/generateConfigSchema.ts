import * as fs from "fs";
import * as tjs from "typescript-json-schema";
import { ScoutPlatform } from "../src/scoutPlatform";

const program = tjs.programFromConfig("tsconfig.json");
const schema = {
    pluginAlias: ScoutPlatform.PLATFORM_NAME,
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
                    type: "password",
                    description: "Your Scout password.",
                },
                {
                    key: "location",
                    title: "Location Name",
                    placeholder: "e.g., Home",
                    description:
                        "The name of your Scout location. It's probably <em>Home</em> if you only have one Scout system and haven't renamed it. You can find this in the left-hand menu of the Scout app or dashboard.",
                },
            ],
        },
        {
            type: "fieldset",
            expandable: true,
            expanded: false,
            title: "Modes",
            items: [
                {
                    type: "help",
                    helpvalue:
                        "If modes are defined, your Scout system will be added as a HomeKit security system. These map the HomeKit modes to your Scout modes. Your Scout mode names can be found in the Scout app or dashboard. Each HomeKit mode must be mapped to one (or more†) Scout mode(s).",
                },
                {
                    key: "modes.stay",
                    type: "array",
                    title: "Stay Mode Name",
                    items: [
                        {
                            key: "modes.stay[]",
                            notitle: true,
                            placeholder: "e.g., Home",
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
                            placeholder: "e.g., Away",
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
                            placeholder: "e.g., Night",
                        },
                    ],
                },
                {
                    type: "help",
                    helpvalue:
                        "<small>†There are caveats to mapping a HomeKit mode to multiple Scout modes. Let's assume you have four Scout modes (<em>Home</em>, <em>Away</em>, <em>Vacation</em>, and <em>Night</em>) and have mapped the <em>Away</em> HomeKit mode to your <em>Away</em> and <em>Vacation</em> Scout modes. If you arm either the <em>Away</em> or <em>Vacation</em> Scout modes from the Scout app, HomeKit will report the mode as <em>Away</em> with no way to differentiate between the two. Additionally, if you arm the <em>Away</em> HomeKit mode via HomeKit, the plug-in will arm whichever Scout mode is listed first. There would be no way to arm your <em>Vacation</em> mode via HomeKit. This limitation is due to HomeKit's strict 3-mode design.</small>",
                },
            ],
        },
        {
            type: "fieldset",
            expandable: true,
            expanded: false,
            title: "Other Options",
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
