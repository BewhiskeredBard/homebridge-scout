// TODO: This mapping should probably go into configuration somewhere…
const STATES = ['Home', 'Away', 'Night'];

function Hub(homebridge, logger, scoutApi, hub) {
    this.name = "Security System";
    this.homebridge = homebridge;
    this.logger = logger;
    this.scoutApi = scoutApi;
    this.hub = hub;
}

Hub.prototype.identify = function(callback) {
    callback();
}

Hub.prototype.getModes = async function() {
    return await this.scoutApi.getLocationModes(this.hub.location_id);
}

Hub.prototype.getCurrentState = async function() {
    let modes = await this.getModes();
    let armedMode = modes.filter(mode => mode.state == 'armed').pop();

    // TODO: handle alarming

    return armedMode ? STATES.indexOf(armedMode.name) : 3;
}

Hub.prototype.getTargetState = async function() {
    let modes = await this.getModes();
    let armingMode = modes.filter(mode => mode.state == 'arming').pop();

    if (armingMode) {
        return STATES.indexOf(armingMode.name);
    } else {
        let armedMode = modes.filter(mode => mode.state == 'armed').pop();

        return armedMode ? STATES.indexOf(armedMode.name) : 3;
    }
}

Hub.prototype.setTargetState = async function(value) {
    let modes = await this.getModes();

    if (3 == value) {
        let targetMode = modes.filter(mode => mode.state == 'arming').pop();

        if (!targetMode) {
            targetMode = modes.filter(mode => mode.state == 'armed').pop();
        }

        if (targetMode) {
            await this.scoutApi.setMode(targetMode.id, false);
        }
    } else {
        let modeName = STATES[value];

        let targetMode = modes.filter(mode => mode.name == modeName).pop();

        if (targetMode) {
            await this.scoutApi.setMode(targetMode.id, true);
        } else {
            throw new Error("No matching mode for " + modeName);
        }
    }
}

Hub.prototype.getServices = function() {
    const Service = this.homebridge.hap.Service;
    const Characteristic = this.homebridge.hap.Characteristic;

    let accessoryInfo = new Service.AccessoryInformation();
    let securitySystem = new Service.SecuritySystem("Security System");
    let self = this;

    accessoryInfo
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, this.hub.type)
            .setCharacteristic(Characteristic.SerialNumber, this.hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, this.hub.reported.fw_version);

    securitySystem
            .getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .on('get', function(callback) {
                self.getCurrentState().then(state => callback(null, state)).catch(callback);
            });

    securitySystem
            .getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('get', function(callback) {
                self.getTargetState().then(state => callback(null, state)).catch(callback);
            })
            .on('set', function(value, callback) {
                self.setTargetState(value).then(() => callback()).catch(callback);
            });

    return [accessoryInfo, securitySystem];
};

module.exports = Hub;
