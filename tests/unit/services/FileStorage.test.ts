import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { fs as memfs } from 'memfs';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: FileStorage, FileStorageFactory } = await import(
    '../../../src/services/FileStorage.js'
);

afterEach(() => {
    const files = memfs.readdirSync('/');
    for (const file of files) {
        memfs.unlinkSync(`/${file}`);
    }
});

describe('[UNIT] services/FileStorage', () => {
    test('Should write and read data correctly', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/data.json');

        await storage.write({ foo: 'hello', bar: 42 });
        const data = await storage.read();

        expect(data).toEqual({ foo: 'hello', bar: 42 });
    });

    test('Should initialize with initial data', async () => {
        const initialData = { foo: 'initial', bar: 0 };
        const storage = FileStorage<typeof initialData>(
            '/data.json',
            initialData
        );

        const data = await storage.read();
        expect(data).toEqual(initialData);
    });

    test('Should remove data correctly', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/data.json');

        await storage.write({ foo: 'toBeRemoved', bar: 99 });
        await storage.remove();
        await storage.remove();
        const data = await storage.read();

        expect(data).toEqual({});
    });

    test('Should overwrite data on write', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/data.json');

        await storage.write({ foo: 'first', bar: 1 });
        await storage.write({ foo: 'second', bar: 2 });
        const data = await storage.read();

        expect(data).toEqual({ foo: 'second', bar: 2 });
    });

    test('Should return empty object if no data is written', async () => {
        const storage = FileStorage<{ foo: string; bar: number }>('/data.json');

        const data = await storage.read();
        expect(data).toEqual({});
    });

    test('Should handle multiple storage instances independently', async () => {
        const storage1 = FileStorage<{ foo: string }>('/data1.json');
        const storage2 = FileStorage<{ bar: number }>('/data2.json');

        await storage1.write({ foo: 'data1' });
        await storage2.write({ bar: 100 });

        const data1 = await storage1.read();
        const data2 = await storage2.read();

        expect(data1).toEqual({ foo: 'data1' });
        expect(data2).toEqual({ bar: 100 });
    });

    test('Should not mutate storage when outside object is changed', async () => {
        const initialData = { foo: 'immutable', bar: 10 };
        const storage = FileStorage<typeof initialData>(
            '/data.json',
            initialData
        );

        const dataBefore = await storage.read();
        dataBefore.foo = 'mutated';
        dataBefore.bar = 20;

        const dataAfter = await storage.read();
        expect(dataAfter).toEqual(initialData);

        initialData.bar = 30;

        const dataFinal = await storage.read();
        expect(dataFinal).toEqual({ foo: 'immutable', bar: 10 });
    });

    test('Should throw on invalid path', () => {
        expect(() => FileStorage<{ foo: string }>('relative/path.json')).toThrow();
        expect(() => FileStorage<{ foo: string }>('/')).toThrow();
        memfs.mkdirSync('/dir');
        expect(() => FileStorage<{ foo: string }>('/dir')).toThrow();
        memfs.rmSync('/dir', { force: true, recursive: true });
    });

    test('Should work with existing file', async () => {
        memfs.writeFileSync('/existing.json', JSON.stringify({ foo: 'exists' }));

        const storage = FileStorage<{ foo: string }>('/existing.json');
        const data = await storage.read();

        expect(data).toEqual({ foo: 'exists' });
    });

    test('Type safety: Should enforce schema on write and read', async () => {
        const storage = FileStorage<{ name: string; age: number }>(
            '/data.json'
        );

        // Correct type
        await storage.write({ name: 'Alice', age: 30 });
        const data = await storage.read();
        expect(data).toEqual({ name: 'Alice', age: 30 });

        // @ts-expect-error: Wrong type (age should be number)
        await storage.write({ name: 'Bob', age: 'ASAS' });

        // @ts-expect-error: Missing property (age is required)
        await storage.write({ name: 'Charlie' });

        // @ts-expect-error: Extra property (address is not defined in schema)
        await storage.write({ name: 'Dave', age: 40, address: '123 St' });
    });
});

describe('[UNIT] services/FileStorageFactory', () => {
    test('Should create storage instances with the factory', async () => {
        const factory = FileStorageFactory<{ foo: string; bar: number }>();
        const storage = factory('/data.json', { foo: 'default', bar: 0 });

        const initialData = await storage.read();
        expect(initialData).toEqual({ foo: 'default', bar: 0 });

        await storage.write({ foo: 'updated', bar: 42 });
        const updatedData = await storage.read();
        expect(updatedData).toEqual({ foo: 'updated', bar: 42 });
    });

    test('Should create multiple independent storage instances', async () => {
        const factory = FileStorageFactory<{ value: number }>();
        const storageA = factory('/data1.json');
        const storageB = factory('/data2.json');

        await storageA.write({ value: 10 });
        await storageB.write({ value: 20 });

        const dataA = await storageA.read();
        const dataB = await storageB.read();

        expect(dataA).toEqual({ value: 10 });
        expect(dataB).toEqual({ value: 20 });
    });

    test('Should handle initial data correctly', async () => {
        const factory = FileStorageFactory<{ name: string }>();
        const storage = factory('/data.json', { name: 'initial' });

        const data = await storage.read();
        expect(data).toEqual({ name: 'initial' });
    });
});
