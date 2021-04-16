![homebridge-scout](https://raw.githubusercontent.com/BewhiskeredBard/homebridge-scout/master/logo.png)

A [Homebridge](https://homebridge.io/) plug-in that enables HomeKit integration for the [Scout](https://scoutalarm.com/) security system.

![demo](https://raw.githubusercontent.com/BewhiskeredBard/homebridge-scout/master/demo.gif)

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![build status](https://img.shields.io/github/workflow/status/BewhiskeredBard/homebridge-scout/Build)](https://github.com/BewhiskeredBard/homebridge-scout/actions?query=workflow%3ABuild)
[![test coverage](https://img.shields.io/codecov/c/github/BewhiskeredBard/homebridge-scout)](https://codecov.io/gh/BewhiskeredBard/homebridge-scout)
[![npm version](https://img.shields.io/npm/v/homebridge-scout)](https://npmjs.com/package/homebridge-scout)
[![npm downloads](https://img.shields.io/npm/dw/homebridge-scout)](https://npmjs.com/package/homebridge-scout)
[![license](https://img.shields.io/npm/l/homebridge-scout)](https://npmjs.com/package/homebridge-scout)

## Table of Contents

* [Installation](#installation)
* [Configuration](#configuration)
* [Device Support](#device-support)
* [Credits](#credits)

## Installation

1. [Install Homebridge](https://www.npmjs.com/package/homebridge#installation).

2. Install this plug-in: `npm install -g homebridge-scout`

3. Update your Homebridge configuration file (`~/.homebridge/config.json`). See configuration options below.

## Configuration

### Options

#### Required

All of the following configuration options are required. If any are missing or invalid, Homebridge will log an error message describing the problem.

* **`"platform"`:** Must be `"ScoutAlarm"`.

* **`"auth"`:** Your Scout login credentials. Use a member account, not an admin account.

  * **`"email"`:** Your Scout email.

  * **`"password"`:** Your Scout password. Don't forget to backslash-escape any double-quotes (e.g. `pwd"23` should be `"pwd\"123"`).

* **`"location"`:** The name of your Scout location. It's probably `"Home"` if you only have one Scout system and haven't renamed it. You can find this in the left-hand menu of the Scout app or dashboard.

#### Optional

The following configuration options are optional and change the default behavior.

* **`"modes"`:** If modes are defined, your Scout system will be added as a HomeKit security system. These map the HomeKit modes to your Scout modes. Your Scout mode names can be found in the Scout app or dashboard. Each HomeKit can be mapped to zero or more† Scout mode(s) (e.g., `[], ["Mode A"]` or `["Mode A", "Mode B"]`). If a HomeKit mode is empty or not provided, it will not be shown in Apple’s Home app.

  * **`"stay"`:** Possibly `["Home"]`.
  * **`"away"`:** Possibly `["Away"]`.
  * **`"night"`:** Possibly `["Night"]`.

  <small>† There are caveats to mapping a HomeKit mode to multiple Scout modes. Let's assume you have four Scout modes (*Home*, *Away*, *Vacation*, and *Night*) and have mapped the *Away* HomeKit mode to your *Away* and *Vacation* Scout modes. If you arm either the *Away* or *Vacation* Scout modes from the Scout app, HomeKit will report the mode as *Away* with no way to differentiate between the two. Additionally, if you arm the *Away* HomeKit mode via HomeKit, **the plug-in will arm whichever Scout mode is listed first**. There would be no way to arm your *Vacation* mode via HomeKit. This limitation is due to HomeKit's strict 3-mode design.</small>

* **`"triggerAlarmImmediately"`:** By default, HomeKit will not consider the alarm triggered until the (optional) alarm delay has expired. Enabling this option causes HomeKit to consider the alarm triggered immediately.

* **`"reverseSensorState"`:** V1 Scout systems can get into a state where all of the sensor states are reversed. If this option is set to `true`, it reverses the sensor state of access sensors, door panels, and motion sensors reported to HomeKit so they work correctly in this scenario.

### Example

Update the `"platforms"` section of your `~/.homebridge/config.json`:

```json
{
  "platforms": [
    {
      "platform": "ScoutAlarm",
      "auth": {
        "email": "email@example.com",
        "password": "password123"
      },
      "location": "Home",
      "modes": {
        "stay": ["Home"],
        "away": ["Away", "Vacation"],
        "night": ["Night"]
      }
    }
  ]
}
```

## Device Support

### Supported Devices

| Scout Device       | HomeKit Accessory Category | HomeKit Services                                                     |
|--------------------|----------------------------|----------------------------------------------------------------------|
| Hub                | SECURITY_SYSTEM            | SecuritySystem<br>BatteryService<br>TemperatureSensor¹               |
| Door Panel         | SENSOR                     | ContactSensor<br>HumiditySensor¹<br>TemperatureSensor¹               |
| Access Sensor      | SENSOR                     | ContactSensor<br>TemperatureSensor¹                                  |
| Motion Sensor¹     | SENSOR                     | MotionSensor<br>TemperatureSensor                                    |
| Water Sensor       | SENSOR                     | LeakSensor<br>TemperatureSensor                                      |
| Smoke Alarm        | SENSOR                     | SmokeSensor<br>CarbonMonoxideSensor²                                 |
| Key Pad            | SENSOR                     | HumiditySensor<br>TemperatureSensor                                  |

<small>¹ Not supported by Scout's original mesh-based hardware. These devices do not have humidity or temperature sensors, and the motion sensors do not properly trigger motion events.</small>

<small>² Only supported by First Alert's smoke/CO alarm — not by Scout's smoke-only alarm.</small>

### Unsupported Devices

| Scout Device          | Feature Request                                                      |
|-----------------------|----------------------------------------------------------------------|
| Glass Break Sensor    | [#27](https://github.com/BewhiskeredBard/homebridge-scout/issues/27) |
| Video Doorbell        | [#18](https://github.com/BewhiskeredBard/homebridge-scout/issues/18) |
| Indoor Camera         | [#17](https://github.com/BewhiskeredBard/homebridge-scout/issues/17) |
| Siren/Zigbee Repeater | [#26](https://github.com/BewhiskeredBard/homebridge-scout/issues/26) |
| Panic Button          |                                                                      |
| Remote Control        |                                                                      |

## Credits

* [@Tom2527](https://github.com/Tom2527), for their assistance in debugging and testing v1 hardware support.
* [Scout Security Inc](https://www.scoutalarm.com), for providing a open, well-designed API *and* supplying free motion and water sensors for this project.
