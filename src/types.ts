import type { Characteristic, Service, WithUUID } from 'homebridge';

export declare type CharacteristicConstructor<T> = WithUUID<(new () => Characteristic) & T>;

export declare type ServiceConstructor = WithUUID<typeof Service>;

export declare type RecursivePartial<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [P in keyof T]?: T[P] extends (infer U)[] ? RecursivePartial<U>[] : T[P] extends object ? RecursivePartial<T[P]> : T[P];
};
