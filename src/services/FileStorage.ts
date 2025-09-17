import { existsSync, lstatSync, writeFileSync } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
import { isAbsolute } from 'path';
import type StorageEngine from '../interfaces/StorageEngine.js';

/**
 * Provides a factory function to create a file-based storage engine for storing and retrieving JSON data.
 *
 * @template Schema - The type of the data schema to be stored.
 * @param initialData - Optional initial data to populate the file if it does not exist.
 * @returns A factory function that takes a data path and returns a storage engine.
 */
export function FileStorageFactory<Schema extends object>(
    initialData?: Schema
) {
    /**
     * Creates a file-based storage engine for the specified data path.
     *
     * @param dataPath - The absolute path to the file where data will be stored.
     * @returns A storage engine with methods to write, read, and remove data.
     */
    return (dataPath: string) => FileStorage(dataPath, initialData);
}

/**
 * Provides a file-based storage engine for storing and retrieving JSON data.
 *
 * @template Schema - The type of the data schema to be stored.
 * @param path - The absolute path to the file where data will be stored.
 * @param initialData - Optional initial data to populate the file if it does not exist.
 * @returns A storage engine with methods to write, read, and remove data.
 */
export default function FileStorage<Schema extends object>(
    path: string,
    initialData?: Schema
): StorageEngine<Schema> {
    // Validate the provided path
    if (
        !path ||
        !isAbsolute(path) ||
        (existsSync(path) && lstatSync(path).isDirectory())
    ) {
        throw new Error('Invalid file path');
    }

    // Ensure the file exists; if not, create it with an empty JSON object
    if (!existsSync(path)) {
        writeFileSync(path, JSON.stringify(initialData ?? {}));
    }

    // Implement the StorageEngine interface methods
    async function write(value: Schema): Promise<void> {
        await writeFile(path, JSON.stringify(value, null, 2));
    }

    /**
     * Reads and parses the JSON data from the file.
     * @returns A promise that resolves with the parsed data.
     */
    async function read(): Promise<Schema> {
        if (!existsSync(path)) {
            await write((initialData ?? {}) as Schema);
        }

        const data = await readFile(path, 'utf-8');
        return JSON.parse(data) as Schema;
    }

    /**
     * Removes the file from the filesystem.
     * @returns A promise that resolves when the file is removed.
     */
    async function remove(): Promise<void> {
        if (existsSync(path)) await unlink(path);
    }

    return {
        write,
        read,
        remove
    };
}
