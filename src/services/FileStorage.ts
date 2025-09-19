import { existsSync } from 'fs';
import { readFile, unlink, writeFile, rm } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';
import constants from '../util/constants.js';
import hash from '../util/hash.js';
import assertDir from '../util/assertDir.js';

/**
 * The instance type returned by the FileStorage factory function.
 */
export type FileStorageInstance<Schema extends object> = ReturnType<
    typeof FileStorage<Schema>
>;

/**
 * Store data as JSON in a file on the filesystem.
 * Also implements workspace functionality to isolate data for different contexts.
 * Binary files can be stored using native APIs like `fs.promises.writeFile` and `fs.promises.readFile`
 * in conjunction with the `getPath` method to get absolute paths without worrying about the root directory.
 *
 * @template Schema - The type of the data schema to be stored.
 * @param rootPath The root directory where data files will be stored.
 * @param lazyInitialization If `true`, the storage will only be initialized when first accessed.
 *                           If `false`, it will be initialized immediately.
 *                           Default is `true`.
 * @param key The workspace key to isolate data. Default is `constants.workspace.defaultKey`.
 * @returns An object implementing the StorageEngine interface for managing the data.
 */
export default function FileStorage<Schema extends object>(
    rootPath: string,
    lazyInitialization: boolean,
    key: string = constants.workspace.defaultKey
) {
    let initialized = false;

    // Validate the provided path
    if (!rootPath || !isAbsolute(rootPath))
        throw new Error('Invalid file path');

    const _rootPath = resolve(rootPath);

    // Get the workspace path, which is a subdirectory of the root path
    // every workspace gets its own directory hashed from the key,
    // unless the key is `constants.workspace.defaultKey`, in which case it will not
    // hash
    const workspacePath = resolve(
        _rootPath,
        key === constants.workspace.defaultKey ? key : hash(key)
    );

    /**
     * Initialize the storage by ensuring the root and workspace directories exist.
     * This is called automatically on first access if `lazyInitialization` is enabled.
     */
    function _init() {
        if (initialized) return;
        assertDir(_rootPath);
        assertDir(workspacePath);
        initialized = true;
    }

    if (!lazyInitialization) {
        _init();
    }

    /**
     * Writes the given value as JSON to the file. It must follow the Schema type.
     * @param path The relative path within the workspace to write the object to.
     * @param value The object to serialize and write.
     * @returns A promise that resolves when the write is complete.
     */
    async function writeObject(path: string, value: Schema): Promise<void> {
        _init();
        const _path = resolve(workspacePath, path);
        const data = JSON.stringify(value, null, 2);

        if (!existsSync(dirname(_path))) {
            assertDir(dirname(_path));
        }

        await writeFile(_path, data);
    }

    /**
     * Reads and parses a JSON object from the file. If the file does not exist,
     * it will be created with the provided default value.
     * @param path The relative path within the workspace to read the object from.
     * @param defaultValue The default value to write and return if the file does not exist.
     * @returns A promise that resolves to the parsed object.
     */
    async function readObject(
        path: string,
        defaultValue: Schema
    ): Promise<Schema> {
        _init();
        const _path = resolve(workspacePath, path);

        if (!existsSync(_path)) {
            await writeObject(_path, defaultValue);
        }

        const stringData = await readFile(_path, 'utf-8');
        const data: Schema = JSON.parse(stringData);

        return data;
    }

    /**
     * Removes the file at the specified relative path within the workspace.
     * If the file does not exist, no action is taken.
     * @param path The relative path within the workspace to remove the object from.
     * @returns A promise that resolves when the file is removed.
     */
    async function removeObject(path: string): Promise<void> {
        _init();
        const _path = resolve(workspacePath, path);
        if (existsSync(_path)) await unlink(_path);
    }

    /**
     * Destroys the entire storage by removing the root directory and all its contents.
     * @returns A promise that resolves when the storage is destroyed.
     */
    async function destroy(): Promise<void> {
        if (!existsSync(_rootPath)) return;
        await rm(_rootPath, { recursive: true, force: true });
    }

    /**
     * Get the root path of the storage.
     * @returns The absolute path to the root directory.
     */
    function getRootPath(): string {
        _init();
        return _rootPath;
    }

    /**
     * Get the workspace path (root path + workspace).
     * @returns The absolute path to the root directory for the current workspace.
     */
    function getWorkspacePath(): string {
        _init();
        return workspacePath;
    }

    /**
     * Get the absolute path for a given relative path within the storage root.
     * @param relativePath The relative path to resolve.
     * @returns The absolute path.
     */
    function getPath(relativePath: string): string {
        _init();
        return resolve(workspacePath, relativePath);
    }

    /**
     * Create a new workspace with the given key.
     * @param key The key to create a unique workspace directory.
     * @returns A new FileStorage instance for the specified workspace.
     */
    function createWorkspace<WorkspaceSchema extends object = Schema>(
        key: string
    ) {
        if (key === constants.workspace.defaultKey) {
            throw new Error(
                `Workspace key cannot be the default key: ${constants.workspace.defaultKey}`
            );
        }

        _init();
        return FileStorage<WorkspaceSchema>(_rootPath, lazyInitialization, key);
    }

    /**
     * Destroy the current workspace by removing its directory and all its contents.
     * @returns A promise that resolves when the workspace is destroyed.
     */
    async function destroyWorkspace(): Promise<void> {
        if (!existsSync(workspacePath)) return;
        await rm(workspacePath, { recursive: true, force: true });
    }

    return {
        /**
         * Writes the given value as JSON to the file. It must follow the Schema type.
         * @param path The relative path within the workspace to write the object to.
         * @param value The object to serialize and write.
         * @returns A promise that resolves when the write is complete.
         */
        writeObject,
        /**
         * Reads and parses a JSON object from the file. If the file does not exist,
         * it will be created with the provided default value.
         * @param path The relative path within the workspace to read the object from.
         * @param defaultValue The default value to write and return if the file does not exist.
         * @returns A promise that resolves to the parsed object.
         */
        readObject,
        /**
         * Removes the file at the specified relative path within the workspace. If the file does not exist,
         * no action is taken.
         * @param path The relative path within the workspace to remove the object from.
         * @returns A promise that resolves when the file is removed.
         */
        removeObject,
        /**
         * Get the root path of the storage.
         * @returns The absolute path to the root directory.
         */
        getRootPath,
        /**
         * Get the workspace path (root path + workspace).
         * @returns The absolute path to the root directory for the current workspace.
         */
        getWorkspacePath,
        /**
         * Get the absolute path for a given relative path within the storage root.
         * @param relativePath The relative path to resolve.
         * @returns The absolute path.
         */
        getPath,
        /**
         * Destroys the entire storage by removing the root directory and all its contents.
         * @returns A promise that resolves when the storage is destroyed.
         */
        destroy,
        /**
         * Create a new workspace with the given key.
         * @param key The key to create a unique workspace directory.
         * @returns A new FileStorage instance for the specified workspace.
         */
        createWorkspace,
        /**
         * Destroy the current workspace by removing its directory and all its contents.
         * @returns A promise that resolves when the workspace is destroyed.
         */
        destroyWorkspace
    };
}
