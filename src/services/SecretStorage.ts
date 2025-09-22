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
     * @returns The secret value, or undefined if not found.
     */
    function get(key: string): string | undefined {
        const entry = new Entry(appName, key);
        let password: string | undefined;
        try {
            password = entry.getPassword() ?? undefined;
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
    function set(key: string, value: string): void {
        const entry = new Entry(appName, key);

        try {
            entry.setPassword(value);
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
    function remove(key: string): void {
        const entry = new Entry(appName, key);

        try {
            entry.deletePassword();
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
