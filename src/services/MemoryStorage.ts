import type StorageEngine from '../interfaces/StorageEngine.js';

/**
 * Provides a factory function to create an in-memory storage engine for storing and retrieving JSON data.
 * This is primarily useful for testing or temporary data storage during runtime.
 * @template Schema - The type of the data schema to be stored.
 * @param initialData - Optional initial data to populate the memory store.
 * @returns A factory function that takes a data path and returns a storage engine.
 */
export function MemoryStorageFactory<Schema extends object>(
    initialData?: Schema
) {
    /**
     * Creates an in-memory storage engine for the specified data path.
     *
     * @param dataPath - The key in the in-memory store where data will be stored.
     * @returns A storage engine with methods to write, read, and remove data.
     */
    return (dataPath: string) => MemoryStorage(dataPath, initialData);
}

/**
 * Provides an in-memory storage engine for storing and retrieving JSON data.
 * This is primarily useful for testing or temporary data storage during runtime.
 * @template Schema - The type of the data schema to be stored.
 */
interface Store<Schema> {
    /**
     * The key is the data path, and the value is the stored data according to the Schema.
     */
    [key: string]: Schema;
}

export default function MemoryStorage<Schema extends object>(
    path: string,
    initialData?: Schema
): StorageEngine<Schema> {
    const data: Store<Schema> = {
        [path]: structuredClone(initialData ?? ({} as Schema))
    };

    /**
     * Writes the provided value to the in-memory store at the specified path.
     * @param value - The data to be stored.
     * @returns A promise that resolves when the data has been written.
     */
    async function write(
        value: Schema
    ): Promise<void> {
        data[path] = structuredClone(value) as unknown as Schema;
    }

    /**
     * Reads the data from the in-memory store at the specified path.
     * @returns A promise that resolves with the stored data.
     */
    async function read(): Promise<Schema> {
        return structuredClone(data[path] ?? {});
    }

    /**
     * Removes the data from the in-memory store at the specified path.
     * @returns A promise that resolves when the data has been removed.
     */
    async function remove(): Promise<void> {
        delete data[path];
    }

    return {
        write,
        read,
        remove
    };
}
