function Hub(homebridge, logger, scoutApi, hub, modeIds) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const Categories = homebridge.hap.Accessory.Categories;

    let self = this;

    this.name = "Security System";
    this.uuid_base = hub.id;
    this.category = Categories.SECURITY_SYSTEM;
    this.homebridge = homebridge;
    this.logger = logger;
    this.scoutApi = scoutApi;
    this.hubId = hub.id;
    this.locationId = hub.location_id;
    this.modeIds = modeIds;
    this.accessoryInfo = new Service.AccessoryInformation();
    this.securitySystem = new Service.SecuritySystem(this.name);

    this.accessoryInfo
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, hub.type)
            .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, hub.reported.fw_version)
            .setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version);

    this.securitySystem
            .getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .on('get', function(callback) {
                self.getCharacteristicValues()
                        .then(values => callback(null, values[Characteristic.SecuritySystemCurrentState]))
                        .catch(callback);
            });

    this.securitySystem
            .getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('get', function(callback) {
                self.getCharacteristicValues()
                        .then(values => callback(null, values[Characteristic.SecuritySystemTargetState]))
                        .catch(callback);
            })
            .on('set', function(value, callback) {
                self.setTargetState(value).then(() => callback()).catch(callback);
            });
}

Hub.prototype.identify = function(callback) {
    this.scoutApi.chirpHub(this.hubId).then(() => callback()).catch(callback);
}

Hub.prototype.onModeEvent = async function(data) {
    const Characteristic = this.homebridge.hap.Characteristic;
    
    let values = await this.getCharacteristicValues();

    this.securitySystem.getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .updateValue(values[Characteristic.SecuritySystemCurrentState]);

    this.securitySystem.getCharacteristic(Characteristic.SecuritySystemTargetState)
            .updateValue(values[Characteristic.SecuritySystemTargetState]);
}

Hub.prototype.getCharacteristicValues = async function() {
    const Characteristic = this.homebridge.hap.Characteristic;

    let modes = await this.getModes();
    let alarmedModeId = modes.filter(mode => mode.state == 'alarmed')
            .map(mode => mode.id)
            .pop();

    let armedModeId = modes.filter(mode => mode.state == 'armed')
            .map(mode => mode.id)
            .pop();

    let armingModeId = modes.filter(mode => mode.state == 'arming')
            .map(mode => mode.id)
            .pop();

    let currentState = alarmedModeId ? 4 : (armedModeId ? this.modeIds.indexOf(armedModeId) : 3);
    let targetState = alarmedModeId
            ? this.modeIds.indexOf(alarmedModeId)
            : (armingModeId ? this.modeIds.indexOf(armingModeId) : currentState);

    return {
        [Characteristic.SecuritySystemCurrentState]: currentState,
        [Characteristic.SecuritySystemTargetState]: targetState,
    };
}

Hub.prototype.getModes = async function() {
    return await this.scoutApi.getLocationModes(this.locationId);
}

Hub.prototype.setTargetState = async function(value) {
    let modes = await this.getModes();

    if (3 == value) {
        let targetMode = modes.filter(mode => mode.state == 'alarmed').pop();

        if (!targetMode) {
            targetMode = modes.filter(mode => mode.state == 'arming').pop();
        }

        if (!targetMode) {
            targetMode = modes.filter(mode => mode.state == 'armed').pop();
        }

        if (targetMode) {
            await this.scoutApi.setMode(targetMode.id, false);
        }
    } else {
        let modeId = this.modeIds[value];
        let targetMode = modes.filter(mode => mode.id == modeId).pop();

        if (targetMode) {
            await this.scoutApi.setMode(targetMode.id, true);
        } else {
            throw new Error("No matching mode for " + modeId);
        }
    }
}

Hub.prototype.getServices = function() {
    return [this.accessoryInfo, this.securitySystem];
};

module.exports = Hub;
