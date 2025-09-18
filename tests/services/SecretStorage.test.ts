import { describe, expect, jest, test, afterEach } from '@jest/globals';

const store: Record<string, Record<string, string | null>> = {};

jest.unstable_mockModule('@napi-rs/keyring', () => ({
    Entry: class {
        serviceName: string;
        account: string;

        constructor(serviceName: string, account: string) {
            if (!store[serviceName]) store[serviceName] = {};
            this.serviceName = serviceName;
            this.account = account;
        }

        getPassword(): string | null {
            return store[this.serviceName][this.account] || null;
        }

        setPassword(value: string): void {
            store[this.serviceName][this.account] = value;
        }

        deletePassword(): void {
            store[this.serviceName][this.account] = null;
        }
    }
}));

const { default: SecretStorage } = await import('../../src/services/SecretStorage.js');

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
});