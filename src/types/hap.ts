import type { Characteristic, Service, WithUUID } from "homebridge";

export declare type CharacteristicConstructor<T> = WithUUID<(new () => Characteristic) & T>;
export declare type ServiceConstructor = WithUUID<typeof Service>;
