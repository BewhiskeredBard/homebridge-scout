const Scout = require('scout-api');

function ScoutApi(logger, email, password) {
    this.logger = logger;
    this.authenticator = new Scout.AuthenticatorFactory().create({
        email,
        password,
    });
}

ScoutApi.prototype.auth = async function() {
    return (await this.authenticator).getToken();
};

ScoutApi.prototype.getMemberId = async function() {
    return (await this.authenticator).getPayload().id;
};

ScoutApi.prototype.getMemberLocations = async function() {
    let jwt = await this.auth();
    let memberId = await this.getMemberId();

    return (await new Scout.LocationsApi({
        apiKey: jwt,
    }).getLocations(memberId)).data;
};

ScoutApi.prototype.getLocationHub = async function(locationId) {
    let jwt = await this.auth();

    return (await new Scout.LocationsApi({
        apiKey: jwt,
    }).getHub(locationId)).data;
};

ScoutApi.prototype.getLocationDevices = async function(locationId) {
    let jwt = await this.auth();

    return (await new Scout.LocationsApi({
        apiKey: jwt,
    }).getDevices(locationId)).data;
};

ScoutApi.prototype.getLocationModes = async function(locationId) {
    let jwt = await this.auth();

    return (await new Scout.LocationsApi({
        apiKey: jwt,
    }).getModes(locationId)).data;
};

ScoutApi.prototype.chirpHub = async function(hubId) {
    let jwt = await this.auth();

    return (await new Scout.HubsApi({
        apiKey: jwt,
    }).setChirp(hubId, {
        type: Scout.HubChirpType.Single,
    })).data;
};

ScoutApi.prototype.setMode = async function(modeId, arm) {
    let jwt = await this.auth();

    return (await new Scout.ModesApi({
        apiKey: jwt,
    }).toggleRecipe(modeId, {
        state: arm ? Scout.ModeStateUpdateType.Arming : Scout.ModeStateUpdateType.Disarm,
    })).data;
};

ScoutApi.prototype.subscribe = async function() {
    return new Scout.LocationListener(await this.authenticator);
};

module.exports = ScoutApi;
