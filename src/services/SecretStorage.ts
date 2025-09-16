import { Entry } from '@napi-rs/keyring';

export type SecretStorageInstance = ReturnType<typeof SecretStorage>;

export default function SecretStorage(appName: string) {
    function get(key: string): string | null {
        const entry = new Entry(appName, key);
        return entry.getPassword();
    }

    function set(key: string, value: string): void {
        const entry = new Entry(appName, key);
        entry.setPassword(value);
    }

    function remove(key: string): void {
        const entry = new Entry(appName, key);
        entry.deletePassword();
    }

    return {
        get,
        set,
        remove
    };
}