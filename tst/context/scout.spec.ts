import { AuthenticatedApi, ConfigurationParameters, LocationListener, AuthenticatorFactory, Authenticator } from 'scout-api';
import { ScoutContextFactory } from '../../src/context';
import * as mocks from '../mocks';

jest.mock('scout-api');

describe(`${ScoutContextFactory.name}`, () => {
    test('.create()', async () => {
        const AuthenticatedApiMock = AuthenticatedApi as jest.Mock<AuthenticatedApi>;
        const AuthenticatorFactoryMock = AuthenticatorFactory as unknown as jest.Mock<AuthenticatorFactory>;
        const LocationListenerMock = LocationListener as jest.Mock<LocationListener>;

        const token = 'token1';
        const memberId = 'memberId1';
        const homebridge = mocks.mockHomebridgeContext();
        const scoutContextFactory = new ScoutContextFactory();
        const authenticatorFactory = {
            create: jest.fn() as unknown,
        } as AuthenticatorFactory;
        const authenticator = {
            getToken: () => Promise.resolve(token),
            getPayload: () => Promise.resolve({ id: memberId }),
        } as Authenticator;
        const authenticatedApi = {} as AuthenticatedApi;
        const locationListener = {} as LocationListener;
        let apiKey: string | Promise<string> | undefined;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        AuthenticatedApiMock.mockImplementation((arg: ConfigurationParameters) => {
            if (typeof arg.apiKey === 'string') {
                apiKey = arg.apiKey;
            } else if (typeof arg.apiKey === 'function') {
                apiKey = arg.apiKey('foo');
            }

            return authenticatedApi;
        });

        AuthenticatorFactoryMock.mockImplementation(() => authenticatorFactory);

        LocationListenerMock.mockImplementation(arg => {
            expect(arg).toBe(authenticator);

            return locationListener;
        });

        (authenticatorFactory.create as jest.Mock).mockImplementation(() => authenticator);

        const scoutContext = scoutContextFactory.create(homebridge);

        expect(scoutContext.api).toBe(authenticatedApi);
        expect(scoutContext.listener).toBe(locationListener);

        if (typeof apiKey === 'string') {
            expect(apiKey).toEqual(token);
        } else if (apiKey instanceof Promise) {
            await expect(apiKey).resolves.toEqual(token);
        }
    });
});
