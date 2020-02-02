export enum ModesConfigKey {
    Stay = "stay",
    Away = "away",
    Night = "night",
}

export declare type ModesConfig = {
    [K in ModesConfigKey]: string;
}

export declare class Config {
    modes: ModesConfig;
}
