import type { API, PluginInitializer } from "homebridge";
import { ScoutPlatformPlugin } from "./scoutPlatformPlugin";

const init: PluginInitializer = (api: API): void => {
    api.registerPlatform(ScoutPlatformPlugin.PLUGIN_NAME, ScoutPlatformPlugin.PLATFORM_NAME, ScoutPlatformPlugin);
};

export default init;
