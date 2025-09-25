import { describe, expect, jest, test, afterEach } from '@jest/globals';
import { fs as memfs } from 'memfs';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: FSEntryFactoryBuilder } = await import(
    '../../src/services/FSEntryFactoryBuilder.js'
);

afterEach(() => {
    const files = memfs.readdirSync('/');

    for (const file of files) {
        memfs.rmSync(`/${file}`, { recursive: true, force: true });
    }
});

describe('[UNIT] services/FSEntryFactoryBuilder', () => {
    test('Should create and read encrypted secret correctly', async () => {
        const filePath = '/secrets.dat';
        const key = 'my_secret';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', key);

        await entry.setPassword('super_secret_value');
        const retrieved = await entry.getPassword();
        expect(retrieved).toBe('super_secret_value');

        await entry.deletePassword();
        const afterDelete = await entry.getPassword();
        expect(afterDelete).toBeNull();
    });

    test('Should return null for non-existing secret', async () => {
        const filePath = '/secrets.dat';
        const key = 'non_existing_key';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', key);

        const retrieved = await entry.getPassword();
        expect(retrieved).toBeNull();
    });

    test('Should handle multiple secrets correctly', async () => {
        const filePath = '/secrets.dat';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry1 = factory('my_app', 'key1');
        const entry2 = factory('my_app', 'key2');

        await entry1.setPassword('value1');
        await entry2.setPassword('value2');

        const retrieved1 = await entry1.getPassword();
        const retrieved2 = await entry2.getPassword();

        expect(retrieved1).toBe('value1');
        expect(retrieved2).toBe('value2');
    });

    test('Should create the secrets file if it does not exist', async () => {
        const filePath = '/new_secrets.dat';
        
        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', 'new_key');

        expect(memfs.existsSync(filePath)).toBe(false);

        await entry.setPassword('new_value');
        const retrieved = await entry.getPassword();
        expect(retrieved).toBe('new_value');

        expect(memfs.existsSync(filePath)).toBe(true);
    });

    test('Should be able to overwrite an existing secret', async () => {
        const filePath = '/secrets.dat';
        const key = 'overwrite_key';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', key);

        await entry.setPassword('initial_value');
        let retrieved = await entry.getPassword();
        expect(retrieved).toBe('initial_value');

        await entry.setPassword('updated_value');
        retrieved = await entry.getPassword();
        expect(retrieved).toBe('updated_value');
    });

    test('Should be able to re-open encrypted secrets file and read existing secrets', async () => {
        const filePath = '/persistent_secrets.dat';
        const key = 'persistent_key';

        const factory1 = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry1 = factory1('my_app', key);

        await entry1.setPassword('persistent_value');
        const retrieved1 = await entry1.getPassword();
        expect(retrieved1).toBe('persistent_value');

        // Simulate re-opening by creating a new factory instance
        const factory2 = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry2 = factory2('my_app', key);

        const retrieved2 = await entry2.getPassword();
        expect(retrieved2).toBe('persistent_value');
    });

    test('Should throw error if encryption key is incorrect', async () => {
        const filePath = '/secure_secrets.dat';
        
        const factory1 = FSEntryFactoryBuilder(filePath, 'correct_key');
        const entry1 = factory1('my_app', 'secure_key');
        
        await entry1.setPassword('secure_value');
        const retrieved1 = await entry1.getPassword();
        expect(retrieved1).toBe('secure_value');

        expect(() => FSEntryFactoryBuilder(filePath, 'wrong_key')).toThrow(
            'Failed to decrypt the secrets file. Ensure you are accessing the secrets from the same user and using the correct encryption key'
        );
    });

    test('Should create parent directories if they do not exist', async () => {
        const filePath = '/nested/dir/structure/secrets.dat';
        const key = 'nested_key';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', key);

        expect(memfs.existsSync('/nested')).toBe(false);
        expect(memfs.existsSync('/nested/dir')).toBe(false);
        expect(memfs.existsSync('/nested/dir/structure')).toBe(false);

        await entry.setPassword('nested_value');
        const retrieved = await entry.getPassword();
        expect(retrieved).toBe('nested_value');

        expect(memfs.existsSync('/nested')).toBe(true);
        expect(memfs.existsSync('/nested/dir')).toBe(true);
        expect(memfs.existsSync('/nested/dir/structure')).toBe(true);
    });
    
    test('Should handle deletion of non-existing secret gracefully', async () => {
        const filePath = '/secrets.dat';
        const key = 'non_existing_key';

        const factory = FSEntryFactoryBuilder(filePath, 'encryption_key_123');
        const entry = factory('my_app', key);

        // Should not throw an error
        await expect(entry.deletePassword()).resolves.toBe(false);

        const retrieved = await entry.getPassword();
        expect(retrieved).toBeNull();
    });
});