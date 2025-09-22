import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { fs as memfs } from 'memfs';
import hash from '../../src/util/hash.js';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: FileStorage } = await import(
    '../../src/services/FileStorage.js'
);

afterEach(() => {
    const files = memfs.readdirSync('/');
    for (const file of files) {
        memfs.rmSync(`/${file}`, { recursive: true, force: true });
    }
});

describe('[UNIT] services/FileStorage', () => {
    test('Should write and read object correctly', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/', false);

        await storage.writeObject('data.json', { foo: 'hello', bar: 42 });
        const data = await storage.readObject('data.json', { foo: '', bar: 0 });

        expect(data).toEqual({ foo: 'hello', bar: 42 });
    });

    test('Should fallback to default value on non-existent object and create object with default value', async () => {
        const initialData = { foo: 'initial', bar: 0 };
        const storage = FileStorage<typeof initialData>('/', false);

        const data = await storage.readObject('data.json', initialData);
        expect(data).toEqual(initialData);
        expect(memfs.existsSync('/default/data.json')).toBe(true);
        expect(
            JSON.parse(
                memfs.readFileSync('/default/data.json', 'utf-8') as string
            )
        ).toEqual(initialData);
    });

    test('Should remove data correctly', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/', false);

        await storage.writeObject('data.json', { foo: 'toBeRemoved', bar: 99 });
        expect(memfs.existsSync('/default/data.json')).toBe(true);

        await storage.removeObject('data.json');
        await storage.removeObject('data.json'); // Should not throw if file does not exist
        const data = await storage.readObject('data.json', {} as any);

        expect(data).toEqual({});

        expect(memfs.existsSync('/default/data.json')).toBe(true);
    });

    test('Should overwrite data on write', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/', false);

        await storage.writeObject('data.json', { foo: 'first', bar: 1 });
        await storage.writeObject('data.json', { foo: 'second', bar: 2 });
        const data = await storage.readObject('data.json', {} as any);

        expect(data).toEqual({ foo: 'second', bar: 2 });
    });

    test('Should handle multiple storage instances independently', async () => {
        const storage1 = FileStorage<{ foo: string }>('/fs1', false);
        const storage2 = FileStorage<{ bar: number }>('/fs2', false);

        await storage1.writeObject('data.json', { foo: 'data1' });
        await storage2.writeObject('data.json', { bar: 100 });

        const data1 = await storage1.readObject('data.json', {} as any);
        const data2 = await storage2.readObject('data.json', {} as any);

        expect(data1).toEqual({ foo: 'data1' });
        expect(data2).toEqual({ bar: 100 });
    });

    test('Should not mutate storage when outside object is changed', async () => {
        const initialData = { foo: 'immutable', bar: 10 };
        const storage = FileStorage<typeof initialData>('/', false);

        const dataBefore = await storage.readObject('data.json', initialData);

        dataBefore.foo = 'mutated';
        dataBefore.bar = 20;

        const dataAfter = await storage.readObject('data.json', initialData);
        expect(dataAfter).toEqual(initialData);

        initialData.bar = 30;

        const dataFinal = await storage.readObject('data.json', initialData);
        expect(dataFinal).toEqual({ foo: 'immutable', bar: 10 });
    });

    test('Should throw on invalid path', () => {
        expect(() =>
            FileStorage<{ foo: string }>('relative/path.json', false)
        ).toThrow();
    });

    test('Should work with existing file', async () => {
        memfs.mkdirSync('/default', { recursive: true });
        memfs.writeFileSync(
            '/default/existing.json',
            JSON.stringify({ foo: 'exists' })
        );

        const storage = FileStorage<{ foo: string }>('/', false);
        const data = await storage.readObject('existing.json', {} as any);

        expect(data).toEqual({ foo: 'exists' });
    });

    test('Type safety: Should enforce schema on write and read', async () => {
        const storage = FileStorage<{ name: string; age: number }>('/', false);

        // Correct type
        await storage.writeObject('data.json', { name: 'Alice', age: 30 });

        const data = await storage.readObject('data.json', {
            name: '',
            age: 0
        });
        expect(data).toEqual({ name: 'Alice', age: 30 });

        // @ts-expect-error: Wrong type (age should be number)
        await storage.readObject('data.json', {});

        // @ts-expect-error: Wrong type (age should be number)
        await storage.writeObject('data.json', { name: 'Bob', age: 'ASAS' });

        // @ts-expect-error: Missing property (age is required)
        await storage.writeObject('data.json', { name: 'Charlie' });

        await storage.writeObject('data.json', {
            name: 'Dave',
            age: 40,
            // @ts-expect-error: Extra property not in schema
            address: '123 St'
        });
    });

    test('Should support lazy initialization', async () => {
        expect(memfs.existsSync('/lazyInit')).toBe(false);
        const storage = FileStorage<{ foo: string }>('/lazyInit', true);
        expect(memfs.existsSync('/lazyInit')).toBe(false);

        await storage.writeObject('data.json', { foo: 'initialized' });
        expect(memfs.existsSync('/lazyInit')).toBe(true);
        expect(memfs.existsSync('/lazyInit/default')).toBe(true);

        const data = await storage.readObject('data.json', {} as any);
        expect(data).toEqual({ foo: 'initialized' });
    });

    test('Should throw on invalid path even with lazy initialization', () => {
        expect(() =>
            FileStorage<{ foo: string }>('relative/path.json', true)
        ).toThrow();
    });

    test('Should be able to re-create structure if manually deleted', async () => {
        const storage = FileStorage<{ foo: string }>('/noReinit', true);

        await storage.writeObject('data1.json', { foo: 'first' });
        expect(memfs.existsSync('/noReinit')).toBe(true);
        expect(memfs.existsSync('/noReinit/default')).toBe(true);

        // Manually remove the directory to simulate external deletion
        memfs.rmdirSync('/noReinit/default', { recursive: true });
        expect(memfs.existsSync('/noReinit/default')).toBe(false);

        await expect(
            storage.writeObject('data2.json', { foo: 'second' })
        ).resolves.toBeUndefined();
        expect(memfs.existsSync('/noReinit/default')).toBe(true);

        await expect(
            storage.readObject('data2.json', {} as any)
        ).resolves.toEqual({ foo: 'second' });
    });

    test('Destroy should remove the entire root directory', async () => {
        const storage = FileStorage<{ foo: string }>('/toBeDestroyed', false);
        await storage.writeObject('data.json', { foo: 'temp' });

        expect(memfs.existsSync('/toBeDestroyed')).toBe(true);
        expect(memfs.existsSync('/toBeDestroyed/default')).toBe(true);

        expect(memfs.existsSync('/toBeDestroyed/default/data.json')).toBe(true);

        await storage.destroy();

        expect(memfs.existsSync('/toBeDestroyed')).toBe(false);
    });

    test('Should return correct root and workspace paths', async () => {
        const storage = FileStorage<{ foo: string }>('/pathTest', false);

        expect(storage.getRootPath()).toBe('/pathTest');
        expect(storage.getWorkspacePath()).toBe('/pathTest/default');

        await storage.writeObject('data.json', { foo: 'test' });

        expect(storage.getRootPath()).toBe('/pathTest');
        expect(storage.getWorkspacePath()).toBe('/pathTest/default');
        const data = await storage.readObject('data.json', {} as any);
        expect(data).toEqual({ foo: 'test' });
    });

    test('Should return coorect workspace path based on key', async () => {
        const storageDefault = FileStorage<{ foo: string }>('/wsTest', false);
        const storageCustom = FileStorage<{ foo: string }>(
            '/wsTest',
            false,
            'customKey'
        );

        expect(storageDefault.getWorkspacePath()).toBe('/wsTest/default');
        expect(storageCustom.getWorkspacePath()).toBe(
            `/wsTest/${hash('customKey')}`
        );
    });

    test('Should handle nested paths correctly', async () => {
        const storage = FileStorage<{ nested: { key: string } }>('/', false);

        await storage.writeObject('config/settings.json', {
            nested: { key: 'nestedValue' }
        });

        const data = await storage.readObject(
            'config/settings.json',
            {} as any
        );
        expect(data).toEqual({ nested: { key: 'nestedValue' } });

        expect(memfs.existsSync('/default/config/settings.json')).toBe(true);
    });

    test('Should return relative paths correctly with getPath', async () => {
        const storage = FileStorage<{ foo: string }>('/relPathTest', false);

        expect(storage.getPath('data.json')).toBe(
            '/relPathTest/default/data.json'
        );
        expect(storage.getPath('config/settings.json')).toBe(
            '/relPathTest/default/config/settings.json'
        );

        await storage.writeObject('config/settings.json', { foo: 'bar' });
        expect(
            memfs.existsSync('/relPathTest/default/config/settings.json')
        ).toBe(true);

        const data = await storage.readObject(
            'config/settings.json',
            {} as any
        );
        expect(data).toEqual({ foo: 'bar' });
    });

    test('Destroy workspace should remove only the current workspace directory', async () => {
        const storage = FileStorage<{ foo: string }>('/multiWS', false);
        const customWorkspace = storage.createWorkspace('custom');

        await storage.writeObject('data1.json', { foo: 'defaultWS' });
        await customWorkspace.writeObject('data2.json', { foo: 'customWS' });

        expect(memfs.existsSync('/multiWS/default/data1.json')).toBe(true);
        expect(
            memfs.existsSync('/multiWS/' + hash('custom') + '/data2.json')
        ).toBe(true);

        await customWorkspace.destroyWorkspace();

        expect(memfs.existsSync('/multiWS/default/data1.json')).toBe(true);
        expect(memfs.existsSync('/multiWS/' + hash('custom'))).toBe(false);

        await storage.destroy();

        expect(memfs.existsSync('/multiWS')).toBe(false);
    });

    test('Should throw if trying to create workspace with default key', () => {
        const storage = FileStorage<{ foo: string }>('/defKeyTest', false);
        expect(() => storage.createWorkspace('default')).toThrow();
    });

    test('Should not throw if destroying non-existent storage', async () => {
        const storage = FileStorage<{ foo: string }>('/nonExistent', false);
        await expect(storage.destroy()).resolves.toBeUndefined();
        await expect(storage.destroy()).resolves.toBeUndefined();
    });

    test('Should not throw if destroying non-existent workspace', async () => {
        const storage = FileStorage<{ foo: string }>('/nonExistentWS', false);
        const ws = storage.createWorkspace('customWS');
        await expect(ws.destroyWorkspace()).resolves.toBeUndefined();
        await expect(ws.destroyWorkspace()).resolves.toBeUndefined();
    });
});
