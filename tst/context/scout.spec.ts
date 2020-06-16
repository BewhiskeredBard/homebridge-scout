import { AuthenticatedApi, ConfigurationParameters, LocationListener, AuthenticatorFactory, Authenticator } from 'scout-api';
import { ScoutContextFactory } from '../../src/context';
import * as mocks from '../mocks';

jest.mock('scout-api');

describe(`${ScoutContextFactory.name}`, () => {
    test('.create()', async () => {
        const AuthenticatedApiMock = AuthenticatedApi as jest.Mock<AuthenticatedApi>;
        const AuthenticatorFactoryMock = (AuthenticatorFactory as unknown) as jest.Mock<AuthenticatorFactory>;
        const LocationListenerMock = LocationListener as jest.Mock<LocationListener>;

        const token = 'token1';
        const memberId = 'memberId1';
        const homebridge = mocks.mockHomebridgeContext();
        const scoutContextFactory = new ScoutContextFactory();
        const authenticatorFactory = {
            create: jest.fn() as unknown,
        } as AuthenticatorFactory;
        const authenticator = {
            getToken: () => token,
            getPayload: () => {
                return {
                    id: memberId,
                };
            },
            refresh: jest.fn() as unknown,
        } as Authenticator;
        const authenticatedApi = {} as AuthenticatedApi;
        const locationListener = {} as LocationListener;

        AuthenticatedApiMock.mockImplementation((arg: ConfigurationParameters) => {
            expect(arg.apiKey).toBeDefined();
            if (typeof arg.apiKey === 'string') {
                expect(arg.apiKey).toEqual(token);
            } else if (undefined !== arg.apiKey) {
                expect(arg.apiKey('foo')).toEqual(token);
            }

            return authenticatedApi;
        });

        AuthenticatorFactoryMock.mockImplementation(() => authenticatorFactory);

        LocationListenerMock.mockImplementation(arg => {
            expect(arg).toBe(authenticator);

            return locationListener;
        });

        (authenticatorFactory.create as jest.Mock).mockImplementation(() => authenticator);

        const scoutContext = await scoutContextFactory.create(homebridge);

        expect(scoutContext.api).toBe(authenticatedApi);
        expect(scoutContext.listener).toBe(locationListener);
        expect(scoutContext.memberId).toEqual(memberId);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(authenticator.refresh as jest.Mock).toBeCalled();
    });
});
