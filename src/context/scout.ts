import { AuthenticatedApi, LocationListener, AuthenticatorFactory } from 'scout-api';
import { HomebridgeContext } from './homebridge';

export interface ScoutContext {
    memberId: Promise<string>;
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
            memberId: new Promise((resolve, reject) => {
                authenticator
                    .getPayload()
                    .then(payload => resolve(payload.id))
                    .catch(reject);
            }),
            api: new AuthenticatedApi({
                apiKey: (): Promise<string> => authenticator.getToken(),
            }),
            listener: new LocationListener(authenticator),
        };
    }
}
