import type StorageEngine from './StorageEngine';

export default interface VaultExtensionOptions<Schema extends object = Record<string, any>> {
    storageEngine: (path: string) => StorageEngine<Schema>;
    initialData?: Schema;
    destroyTempOnExit: boolean;
    dataPath: string;
    tempPath: string;
}