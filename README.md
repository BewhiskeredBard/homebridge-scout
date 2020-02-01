# homebridge-scout

A [Homebridge](https://homebridge.io/) plug-in that enables HomeKit integration for the [Scout](https://scoutalarm.com/) security system.

[![build status](https://img.shields.io/github/workflow/status/jordanryanmoore/homebridge-scout/Build)](https://github.com/jordanryanmoore/homebridge-scout/actions?query=workflow%3ABuild)
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

* **`platform`:** Must be `ScoutAlarm`.
* **`auth`:** Your Scout login credentials. Use a member account, not an admin account.
  * **`email`:** Your Scout email.
  * **`password`:** Your Scout password. Don't forget to backslash-escape any quotes.
* **`location`:** The name of your Scout location. It's probably `Home` if you only have one Scout system and haven't renamed it. You can find this in the left-hand menu of the Scout app or dashboard.
* **`modes`:** These map the HomeKit modes to your Scout mode names. These can also be found in the left-hand menu of the Scout app or dashboard.
  * **`stay`:** Probably `Home`.
  * **`away`:** Probably `Away`.
  * **`night`:** You should add one to your Scout system if you don't have one, but you *can* use the same value you did for `stay` here.

#### Optional

The following configuration options are optional and change the default behavior.

* **`reverseSensorState`:** V1 Scout systems can get into a state where all of the sensor states are reversed. If this option is set to `true`, it reverses the sensor state of access sensors, door panels, and motion sensors reported to HomeKit so they work correctly in this scenario.

### Example

Update the `platforms` section of your `~/.homebridge/config.json`:

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
        "away": "Away",
        "night": "Night"
      }
    }
  ]
}
```

## Device Support

This plug-in currently offers support for the Scout hub and any of the following device types:

* door panels
* access sensors
* motion sensors
* water sensors
* smoke alarms

If you have device types that are not yet supported (glass break sensors, cameras, etc.), please [get in touch](https://github.com/jordanryanmoore/homebridge-scout/issues). The biggest barrier to adding support is just having access to the devices.

## Credits

* [@jordanryanmoore](https://github.com/jordanryanmoore), the original author.
* [@Tom2527](https://github.com/Tom2527), for their assistance in debugging and testing v1 hardware support.
* [Scout Security Inc](https://www.scoutalarm.com), for providing a well-designed API *and* supplying free hardware for this project.
