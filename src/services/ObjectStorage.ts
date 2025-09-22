import { getProperty, setProperty, deleteProperty, deepKeys } from 'dot-prop';
import type { FileStorageInstance } from './FileStorage.js';
import constants from '../util/constants.js';

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
// Tipos nativos e arrays que não devem ser recursivos
type Primitive =
    | string
    | number
    | boolean
    | bigint
    | symbol
    | null
    | undefined
    | Date
    | Function
    | Array<any>;

// Gera caminhos para objetos, ignorando tipos primitivos e arrays
type ObjectPaths<T> = T extends Primitive
    ? never
    : {
          [K in keyof T & string]: T[K] extends Primitive
              ? K
              : K | Join<K, ObjectPaths<T[K]>>;
      }[keyof T & string];

type Paths<T> = ObjectPaths<T>;

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
 * @param initialData Initial data to populate the storage with if empty.
 * @returns An object with methods to interact with the stored object.
 */
export default function ObjectStorage<Schema extends object>(
    storage: FileStorageInstance<Schema>,
    initialData: Schema
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
        const data = await storage.readObject(
            constants.workspace.dataPath,
            initialData
        );
        setProperty(data, String(prop), value);
        await storage.writeObject(constants.workspace.dataPath, data);
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
        const data = await storage.readObject(
            constants.workspace.dataPath,
            initialData
        );
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
        const data = await storage.readObject(
            constants.workspace.dataPath,
            initialData
        );
        deleteProperty(data, String(prop));
        await storage.writeObject(constants.workspace.dataPath, data);
    }

    /**
     * List all keys (including nested) in the stored object.
     *
     * @returns A promise that resolves to an array of all keys in the object.
     */
    async function listKeys(): Promise<string[]> {
        const data = await storage.readObject(
            constants.workspace.dataPath,
            initialData
        );
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
        listKeys,
        /**
         * The underlying storage engine used by the ObjectStorage.
         */
        storage
    };
}
