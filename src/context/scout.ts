import { AuthenticatedApi, Configuration, LocationListener, AuthenticatorFactory } from 'scout-api';
import { HomebridgeContext } from './homebridge';

export interface ScoutContext {
    api: AuthenticatedApi;
    listener: LocationListener;
}

export class ScoutContextFactory {
    public create(homebridge: HomebridgeContext): ScoutContext {
        const authenticator = new AuthenticatorFactory().create({
            email: homebridge.config.auth.email,
            password: homebridge.config.auth.password,
        });

        return {
            api: new AuthenticatedApi(
                new Configuration({
                    apiKey: (): Promise<string> => authenticator.getToken(),
                }),
            ),
            listener: new LocationListener(authenticator),
        };
    }
}
