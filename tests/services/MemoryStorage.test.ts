import { describe, expect, test } from '@jest/globals';

import MemoryStorage, {
    MemoryStorageFactory
} from '../../src/services/MemoryStorage.js';

describe('[UNIT] services/MemoryStorage', () => {
    test('Should write and read data correctly', async () => {
        const storage = MemoryStorage<{ foo: string; bar: number }>('testPath');

        await storage.write({ foo: 'hello', bar: 42 });
        const data = await storage.read();

        expect(data).toEqual({ foo: 'hello', bar: 42 });
    });

    test('Should initialize with initial data', async () => {
        const initialData = { foo: 'initial', bar: 0 };
        const storage = MemoryStorage<typeof initialData>(
            'testPathWithInitial',
            initialData
        );

        const data = await storage.read();
        expect(data).toEqual(initialData);
    });

    test('Should remove data correctly', async () => {
        const storage = MemoryStorage<{ foo: string; bar: number }>(
            'testPathRemove'
        );

        await storage.write({ foo: 'toBeRemoved', bar: 99 });
        await storage.remove();
        const data = await storage.read();

        expect(data).toEqual({});
    });

    test('Should overwrite data on write', async () => {
        const storage = MemoryStorage<{ foo: string; bar: number }>(
            'testPathOverwrite'
        );

        await storage.write({ foo: 'first', bar: 1 });
        await storage.write({ foo: 'second', bar: 2 });
        const data = await storage.read();

        expect(data).toEqual({ foo: 'second', bar: 2 });
    });

    test('Should return empty object if no data is written', async () => {
        const storage = MemoryStorage<{ foo: string; bar: number }>(
            'testPathEmpty'
        );

        const data = await storage.read();
        expect(data).toEqual({});
    });

    test('Should handle multiple storage instances independently', async () => {
        const storage1 = MemoryStorage<{ foo: string }>('path1');
        const storage2 = MemoryStorage<{ bar: number }>('path2');

        await storage1.write({ foo: 'data1' });
        await storage2.write({ bar: 100 });

        const data1 = await storage1.read();
        const data2 = await storage2.read();

        expect(data1).toEqual({ foo: 'data1' });
        expect(data2).toEqual({ bar: 100 });
    });

    test('Should not mutate storage when outside object is changed', async () => {
        const initialData = { foo: 'immutable', bar: 10 };
        const storage = MemoryStorage<typeof initialData>(
            'testPathImmutable',
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

    test('Type safety: Should enforce schema on write and read', async () => {
        const storage = MemoryStorage<{ name: string; age: number }>(
            'testPathTypeSafety'
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

describe('[UNIT] services/MemoryStorageFactory', () => {
    test('Should create storage instances with the factory', async () => {
        const factory = MemoryStorageFactory<{ foo: string; bar: number }>();
        const storage = factory('factoryTestPath', {
            foo: 'default',
            bar: 0
        });

        const initialData = await storage.read();
        expect(initialData).toEqual({ foo: 'default', bar: 0 });

        await storage.write({ foo: 'updated', bar: 42 });
        const updatedData = await storage.read();
        expect(updatedData).toEqual({ foo: 'updated', bar: 42 });
    });

    test('Should create multiple independent storage instances', async () => {
        const factory = MemoryStorageFactory<{ value: number }>();
        const storageA = factory('pathA', { value: 0 });
        const storageB = factory('pathB', { value: 0 });

        await storageA.write({ value: 10 });
        await storageB.write({ value: 20 });

        const dataA = await storageA.read();
        const dataB = await storageB.read();

        expect(dataA).toEqual({ value: 10 });
        expect(dataB).toEqual({ value: 20 });
    });

    test('Should handle initial data correctly', async () => {
        const factory = MemoryStorageFactory<{ name: string }>();
        const storage = factory('initialDataPath', {
            name: 'initial'
        });

        const data = await storage.read();
        expect(data).toEqual({ name: 'initial' });
    });
});
