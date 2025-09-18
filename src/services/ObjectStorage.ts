import { getProperty, setProperty, deleteProperty, deepKeys } from 'dot-prop';
import type StorageEngine from '../interfaces/StorageEngine.js';

/**
 * Join two string literal types with a dot.
 *
 * @template K The first part of the path.
 * @template P The second part of the path.
 */
type Join<K extends string, P extends string> = `${K}.${P}`;

/**
 * Generate all possible dot-separated paths for nested properties in an object type.
 *
 * @template T The object type to generate paths for.
 */
type Paths<T> = T extends object
    ? {
          [K in keyof T & string]: T[K] extends object
              ? K | Join<K, Paths<T[K]>>
              : K;
      }[keyof T & string]
    : never;

/**
 * Get the type of a property (including nested) in an object type based on a dot-separated path.
 *
 * @template T The object type.
 * @template P The dot-separated path to the property.
 */
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
        ? PathValue<T[K], Rest>
        : undefined
    : P extends keyof T
      ? T[P]
      : undefined;

/**
 * JSON object storage service instance.
 */
export type ObjectStorageInstance<Schema extends object> = ReturnType<
    typeof ObjectStorage<Schema>
>;

/**
 * JSON object storage service.
 *
 * @template Schema The schema of the object to be stored.
 * @param storage The underlying storage engine to use.
 * @returns
 */
export default function ObjectStorage<Schema extends object>(
    storage: StorageEngine<Schema>
) {
    /**
     * Set a property (including nested) of the object according to the Schema.
     *
     * @template P A property path of the Schema.
     *
     * @param prop The property path to set.
     * @param value The value to set at the specified property path.
     * @returns A promise that resolves when the property has been set.
     */
    async function set<P extends Paths<Schema>>(
        prop: P,
        value: PathValue<Schema, P>
    ) {
        const data = await storage.read();
        setProperty(data, String(prop), value);
        await storage.write(data);
    }

    /**
     * Get a property (including nested) of the object according to the Schema.
     *
     * @template P A property path of the Schema.
     *
     * @param prop The property path to get.
     * @param defaultValue An optional default value to return if the property is not found.
     * @returns A promise that resolves to the value at the specified property path, or the default value if provided and the property is not found.
     */
    async function get<P extends Paths<Schema>>(
        prop: P
    ): Promise<PathValue<Schema, P> | undefined>;
    async function get<P extends Paths<Schema>>(
        prop: P,
        defaultValue: PathValue<Schema, P>
    ): Promise<PathValue<Schema, P>>;
    async function get<P extends Paths<Schema>>(
        prop: P,
        defaultValue?: PathValue<Schema, P>
    ): Promise<PathValue<Schema, P> | undefined> {
        const data = await storage.read();
        const result = getProperty(data, String(prop), defaultValue);
        return result as PathValue<Schema, P> | undefined;
    }

    /**
     * Remove a property (including nested) of the object according to the Schema.
     *
     * @template P A property path of the Schema.
     *
     * @param prop The property path to remove.
     * @returns A promise that resolves when the property has been removed.
     */
    async function remove<P extends Paths<Schema>>(prop: P) {
        const data = await storage.read();
        deleteProperty(data, String(prop));
        await storage.write(data);
    }

    /**
     * List all keys (including nested) in the stored object.
     *
     * @returns A promise that resolves to an array of all keys in the object.
     */
    async function listKeys(): Promise<string[]> {
        const data = await storage.read();
        return deepKeys(data);
    }

    return {
        /**
         * Set a property (including nested) of the object according to the Schema.
         *
         * @template P A property path of the Schema.
         *
         * @param prop The property path to set.
         * @param value The value to set at the specified property path.
         * @returns A promise that resolves when the property has been set.
         */
        set,
        /**
         * Get a property (including nested) of the object according to the Schema.
         *
         * @template P A property path of the Schema.
         *
         * @param prop The property path to get.
         * @param defaultValue An optional default value to return if the property is not found.
         * @returns A promise that resolves to the value at the specified property path, or the default value if provided and the property is not found.
         */
        get,
        /**
         * Remove a property (including nested) of the object according to the Schema.
         *
         * @template P A property path of the Schema.
         *
         * @param prop The property path to remove.
         * @returns A promise that resolves when the property has been removed.
         */
        remove,
        /**
         * List all keys (including nested) in the stored object.
         *
         * @returns A promise that resolves to an array of all keys in the object.
         */
        listKeys
    };
}
