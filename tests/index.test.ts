import { describe, expect, test, jest, afterEach } from '@jest/globals';

import { fs as memfs } from 'memfs';
import { MemoryStorageFactory } from '../src/services/MemoryStorage.js';
import VaultExtensionAddons from '../src/interfaces/VaultExtensionAddons.js';
import { homedir, tmpdir } from 'os';
import { resolve } from 'path';

const store: Record<string, Record<string, string | null>> = {};

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

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

afterEach(() => {
    for (const key in store) {
        delete store[key];
    }

    const files = memfs.readdirSync('/');

    for (const file of files) {
        memfs.rmSync(`/${file}`, { recursive: true, force: true });
    }
});

const { default: VaultExtension, ...services } = await import('../index.js');

describe('[UNIT] index', () => {
    test('Should expose the correct services', () => {
        expect(VaultExtension).toEqual(expect.any(Function));
        expect(services).toHaveProperty('FileStorage');
        expect(services).toHaveProperty('MemoryStorage');
        expect(services).toHaveProperty('FileStorageFactory');
        expect(services).toHaveProperty('MemoryStorageFactory');
    });

    test('Should throw if dataPath and tempPath are the same when building command addons', () => {
        const extension = VaultExtension({
            dataPath: '/same/path',
            tempPath: '/same/path'
        });

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        expect(() =>
            extension.buildCommandAddons!({
                appName: 'test-app',
                addons: {} as any,
                helpers: {} as any,
                logger: {
                    debug() {}
                } as any
            })
        ).toThrow(
            'Data path and temporary path cannot be the same: /same/path'
        );
    });

    test('Should create data and temp directories when building command addons', () => {
        const extension = VaultExtension();

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        });

        expect(
            memfs.existsSync(resolve(homedir(), '.test-app', 'data.json'))
        ).toBe(true);
        expect(
            memfs.existsSync(
                resolve(tmpdir(), '.test-app', 'default', 'data.json')
            )
        ).toBe(true);
    });

    test('Should use default paths when not provided', async () => {
        const extension = VaultExtension();

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        const vault = extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        }) as unknown as VaultExtensionAddons;

        expect(
            memfs.existsSync(resolve(homedir(), '.test-app', 'data.json'))
        ).toBe(true);
        expect(
            memfs.existsSync(
                resolve(tmpdir(), '.test-app', 'default', 'data.json')
            )
        ).toBe(true);

        await vault.data.set('key', 'value');
        await expect(vault.data.get('key')).resolves.toBe('value');
        await expect(vault.data.get('nonExistentKey')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual(['key']);

        await vault.temp.data.set('tempKey', 'tempValue');
        await expect(vault.temp.data.get('tempKey')).resolves.toBe('tempValue');
        await expect(
            vault.temp.data.get('nonExistentTempKey')
        ).resolves.toBeUndefined();
        await expect(vault.temp.data.listKeys()).resolves.toEqual(['tempKey']);

        expect(vault.secrets.get('secretKey')).toBeNull();
        vault.secrets.set('secretKey', 'secretValue');
        expect(vault.secrets.get('secretKey')).toBe('secretValue');
        vault.secrets.remove('secretKey');
        expect(vault.secrets.get('secretKey')).toBeNull();
    });

    test('Should work with custom storage engines', async () => {
        const extension = VaultExtension({
            storageEngine: MemoryStorageFactory()
        });

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        const vault = extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        }) as unknown as VaultExtensionAddons;

        await vault.data.set('key', 'value');
        await expect(vault.data.get('key')).resolves.toBe('value');
        await expect(vault.data.get('nonExistentKey')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual(['key']);

        await vault.temp.data.set('tempKey', 'tempValue');
        await expect(vault.temp.data.get('tempKey')).resolves.toBe('tempValue');
        await expect(
            vault.temp.data.get('nonExistentTempKey')
        ).resolves.toBeUndefined();
        await expect(vault.temp.data.listKeys()).resolves.toEqual(['tempKey']);

        expect(vault.secrets.get('secretKey')).toBeNull();
        vault.secrets.set('secretKey', 'secretValue');
        expect(vault.secrets.get('secretKey')).toBe('secretValue');
        vault.secrets.remove('secretKey');
        expect(vault.secrets.get('secretKey')).toBeNull();
    });

    test('Should clean up temporary directory if destroyTempOnExit is true', () => {
        const extension = VaultExtension({
            dataPath: '/data/path/data.json',
            tempPath: '/temp/path',
            destroyTempOnExit: true
        });

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        });

        extension.interceptors!.beforeEnding!({
            logger: {
                debug() {}
            } as any
        } as any);

        expect(memfs.existsSync('/temp/path')).toBe(false);
    });

    test('Should not clean up temporary directory if destroyTempOnExit is false', () => {
        const extension = VaultExtension({
            dataPath: '/data/path/data.json',
            tempPath: '/temp/path',
            destroyTempOnExit: false
        });

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        });

        extension.interceptors!.beforeEnding!({
            logger: {
                debug() {}
            } as any
        } as any);

        expect(memfs.existsSync('/temp/path')).toBe(true);
    });

    test('Should work with initial data', async () => {
        const extension = VaultExtension({
            dataPath: '/data/path/data.json',
            tempPath: '/temp/path',
            initialData: { key: 'value' },
            tempInitialData: { tempKey: 'tempValue' }
        });

        expect(extension).toMatchObject({
            name: 'vault',
            buildCommandAddons: expect.any(Function),
            interceptors: expect.any(Object)
        });

        const vault = extension.buildCommandAddons!({
            appName: 'test-app',
            addons: {} as any,
            helpers: {} as any,
            logger: {
                debug() {}
            } as any
        }) as unknown as VaultExtensionAddons;

        console.log(vault.data.get('key'));

        await expect(vault.data.get('key')).resolves.toBe('value');
        await expect(vault.data.get('nonExistentKey')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual(['key']);
        await vault.data.remove('key');
        await expect(vault.data.get('key')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual([]);

        await expect(vault.temp.data.get('tempKey')).resolves.toBe('tempValue');
        await expect(
            vault.temp.data.get('nonExistentTempKey')
        ).resolves.toBeUndefined();
        await expect(vault.temp.data.listKeys()).resolves.toEqual(['tempKey']);
        await vault.temp.data.remove('tempKey');
        await expect(vault.temp.data.get('tempKey')).resolves.toBeUndefined();
        await expect(vault.temp.data.listKeys()).resolves.toEqual([]);
    });
});
