function Hub(homebridge, logger, scoutApi, modeIds, hub, modes) {
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
    this.modeIds = modeIds;
    this.hubId = hub.id;
    this.locationId = hub.location_id;
    this.accessoryInfo = new Service.AccessoryInformation();
    this.securitySystem = new Service.SecuritySystem(this.name);
    this.modeStates = {};

    modes.forEach(mode => {
        self.modeStates[mode.id] = mode.state;
    });

    this.accessoryInfo
            .setCharacteristic(Characteristic.Manufacturer, "Scout")
            .setCharacteristic(Characteristic.Model, hub.type)
            .setCharacteristic(Characteristic.SerialNumber, hub.serial_number)
            .setCharacteristic(Characteristic.FirmwareRevision, hub.reported.fw_version)
            .setCharacteristic(Characteristic.HardwareRevision, hub.reported.hw_version);

    this.autoUpdateValue(this.securitySystem, Characteristic.SecuritySystemCurrentState);
    this.autoUpdateValue(this.securitySystem, Characteristic.SecuritySystemTargetState);

    this.securitySystem.getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('set', function(value, callback) {
                self.setTargetState(value).then(() => callback()).catch(callback);
            });
}

Hub.prototype.identify = function(callback) {
    this.scoutApi.chirpHub(this.hubId).then(() => callback()).catch(callback);
}

Hub.prototype.onModeEvent = async function(event) {
    const Characteristic = this.homebridge.hap.Characteristic;

    this.modeStates[event.mode_id] = event.event;
    let values = await this.getCharacteristicValues();

    this.securitySystem.getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .updateValue(values[Characteristic.SecuritySystemCurrentState.UUID]);

    this.securitySystem.getCharacteristic(Characteristic.SecuritySystemTargetState)
            .updateValue(values[Characteristic.SecuritySystemTargetState.UUID]);
}

Hub.prototype.autoUpdateValue = function(service, characteristic) {
    let self = this;

    service.getCharacteristic(characteristic)
            .on('get', function(callback) {
                self.getCharacteristicValues()
                        .then(values => callback(null, values[characteristic.UUID]))
                        .catch(callback);
            });
}

Hub.prototype.getCharacteristicValues = async function() {
    const Characteristic = this.homebridge.hap.Characteristic;

    let self = this;

    let alarmedModeId = this.modeIds.filter(modeId => 'alarmed' == self.modeStates[modeId]).pop();
    let armedModeId = this.modeIds.filter(modeId => 'armed' == self.modeStates[modeId]).pop();
    let armingModeId = this.modeIds.filter(modeId => 'arming' == self.modeStates[modeId]).pop();

    let currentState = alarmedModeId ? 4 : (armedModeId ? this.modeIds.indexOf(armedModeId) : 3);
    let targetState = alarmedModeId
            ? this.modeIds.indexOf(alarmedModeId)
            : (armingModeId ? this.modeIds.indexOf(armingModeId) : currentState);

    return {
        [Characteristic.SecuritySystemCurrentState.UUID]: currentState,
        [Characteristic.SecuritySystemTargetState.UUID]: targetState,
    };
}

Hub.prototype.setTargetState = async function(value) {
    let self = this;

    if (3 == value) {
        let targetModeId = this.modeIds.filter(modeId => {
            return -1 != ['alarmed', 'arming', 'armed'].indexOf(self.modeStates[modeId]);
        }).pop();

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, false);
        }
    } else {
        let targetModeId = this.modeIds[value];

        if (targetModeId) {
            await this.scoutApi.setMode(targetModeId, true);
        } else {
            throw new Error("No matching mode for " + modeId);
        }
    }
}

Hub.prototype.getServices = function() {
    return [this.accessoryInfo, this.securitySystem];
};

module.exports = Hub;
