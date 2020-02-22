# homebridge-scout

A [Homebridge](https://homebridge.io/) plug-in that enables HomeKit integration for the [Scout](https://scoutalarm.com/) security system.

![demo](https://raw.githubusercontent.com/jordanryanmoore/homebridge-scout/master/demo.gif)

[![build status](https://img.shields.io/github/workflow/status/jordanryanmoore/homebridge-scout/Build)](https://github.com/jordanryanmoore/homebridge-scout/actions?query=workflow%3ABuild)
[![test coverage](https://img.shields.io/codecov/c/github/jordanryanmoore/homebridge-scout)](https://codecov.io/gh/jordanryanmoore/homebridge-scout)
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

* **`"modes"`:** If present, this option will add your Scout system as a HomeKit security system. It maps the HomeKit modes to your Scout modes. Your Scout mode names can be found in the Scout app or dashboard. Each HomeKit mode must be mapped to one (or more†) Scout mode(s) (e.g., `"Mode A"` or `["Mode A", "Mode B"]`).

  * **`"stay"`:** Possibly `"Home"`.
  * **`"away"`:** Possibly `"Away"`.
  * **`"night"`:** Possibly `"Night"`.

  *† There are caveats to mapping a HomeKit mode to multiple Scout modes. Let's assume you have four Scout modes (**Home**, **Away**, **Vacation**, and **Night**) and have mapped the **Away** HomeKit mode to your **Away** and **Vacation** Scout modes. If you arm either the **Away** or **Vacation** Scout modes from the Scout app, HomeKit will report the mode as **Away** with no way to differentiate between the two. Additionally, if you arm the **Away** HomeKit mode via HomeKit, **the plug-in will arm whichever Scout mode is listed first**. There would be no way to arm your **Vacation** mode via HomeKit. This limitation is due to HomeKit's strict 3-mode design.*

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
        "stay": "Home",
        "away": ["Away", "Vacation"],
        "night": "Night"
      }
    }
  ]
}
```

## Device Support

| Scout Device       | HomeKit Services                                                     |
|--------------------|----------------------------------------------------------------------|
| Hub                | SecuritySystem<br>BatteryService<br>TemperatureSensor‡               |
| Door Panel         | ContactSensor<br>HumiditySensor‡<br>TemperatureSensor‡               |
| Access Sensor      | ContactSensor<br>TemperatureSensor‡                                  |
| Motion Sensor‡     | MotionSensor<br>TemperatureSensor                                    |
| Water Sensor       | LeakSensor<br>TemperatureSensor                                      |
| Smoke Alarm        | SmokeSensor                                                          |
| Glass Break Sensor | [#27](https://github.com/jordanryanmoore/homebridge-scout/issues/27) |
| Video Doorbell     | [#18](https://github.com/jordanryanmoore/homebridge-scout/issues/18) |
| Indoor Camera      | [#17](https://github.com/jordanryanmoore/homebridge-scout/issues/17) |

*‡ Not supported by Scout's original mesh-based hardware. These devices do not have humidity or temperature sensors, and the motion sensors do not properly trigger motion events.*

## Credits

* [@jordanryanmoore](https://github.com/jordanryanmoore), the original author.
* [@Tom2527](https://github.com/Tom2527), for their assistance in debugging and testing v1 hardware support.
* [Scout Security Inc](https://www.scoutalarm.com), for providing a open, well-designed API *and* supplying free motion and water sensors for this project.
