import * as Scout from "scout-api";
import * as Homebridge from "./homebridge";

export class ScoutApi {
    private readonly authenticator: Promise<Scout.Authenticator>;

    constructor(private readonly logger: Homebridge.Logger, email: string, password: string) {
        this.authenticator = new Scout.AuthenticatorFactory().create({
            email,
            password,
        });
    }

    private async auth(): Promise<string> {
        return (await this.authenticator).getToken();
    }

    public async getMemberId(): Promise<string> {
        return (await this.authenticator).getPayload().id;
    }

    public async getMemberLocations(): Promise<Scout.Location[]> {
        const jwt = await this.auth();
        const memberId = await this.getMemberId();

        return (await new Scout.LocationsApi({
            apiKey: jwt,
        }).getLocations(memberId)).data;
    }

    public async getLocationHub(locationId: string): Promise<Scout.Hub> {
        const jwt = await this.auth();

        return (await new Scout.LocationsApi({
            apiKey: jwt,
        }).getHub(locationId)).data;
    }

    public async getLocationDevices(locationId: string): Promise<Scout.Device[]> {
        const jwt = await this.auth();

        return (await new Scout.LocationsApi({
            apiKey: jwt,
        }).getDevices(locationId)).data;
    }

    public async getLocationModes(locationId: string): Promise<Scout.Mode[]> {
        const jwt = await this.auth();

        return (await new Scout.LocationsApi({
            apiKey: jwt,
        }).getModes(locationId)).data;
    }

    public async chirpHub(hubId: string): Promise<Scout.Hub> {
        const jwt = await this.auth();

        return (await new Scout.HubsApi({
            apiKey: jwt,
        }).setChirp(hubId, {
            type: Scout.HubChirpType.Single,
        })).data;
    }

    public async setMode(modeId: string, arm: boolean): Promise<Scout.Mode> {
        const jwt = await this.auth();

        return (await new Scout.ModesApi({
            apiKey: jwt,
        }).toggleRecipe(modeId, {
            state: arm ? Scout.ModeStateUpdateType.Arming : Scout.ModeStateUpdateType.Disarm,
        })).data;
    }

    public async subscribe(): Promise<Scout.LocationListener> {
        return new Scout.LocationListener(await this.authenticator);
    }
}
