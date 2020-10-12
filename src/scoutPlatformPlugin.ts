import * as fs from 'fs';
import type { DynamicPlatformPlugin, Logging, PlatformConfig, API, PlatformAccessory } from 'homebridge';
import { SecuritySystemAccessoryFactory } from './accessoryFactory/securitySystemAccessoryFactory';
import { SensorAccessoryFactory } from './accessoryFactory/sensorAccessoryFactory';
import { HomebridgeContextFactory, ScoutContextFactory } from './context';
import { Orchestrator } from './orchestrator';
import { BatteryServiceFactory } from './serviceFactory/hub/batteryServiceFactory';
import { SecuritySystemServiceFactory } from './serviceFactory/hub/securitySystemServiceFactory';
import { TemperatureServiceFactory } from './serviceFactory/hub/temperatureServiceFactory';
import { ContactSensorServiceFactory } from './serviceFactory/sensor/contactSensorServiceFactory';
import { HumiditySensorServiceFactory } from './serviceFactory/sensor/humiditySensorServiceFactory';
import { LeakSensorServiceFactory } from './serviceFactory/sensor/leakSensorServiceFactory';
import { MotionSensorServiceFactory } from './serviceFactory/sensor/motionSensorServiceFactory';
import { SmokeSensorServiceFactory } from './serviceFactory/sensor/smokeSensorServiceFactory';
import { TemperatureSensorServiceFactory } from './serviceFactory/sensor/temperatureSensorServiceFactory';

export class ScoutPlatformPlugin implements DynamicPlatformPlugin {
    public static PLUGIN_NAME = 'homebridge-scout';
    public static PLATFORM_NAME = 'ScoutAlarm';

    private readonly orchestrator: Orchestrator;

    public constructor(logger: Logging, config: PlatformConfig, api: API) {
        const pluginVersion = (JSON.parse(fs.readFileSync(require.resolve('../package.json'), 'utf8')) as Record<string, unknown>).version as string;

        logger.info(`Running ${config.platform}-${pluginVersion} on homebridge-${api.serverVersion}.`);

        this.orchestrator = new Orchestrator(api, logger, config, new HomebridgeContextFactory(), new ScoutContextFactory(), (homebridge, scout) => [
            new SecuritySystemAccessoryFactory(homebridge, scout, [
                new BatteryServiceFactory(homebridge, scout),
                new SecuritySystemServiceFactory(homebridge, scout),
                new TemperatureServiceFactory(homebridge, scout),
            ]),
            new SensorAccessoryFactory(homebridge, scout, [
                new ContactSensorServiceFactory(homebridge, scout),
                new MotionSensorServiceFactory(homebridge, scout),
                new LeakSensorServiceFactory(homebridge, scout),
                new SmokeSensorServiceFactory(homebridge, scout),
                new HumiditySensorServiceFactory(homebridge, scout),
                new TemperatureSensorServiceFactory(homebridge, scout),
            ]),
        ]);
    }

    public configureAccessory(accessory: PlatformAccessory): void {
        this.orchestrator.configureAccessory(accessory);
    }
}
