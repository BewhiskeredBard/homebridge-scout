import { AuthenticatedApi, LocationListener, AuthenticatorFactory } from "scout-api";
import { HomebridgeContext } from "./homebridge";

export interface ScoutContext {
    memberId: string;
    api: AuthenticatedApi;
    listener: LocationListener;
}

export class ScoutContextFactory {
    public async create(homebridge: HomebridgeContext): Promise<ScoutContext> {
        const authenticator = await new AuthenticatorFactory().create({
            email: homebridge.config.auth.email,
            password: homebridge.config.auth.password,
        });

        return {
            memberId: authenticator.getPayload().id,
            api: new AuthenticatedApi({
                apiKey: (): string => authenticator.getToken(),
            }),
            listener: new LocationListener(authenticator),
        };
    }
}
