export interface CommandHelpers {
    hasFlag: HasFlagHelper;
    getFlag: GetFlagHelper;
    whichFlag: WhichFlagHelper;
    getArgAt: GetArgAtHelper;
    hasArgAt: HasArgAtHelper;
    cloneArgs: CloneArgsHelper;
    valueOrDefault: ValueOrDefaultHelper;
}

// From @giancarl021/cli-core

type Flag = boolean | string | number;
type HasFlagHelper = (flagName: string, ...aliases: string[]) => boolean;
type GetFlagHelper = (flagName: string, ...aliases: string[]) => Flag;
type WhichFlagHelper = (flagName: string, ...aliases: string[]) => string;
type GetArgAtHelper = (index: number) => string;
type HasArgAtHelper = (index: number) => boolean;
type CloneArgsHelper = () => string[];
type ValueOrDefaultHelper = (value: any, defaultValue: any) => any;

// Native types

export type VaultExtensionBuilder = () => VaultExtensionCallbacks;
export type SetSecretCallback = (this: VaultCallbackInternal, key: string, value: string) => Promise<void>;
export type GetSecretCallback = (this: VaultCallbackInternal, key: string) => Promise<string>;
export type RemoveSecretCallback = (this: VaultCallbackInternal, key: string) => Promise<void>;
export type SetDataCallback = (this: VaultCallbackInternal, key: string, value: any) => void;
export type GetDataCallback = (this: VaultCallbackInternal, key: string) => any;
export type RemoveDataCallback = (this: VaultCallbackInternal, key: string) => void;
export type CompatibilityFunction = (this: VaultCallbackInternal,...args: any[]) => Promise<any> | any;

export interface VaultCallbackInternal {
    context?: any;
    helpers: CommandHelpers;
    appName: string;
}

export interface VaultExtensionCallbacks {
    setSecret: SetSecretCallback;
    getSecret: GetSecretCallback;
    removeSecret: RemoveSecretCallback;
    setData: SetDataCallback;
    getData: GetDataCallback;
    removeData: RemoveDataCallback;
    [callbackName: string]: CompatibilityFunction;
}
export interface VaultExtensionOptions {
    dataPath?: string;
    baseData?: object;
}

export interface VaultExtension {
    name: string;
    builder: VaultExtensionBuilder;
}