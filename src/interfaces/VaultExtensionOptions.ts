import type StorageEngine from './StorageEngine.js';

/**
 * Options for configuring the Vault extension.
 *
 * @template Schema - The type of the data schema to be stored.
 */
export default interface VaultExtensionOptions<
    Schema extends object = Record<string, any>,
    TempSchema extends object = Record<string, any>
> {
    /**
     * The storage engine factory function to be used for persistent and temporary storage.
     * If not provided, a default file-based storage engine will be used.
     * The library provides two native storage engines: `FileStorage` and `MemoryStorage`.
     *
     * @param path The data path where the storage engine will store its data.
     * @param initialData Optional initial data to populate the storage if it is empty.
     * @returns A storage engine instance.
     *
     * @example
     * ```ts
     * // Using MemoryStorage
     * import { MemoryStorageFactory } from '@giancarl021/cli-core-vault-extension';
     *
     * const options = {
     *   storageEngine: MemoryStorageFactory()
     * };
     * ```
     * };
     */
    storageEngine(
        path: string,
        initialData?: Schema | TempSchema
    ): StorageEngine<Schema | TempSchema>;
    /**
     * Initial data to populate the storage with if the storage is empty.
     */
    initialData?: Schema;
    /**
     * Initial data to populate the temporary storage with if the storage is empty.
     */
    tempInitialData?: TempSchema;
    /**
     * Whether to destroy the temporary storage directory when the application exits.
     * Default is `false`.
     */
    destroyTempOnExit: boolean;
    /**
     * The file path for persistent storage.
     * If the file or its parent directories do not exist, they will be created.
     * Default is `<home-dir>/.<app-name>/data.json`, where `<app-name>` is the name of the application
     * and `<home-dir>` is the user's home directory.
     */
    dataPath: string;
    /**
     * The directory path for temporary storage.
     * If the directory does not exist, it will be created.
     * Default is `<temp-dir>/.<app-name>`, where `<app-name>` is the name of the application
     * and `<temp-dir>` is the operating system's temporary directory.
     */
    tempPath: string;
}
