/**
 * Represents a storage engine that can be used to store and retrieve JSON data.
 * It provides methods to write, read, and remove data.
 *
 * @template Schema - The type of the data schema to be stored.
 */
export default interface StorageEngine<Schema extends object> {
    /**
     * Writes the provided value to the storage.
     * @param value - The value to be written to the storage.
     * @returns A promise that resolves when the write operation is complete.
     */
    write(value: Schema): Promise<void>;
    /**
     * Reads the value from the storage.
     * @returns A promise that resolves with the read value.
     */
    read(): Promise<Schema>;
    /**
     * Removes the value from the storage.
     * @returns A promise that resolves when the remove operation is complete.
     */
    remove(): Promise<void>;
}
