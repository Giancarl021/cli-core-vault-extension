import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './VaultExtensionSchema.js';

/**
 * Options for configuring the Vault extension.
 *
 * @template Schema - The type of the data schema to be stored.
 */
export default interface VaultExtensionOptions {
    /**
     * Whether to enable lazy initialization of the storage engines.
     * If `true`, the storage engine will only be initialized when it is first accessed.
     * If `false`, the storage engine will be initialized immediately when the extension is loaded.
     * Default is `true`.
     *
     * This is useful for applications that may not always need to access the storage,
     * allowing them to avoid unnecessary setup and resource usage if the storage is never used.
     * However, if the application always needs to access the storage, setting this to `false`
     * can help catch configuration errors early during startup.
     */
    lazyInitialization: boolean;
    /**
     * Initial data to populate the storage with if the storage is empty.
     */
    initialData: VaultExtensionSchema;
    /**
     * Initial data to populate the temporary storage with if the storage is empty.
     */
    tempInitialData: VaultExtensionTempSchema;
    /**
     * Whether to destroy the temporary storage directory when the application exits.
     * Default is `false`.
     */
    destroyTempOnExit: boolean;
    /**
     * The file path for persistent storage.
     * If the file or its parent directories do not exist, they will be created.
     * Default is `<home-dir>/.<app-name>`, where `<app-name>` is the name of the application
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
