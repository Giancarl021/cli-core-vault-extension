export = VaultExtension;

// From @giancarl021/cli-core

type Flag = boolean | string | number;
type HasFlagHelper = (flagName: string, ...aliases: string[]) => boolean;
type GetFlagHelper = (flagName: string, ...aliases: string[]) => Flag;
type WhichFlagHelper = (flagName: string, ...aliases: string[]) => string;
type GetArgAtHelper = (index: number) => string;
type HasArgAtHelper = (index: number) => boolean;
type CloneArgsHelper = () => string[];
type ValueOrDefaultHelper = (value: any, defaultValue: any) => any;

interface CommandHelpers {
    hasFlag: HasFlagHelper;
    getFlag: GetFlagHelper;
    whichFlag: WhichFlagHelper;
    getArgAt: GetArgAtHelper;
    hasArgAt: HasArgAtHelper;
    cloneArgs: CloneArgsHelper;
    valueOrDefault: ValueOrDefaultHelper;
}

// Native types

type VaultExtensionBuilder = () => VaultExtensionCallbacks;
type SetSecretCallback = (this: VaultCallbackInternal, key: string, value: string) => Promise<void>;
type GetSecretCallback = (this: VaultCallbackInternal, key: string) => Promise<string>;
type RemoveSecretCallback = (this: VaultCallbackInternal, key: string) => Promise<void>;
type SetDataCallback = (this: VaultCallbackInternal, key: string, value: any) => void;
type GetDataCallback = (this: VaultCallbackInternal, key: string) => any;
type RemoveDataCallback = (this: VaultCallbackInternal, key: string) => void;

interface VaultCallbackInternal {
    context?: any;
    helpers: CommandHelpers;
    appName: string;
}

interface VaultExtensionCallbacks {
    setSecret: SetSecretCallback;
    getSecret: GetSecretCallback;
    removeSecret: RemoveSecretCallback;
    setData: SetDataCallback;
    getData: GetDataCallback;
    removeData: RemoveDataCallback;
}
interface VaultExtensionOptions {
    dataPath?: string;
    baseData?: object;
}

interface VaultExtension {
    name: string;
    builder: VaultExtensionBuilder;
}


declare function VaultExtension(options?: VaultExtensionOptions): VaultExtension;
