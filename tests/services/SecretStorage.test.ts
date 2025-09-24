import { describe, expect, jest, test, afterEach } from '@jest/globals';

const store: Record<string, Record<string, string | null>> = {};

let entryThrows = false;

jest.unstable_mockModule('@napi-rs/keyring', () => ({
    AsyncEntry: class {
        serviceName: string;
        account: string;
        throws: boolean;

        constructor(serviceName: string, account: string) {
            if (!store[serviceName]) store[serviceName] = {};
            this.serviceName = serviceName;
            this.account = account;
            this.throws = entryThrows;
        }

        async getPassword(): Promise<string | null> {
            if (this.throws) {
                throw new Error('Simulated keychain access error');
            }
            return store[this.serviceName][this.account] || null;
        }

        async setPassword(value: string): Promise<void> {
            if (this.throws) {
                throw new Error('Simulated keychain access error');
            }

            store[this.serviceName][this.account] = value;
        }

        async deletePassword(): Promise<void> {
            if (this.throws) {
                throw new Error('Simulated keychain access error');
            }

            store[this.serviceName][this.account] = null;
        }
    }
}));

const { default: SecretStorage } = await import(
    '../../src/services/SecretStorage.js'
);

afterEach(() => {
    for (const key in store) {
        delete store[key];
    }
});

describe('[UNIT] services/SecretStorage', () => {
    test('Should set, get, and remove a secret', async () => {
        const secretStorage = SecretStorage('my-app');

        await expect(secretStorage.get('my-secret')).resolves.toBeUndefined();
        await secretStorage.set('my-secret', 'secret-value');
        await expect(secretStorage.get('my-secret')).resolves.toBe(
            'secret-value'
        );
        await secretStorage.remove('my-secret');
        await expect(secretStorage.get('my-secret')).resolves.toBeUndefined();
    });

    test('Should handle errors when accessing the keychain', async () => {
        entryThrows = true;

        const secretStorage = SecretStorage('my-app');

        await expect(secretStorage.get('my-secret')).rejects.toThrow(
            /Failed to access the system keychain/
        );
        await expect(secretStorage.set('my-secret', 'value')).rejects.toThrow(
            /Failed to access the system keychain/
        );
        await expect(secretStorage.remove('my-secret')).rejects.toThrow(
            /Failed to access the system keychain/
        );

        entryThrows = false;
    });
});
