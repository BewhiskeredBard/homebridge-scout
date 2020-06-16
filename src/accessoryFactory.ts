import type { PlatformAccessory, Categories, Service } from 'homebridge';
import { ConnectionState, ConnectionStateEvent, LocationEventType } from 'scout-api';
import { HomebridgeContext, ScoutContext } from './context';
import { ServiceFactory } from './serviceFactory';
import { ServiceConstructor } from './types';

export interface AccessoryInfo<T> {
    name: string;
    id: string;
    category: Categories;
    context: T;
    manufacturer: string;
    model: string;
    serialNumber: string;
    firmwareRevision: string;
    hardwareRevision?: string;
}

export interface AccessoryContext<T> {
    readonly locationId: string;
    readonly custom: T;
    isConnected: boolean;
}

export interface TypedPlatformAccessory<T> extends PlatformAccessory {
    context: AccessoryContext<T>;
}

export abstract class AccessoryFactory<T> {
    private readonly configuredAccessories = new Set<TypedPlatformAccessory<T>>();

    public constructor(
        protected readonly homebridge: HomebridgeContext,
        protected readonly scout: ScoutContext,
        protected readonly serviceFactories: ServiceFactory<T>[],
    ) {
        this.scout.listener.on(LocationEventType.ConnectionState, event => {
            this.onConnectionStateEvent(event);
        });

        this.addLocationListeners();
    }

    public async createAccessories(locationId: string): Promise<TypedPlatformAccessory<T>[]> {
        return (await this.createAccessoryInfo(locationId)).map(accessoryInfo => this.createAccessory(locationId, accessoryInfo));
    }

    public configureAccessory(accessory: TypedPlatformAccessory<T>): void {
        const context = accessory.context;
        const services = new Set([this.homebridge.api.hap.Service.AccessoryInformation.UUID]);

        this.serviceFactories.forEach(serviceFactory => {
            const serviceConstructor = serviceFactory.getService(context);

            if (serviceConstructor !== undefined) {
                const service = this.getService(accessory, serviceConstructor);

                serviceFactory.configureService(service, context);

                services.add(service.UUID);
            }
        });

        accessory.services.forEach(service => {
            if (!services.has(service.UUID)) {
                accessory.removeService(service);
            }
        });

        this.configuredAccessories.add(accessory);
    }

    protected addLocationListeners(): void {
        return;
    }

    protected createAccessory(locationId: string, accessoryInfo: AccessoryInfo<T>): TypedPlatformAccessory<T> {
        const Characteristic = this.homebridge.api.hap.Characteristic;
        const AccessoryInformation = this.homebridge.api.hap.Service.AccessoryInformation;

        const generateId = this.homebridge.api.hap.uuid.generate;
        const uuid = generateId(accessoryInfo.id);
        const platformAccessory = this.homebridge.api.platformAccessory;
        const accessory = new platformAccessory(accessoryInfo.name, uuid, accessoryInfo.category) as TypedPlatformAccessory<T>;
        const accessoryInfoService = accessory.getService(AccessoryInformation);

        if (accessoryInfoService) {
            accessoryInfoService
                .setCharacteristic(Characteristic.Manufacturer, accessoryInfo.manufacturer)
                .setCharacteristic(Characteristic.Model, accessoryInfo.model)
                .setCharacteristic(Characteristic.SerialNumber, accessoryInfo.serialNumber)
                .setCharacteristic(Characteristic.FirmwareRevision, accessoryInfo.firmwareRevision);

            if (undefined !== accessoryInfo.hardwareRevision) {
                accessoryInfoService.setCharacteristic(Characteristic.HardwareRevision, accessoryInfo.hardwareRevision);
            }
        }

        accessory.context = {
            locationId,
            custom: accessoryInfo.context,
            isConnected: ConnectionState.Connected === this.scout.listener.getConnectionState(),
        };

        return accessory;
    }

    protected updateAccessory(accessory: TypedPlatformAccessory<T>): void {
        this.serviceFactories.forEach(serviceFactory => {
            const serviceConstructor = serviceFactory.getService(accessory.context);

            if (serviceConstructor !== undefined) {
                const service = this.getService(accessory, serviceConstructor);

                serviceFactory.updateService(service, accessory.context);
            }
        });
    }

    protected onConnectionStateEvent(event: ConnectionStateEvent): void {
        this.homebridge.logger.debug(`Connection state event: ${JSON.stringify(event)}`);

        this.configuredAccessories.forEach(accessory => {
            accessory.context.isConnected = ConnectionState.Connected === event.current;

            this.updateAccessory(accessory);
        });
    }

    private getService(accessory: TypedPlatformAccessory<T>, serviceConstructor: ServiceConstructor): Service {
        let service = accessory.getService(serviceConstructor);

        if (!service) {
            service = accessory.addService(serviceConstructor);
        }

        return service;
    }

    protected abstract createAccessoryInfo(locationId: string): Promise<AccessoryInfo<T>[]>;
}
