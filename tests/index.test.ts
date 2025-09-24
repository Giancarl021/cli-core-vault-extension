import { describe, expect, test, jest, afterEach } from '@jest/globals';

import { fs as memfs } from 'memfs';
import { homedir, tmpdir } from 'os';
import { resolve } from 'path';
import type VaultExtensionAddons from '../src/interfaces/VaultExtensionAddons.js';

const store: Record<string, Record<string, string | null>> = {};

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

jest.unstable_mockModule('@napi-rs/keyring', () => ({
    AsyncEntry: class {
        serviceName: string;
        account: string;
        throws: boolean;

        constructor(serviceName: string, account: string) {
            if (!store[serviceName]) store[serviceName] = {};
            this.serviceName = serviceName;
            this.account = account;
            this.throws = false;
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

afterEach(() => {
    for (const key in store) {
        delete store[key];
    }

    const files = memfs.readdirSync('/');

    for (const file of files) {
        memfs.rmSync(`/${file}`, { recursive: true, force: true });
    }
});

const { default: VaultExtension } = await import('../index.js');

describe('[UNIT] index', () => {
    test('Should expose the correct services', () => {
        expect(VaultExtension).toEqual(expect.any(Function));
    });

    test('Should throw if dataPath and tempPath are the same when building command addons', () => {
        const extension = VaultExtension({
            dataPath: '/same/path',
            tempPath: '/same/path',
            lazyInitialization: false
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

    test('Should throw if dataPath and tempPath are subdirectories of each other when building command addons', () => {
        const extension = VaultExtension({
            dataPath: '/same/path',
            tempPath: '/same/path/temp',
            lazyInitialization: false
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
            'Data path and temporary path cannot be subdirectories of each other: /same/path and /same/path/temp'
        );
    });

    test('Should create data and temp directories when building command addons', () => {
        const extension = VaultExtension({
            lazyInitialization: false
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

        expect(
            memfs.existsSync(resolve(homedir(), '.test-app', 'default'))
        ).toBe(true);

        expect(
            memfs.existsSync(resolve(tmpdir(), '.test-app', 'default'))
        ).toBe(true);
    });

    test('Should use default paths when not provided', async () => {
        const extension = VaultExtension({
            lazyInitialization: false
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

        expect(
            memfs.existsSync(resolve(homedir(), '.test-app', 'default'))
        ).toBe(true);

        expect(
            memfs.existsSync(resolve(tmpdir(), '.test-app', 'default'))
        ).toBe(true);

        await vault.data.set('key', 'value');
        await expect(vault.data.get('key')).resolves.toBe('value');
        await expect(vault.data.get('nonExistentKey')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual(['key']);

        await vault.temp.set('tempKey', 'tempValue');
        await expect(vault.temp.get('tempKey')).resolves.toBe('tempValue');
        await expect(
            vault.temp.get('nonExistentTempKey')
        ).resolves.toBeUndefined();
        await expect(vault.temp.listKeys()).resolves.toEqual(['tempKey']);

        await expect(vault.secrets.get('secretKey')).resolves.toBeUndefined();
        await vault.secrets.set('secretKey', 'secretValue');
        await expect(vault.secrets.get('secretKey')).resolves.toBe(
            'secretValue'
        );
        await vault.secrets.remove('secretKey');
        await expect(vault.secrets.get('secretKey')).resolves.toBeUndefined();
    });

    test('Should clean up temporary directory if destroyTempOnExit is true', async () => {
        const extension = VaultExtension({
            dataPath: '/data/path',
            tempPath: '/temp/path',
            destroyTempOnExit: true,
            lazyInitialization: false
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

        await extension.interceptors!.beforeEnding!({
            logger: {
                debug() {}
            } as any
        } as any);

        expect(memfs.existsSync('/temp/path')).toBe(false);
    });

    test('Should not clean up temporary directory if destroyTempOnExit is false', () => {
        const extension = VaultExtension({
            dataPath: '/data/path',
            tempPath: '/temp/path',
            lazyInitialization: false,
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
            dataPath: '/data/path',
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

        await expect(vault.data.get('key')).resolves.toBe('value');
        await expect(vault.data.get('nonExistentKey')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual(['key']);
        await vault.data.remove('key');
        await expect(vault.data.get('key')).resolves.toBeUndefined();
        await expect(vault.data.listKeys()).resolves.toEqual([]);

        await expect(vault.temp.get('tempKey')).resolves.toBe('tempValue');
        await expect(
            vault.temp.get('nonExistentTempKey')
        ).resolves.toBeUndefined();
        await expect(vault.temp.listKeys()).resolves.toEqual(['tempKey']);
        await vault.temp.remove('tempKey');
        await expect(vault.temp.get('tempKey')).resolves.toBeUndefined();
        await expect(vault.temp.listKeys()).resolves.toEqual([]);
    });

    test('Should work with lazyInitialization set to true', async () => {
        const extension = VaultExtension({
            dataPath: '/data/path',
            tempPath: '/temp/path',
            initialData: { key: 'value' },
            tempInitialData: { tempKey: 'tempValue' },
            lazyInitialization: true
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

        // At this point, the storage engines should not be initialized yet.
        expect(memfs.existsSync('/data/path')).toBe(false);
        expect(memfs.existsSync('/temp/path')).toBe(false);

        // Accessing the data storage should initialize it.
        await expect(vault.data.get('key')).resolves.toBe('value');
        expect(memfs.existsSync('/data/path')).toBe(true);

        // Accessing the temp storage should initialize it.
        await expect(vault.temp.get('tempKey')).resolves.toBe('tempValue');
        expect(memfs.existsSync('/temp/path')).toBe(true);
    });

    test('Should work with no options provided', async () => {
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
            memfs.existsSync(resolve(homedir(), '.test-app', 'default'))
        ).toBe(false);

        expect(
            memfs.existsSync(resolve(tmpdir(), '.test-app', 'default'))
        ).toBe(false);
    });
});
