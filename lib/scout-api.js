const JWT = require('jsonwebtoken');
const request = require('request-promise-native');

const BASE_URL = 'https://api.scoutalarm.com/';

function buildPath() {
    return Array.from(arguments).join('/');
}

function ScoutApi(options) {
    this.email = options.email;
    this.password = options.password;
    this.request = request.defaults({
        baseUrl: BASE_URL,
        json: true,
    });
}

ScoutApi.prototype.auth = async function() {
    if (this.jwt) {
        let expires = new Date(JWT.decode(this.jwt).exp * 1000);
        let now = new Date();

        if (now.getTime() > expires.getTime()) {
            console.info("Scout API JWT has expired.");

            this.jwt = null;
        }
    }

    if (!this.jwt) {
        console.info("Requesting a new Scout API auth token…");

        let result = (await this.request({
            uri: 'auth',
            method: 'POST',
            body: {
                email: this.email,
                password: this.password,
            },
        }));

        this.jwt = result.jwt;
    }

    return this.jwt;
};

ScoutApi.prototype.getMemberLocations = async function() {
    let jwt = await this.auth();
    let memberId = JWT.decode(jwt).id;

    return await this.request({
        uri: buildPath('members', memberId, 'locations'),
        headers: {
            Authorization: jwt,
        },
    });
};

ScoutApi.prototype.getLocationHub = async function(locationId) {
    let jwt = await this.auth();

    return await this.request({
        uri: buildPath('locations', locationId, 'hub'),
        headers: {
            Authorization: jwt,
        },
    });
};

ScoutApi.prototype.getLocationDevices = async function(locationId) {
    let jwt = await this.auth();

    return await this.request({
        uri: buildPath('locations', locationId, 'devices'),
        headers: {
            Authorization: jwt,
        },
    });
};

ScoutApi.prototype.getLocationModes = async function(locationId) {
    let jwt = await this.auth();

    return await this.request({
        uri: buildPath('locations', locationId, 'modes'),
        headers: {
            Authorization: jwt,
        },
    });
};

ScoutApi.prototype.setMode = async function(modeId, arm) {
    let jwt = await this.auth();

    return await this.request({
        uri: buildPath('modes', modeId),
        method: 'POST',
        headers: {
            Authorization: jwt,
        },
        body: {
            state: arm ? 'arming' : 'disarm',
        },
    });
};

module.exports = ScoutApi;
