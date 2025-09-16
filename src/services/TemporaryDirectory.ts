import { resolve } from 'path';
import constants from '../util/constants';
import hash from '../util/hash';
import { existsSync, mkdirSync, rmSync } from 'fs';

/**
 * An instance of the TempStorage service.
 */
export type TemporaryDirectoryInstance = ReturnType<typeof TemporaryDirectory>;

/**
 * Temporary directory service.
 *
 * @param appName The name of the application using the temp storage.
 * @param key An optional key to create a unique temp storage directory. Defaults to 'default'.
 * @returns An object with methods to get the root path, resolve paths, and destroy the temp storage.
 */
export default function TemporaryDirectory(
    rootPath: string,
    key: string = constants.temp.defaultKey
) {
    // Resolve the root directory for the temp storage
    const root = resolve(
        rootPath,
        key === constants.temp.defaultKey ? key : hash(key)
    );

    // Ensure the root directory exists
    if (!existsSync(root)) {
        mkdirSync(root, { recursive: true });
    }

    /**
     * Get the root path of the temp storage.
     * @returns The absolute path to the root directory.
     */
    function getRootPath(): string {
        return rootPath;
    }

    /**
     * Get the workspace path (root path + workspace).
     * @returns The absolute path to the root directory for the current workspace.
     */
    function getWorkspacePath(): string {
        return root;
    }

    /**
     * Get the absolute path for a given relative path within the temp storage root.
     * @param relativePath The relative path to resolve.
     * @returns The absolute path.
     */
    function getPath(relativePath: string): string {
        return resolve(root, ...relativePath.split(/(\\|\/)/g));
    }

    /**
     * Create a new temporary workspace within the current temp storage.
     * @param key A key to create a unique temporary workspace directory.
     * @returns A new TemporaryDirectoryInstance for the specified key.
     */
    function createTemporaryWorkspace(key: string) {
        return TemporaryDirectory(rootPath, key);
    }

    /**
     * Destroy the temp storage by removing the root directory and all its contents.
     */
    function destroy(): void {
        if (!existsSync(rootPath)) return;
        rmSync(rootPath, { recursive: true, force: true });
    }

    return {
        /**
         * Get the root path of the temp storage.
         * @returns The absolute path to the root directory.
         */
        getRootPath,
        /**
         * Get the absolute path for a given relative path within the temp storage root.
         * @param relativePath The relative path to resolve.
         * @returns The absolute path.
         */
        getPath,
        /**
         * Create a new temporary workspace within the current temp storage.
         * @param key A key to create a unique temporary workspace directory.
         * @returns A new TemporaryDirectoryInstance for the specified key.
         */
        createTemporaryWorkspace,
        /**
         * Get the workspace path (root path + workspace).
         * @returns The absolute path to the root directory for the current workspace.
         */
        getWorkspacePath,
        /**
         * Destroy the temp storage by removing the root directory and all its contents.
         */
        destroy
    };
}
