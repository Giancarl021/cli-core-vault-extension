import { Entry } from '@napi-rs/keyring';

/**
 * Type of the SecretStorage instance.
 */
export type SecretStorageInstance = ReturnType<typeof SecretStorage>;

/**
 * Secret storage service.
 * @param appName The name of the application using the secret storage.
 * @returns An object with methods to get, set, and remove secrets.
 */
export default function SecretStorage(appName: string) {
    /**
     * Get a secret value by its key.
     * @param key The key of the secret to retrieve.
     * @returns The secret value, or null if not found.
     */
    function get(key: string): string | null {
        const entry = new Entry(appName, key);
        return entry.getPassword();
    }

    /**
     * Set a secret value by its key.
     * @param key The key of the secret to set.
     * @param value The secret value to store.
     */
    function set(key: string, value: string): void {
        const entry = new Entry(appName, key);
        entry.setPassword(value);
    }

    /**
     * Remove a secret by its key.
     * @param key The key of the secret to remove.
     */
    function remove(key: string): void {
        const entry = new Entry(appName, key);
        entry.deletePassword();
    }

    return {
        /**
         * Get a secret value by its key.
         * @param key The key of the secret to retrieve.
         * @returns The secret value, or null if not found.
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
