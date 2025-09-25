import { AsyncEntry } from '@napi-rs/keyring';
import FSEntryFactoryBuilder from './FSEntryFactoryBuilder.js';
import type SecretEntry from '../interfaces/SecretEntry.js';
import type { SecretEntryFactory } from '../interfaces/SecretEntry.js';

/**
 * Type of the SecretStorage instance.
 */
export type SecretStorageInstance = ReturnType<typeof SecretStorage>;

/**
 * Options for fallback storage using the filesystem.
 */
export interface FallbackStorageOptions {
    /**
     * Whether to use filesystem fallback storage.
     */
    useFilesystem: true;
    /**
     * Encryption key to use for encrypting the secrets in the filesystem.
     * It is recommended to use a strong, random key.
     */
    encryptionKey: string;
    /**
     * Path to the file where secrets will be stored if using filesystem fallback.
     * If the file or its parent directories do not exist, they will be created.
     * Default is `<home-dir>/.<app-name>/secrets.enc`, where `<app-name>` is the name of the application
     * and `<home-dir>` is the user's home directory.
     */
    filePath: string;
    /**
     * Whether to enable lazy initialization of the storage engine.
     * If `true`, the storage engine will only be initialized when it is first accessed.
     * If `false`, the storage engine will be initialized immediately when the SecretStorage is created.
     * Default is `true`.
     *
     * This is useful for applications that may not always need to access the secret storage,
     * allowing them to avoid unnecessary setup and resource usage if the storage is never used.
     * However, if the application always needs to access the secret storage, setting this to `false`
     * can help catch configuration errors early during startup.
     */
    lazyInitialization: boolean;
}

// Factory that creates a SecretEntry using the system keychain.
const KeyringEntryFactory: SecretEntryFactory = (appName, key) =>
    new AsyncEntry(appName, key) as SecretEntry;

/**
 * Secret storage service.
 * @param appName The name of the application using the secret storage.
 * @returns An object with methods to get, set, and remove secrets.
 */
export default function SecretStorage(
    appName: string,
    fallbackStorageOptions?: FallbackStorageOptions
) {
    let initialized = false;
    let EntryFactory: SecretEntryFactory;

    /**
     * Initialize the storage engine if not already initialized.
     * @remarks If using filesystem fallback, this will set up the necessary file and encryption.
     * Otherwise this initialization will result in a no-op.
     */
    function _init(): void {
        if (initialized) return;

        if (!fallbackStorageOptions || !fallbackStorageOptions.useFilesystem) {
            EntryFactory = KeyringEntryFactory;
            initialized = true;
            return;
        }

        EntryFactory = FSEntryFactoryBuilder(
            fallbackStorageOptions.filePath,
            fallbackStorageOptions.encryptionKey
        );
        initialized = true;
    }

    // Initialize immediately if lazyInitialization is `false` or
    // if using system keychain
    if (!fallbackStorageOptions?.lazyInitialization) {
        _init();
    }

    /**
     * Get a secret value by its key.
     * @param key The key of the secret to retrieve.
     * @returns The secret value, or undefined if not found.
     */
    async function get(key: string): Promise<string | undefined> {
        _init();
        const entry = EntryFactory(appName, key);
        let password: string | undefined;
        try {
            password = (await entry.getPassword()) ?? undefined;
        } catch (err) {
            const _err = err as Error;

            throw new Error(
                `Failed to access the system keychain. Make sure your environment supports it: ${_err.message}`
            );
        }

        return password;
    }

    /**
     * Set a secret value by its key.
     * @param key The key of the secret to set.
     * @param value The secret value to store.
     */
    async function set(key: string, value: string): Promise<void> {
        _init();
        const entry = EntryFactory(appName, key);

        try {
            await entry.setPassword(value);
        } catch (err) {
            const _err = err as Error;

            throw new Error(
                `Failed to access the system keychain. Make sure your environment supports it: ${_err.message}`
            );
        }
    }

    /**
     * Remove a secret by its key.
     * @param key The key of the secret to remove.
     */
    async function remove(key: string): Promise<void> {
        _init();

        const entry = EntryFactory(appName, key);

        try {
            await entry.deletePassword();
        } catch (err) {
            const _err = err as Error;

            throw new Error(
                `Failed to access the system keychain. Make sure your environment supports it: ${_err.message}`
            );
        }
    }

    return {
        /**
         * Get a secret value by its key.
         * @param key The key of the secret to retrieve.
         * @returns The secret value, or undefined if not found.
         */
        get,
        /**
         * Set a secret value by its key.
         * @param key The key of the secret to set.
         * @param value The secret value to store.
         */
        set,
        /**
         * Remove a secret by its key.
         * @param key The key of the secret to remove.
         */
        remove
    };
}
