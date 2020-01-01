# homebridge-scout

A [Homebridge](https://homebridge.io/) plug-in that enables HomeKit integration for the [Scout](https://scoutalarm.com/) security system.

## Installation

1. [Install Homebridge](https://www.npmjs.com/package/homebridge#installation).

2. Install this plug-in: `npm install -g homebridge-scout`

3. Update your Homebridge configuration file (`~/.homebridge/config.json`). See configuration options below.

## Configuration

### Options

All of the following configuration options are required. If any are missing or invalid, Homebridge will fail to start with an error message describing the problem.

* **`platform`:** Must be `ScoutAlarm`.
* **`auth`:** Your Scout login credentials. I recommend setting up a new non-administrator user for this purpose.
  * **`email`:** Your Scout email.
  * **`password`:** Your Scout password. Don't forget to slash-escape any quotes.
* **`location`:** The name of your Scout location. It's probably `Home` if you only have one Scout system and haven't renamed it. You can find this in the left-hand menu of the Scout app or dashboard.
* **`modes`:** These map the HomeKit modes to your Scout modes. These can also be found in the left-hand menu of the Scout app or dashboard.
  * **`stay`:** Probably `Home`.
  * **`away`:** Probably `Away`.
  * **`night`:** You may not have one. I recommend adding one to your Scout system if you don't, but you *can* use the same value you did for `stay` here.

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

If you have device types that are not yet supported (glass break sensors, cameras, etc.), [let me know](https://github.com/jordanryanmoore/homebridge-scout/issues). I'd love to add support for the remaining device types — I just don't own them personally, so I can't test them.

## Credits

* Authored by [@jordanryanmoore](https://github.com/jordanryanmoore).
* Special thanks to [@Tom2527](https://github.com/Tom2527) for their assistance in debugging and testing v1 hardware support.
