import { describe, expect, jest, test, afterEach } from '@jest/globals';

const store: Record<string, Record<string, string | null>> = {};

let entryThrows = false;

jest.unstable_mockModule('@napi-rs/keyring', () => ({
    Entry: class {
        serviceName: string;
        account: string;
        throws: boolean;

        constructor(serviceName: string, account: string) {
            if (!store[serviceName]) store[serviceName] = {};
            this.serviceName = serviceName;
            this.account = account;
            this.throws = entryThrows;
        }

        getPassword(): string | null {
            if (this.throws) {
                throw new Error('Simulated keychain access error');
            }
            return store[this.serviceName][this.account] || null;
        }

        setPassword(value: string): void {
            if (this.throws) {
                throw new Error('Simulated keychain access error');
            }

            store[this.serviceName][this.account] = value;
        }

        deletePassword(): void {
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

        expect(secretStorage.get('my-secret')).toBeNull();
        secretStorage.set('my-secret', 'secret-value');
        expect(secretStorage.get('my-secret')).toBe('secret-value');
        secretStorage.remove('my-secret');
        expect(secretStorage.get('my-secret')).toBeNull();
    });

    test('Should handle errors when accessing the keychain', async () => {
        entryThrows = true;

        const secretStorage = SecretStorage('my-app');

        expect(() => secretStorage.get('my-secret')).toThrow(
            /Failed to access the system keychain/
        );
        expect(() => secretStorage.set('my-secret', 'value')).toThrow(
            /Failed to access the system keychain/
        );
        expect(() => secretStorage.remove('my-secret')).toThrow(
            /Failed to access the system keychain/
        );

        entryThrows = false;
    });
});
