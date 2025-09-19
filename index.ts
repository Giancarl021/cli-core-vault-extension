import constants from './src/util/constants.js';
import FileStorage, {
    FileStorageInstance
} from './src/services/FileStorage.js';
import ObjectStorage from './src/services/ObjectStorage.js';
import SecretStorage from './src/services/SecretStorage.js';

import { type CliCoreExtension } from '@giancarl021/cli-core';
import type VaultExtensionAddons from './src/interfaces/VaultExtensionAddons.js';
import type VaultExtensionOptions from './src/interfaces/VaultExtensionOptions.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './src/interfaces/VaultExtensionSchema.js';

// Extend the CLI Core command interface to include vault extension addons.
declare module '@giancarl021/cli-core' {
    /**
     * Addons provided by the vault extension.
     */
    export interface CliCoreCommandAddons {
        /**
         * Addons provided by the vault extension.
         */
        vault: VaultExtensionAddons;
    }
}

/**
 * Context for the vault extension.
 * It carries the options and temporary directory instance, to
 * allow multiple parts of the extension to access them.
 */
interface Context {
    /**
     * Parsed options for the vault extension.
     */
    options: VaultExtensionOptions;
    /**
     * Temporary directory instance for the vault extension.
     */
    temp: FileStorageInstance<VaultExtensionTempSchema>;
}

/**
 * Vault extension for CLI Core.
 * Allows easy management of persistent and temporary JSON data storage,
 * as well as secret storage based on the OS keychain.
 * @param options Options for configuring the vault extension.
 * @returns A CLI Core extension object.
 */
export default function VaultExtension(
    options: Partial<VaultExtensionOptions> = {}
): CliCoreExtension {
    /**
     * Assert that the context is always initialized before use.
     */
    const context: Context = {
        temp: null!,
        options: null!
    };

    /**
     * Parse and validate the options provided to the extension.
     * @param appName The name of the application using the extension.
     * @returns The parsed and validated options.
     */
    function _parseOptions(appName: string): VaultExtensionOptions {
        const dataPath =
            options.dataPath ?? `${constants.data.rootPrefix}/.${appName}`;

        const tempPath =
            options.tempPath ?? `${constants.temp.root}/.${appName}`;

        if (dataPath === tempPath) {
            throw new Error(
                `Data path and temporary path cannot be the same: ${dataPath}`
            );
        }

        const initialData = options.initialData ?? {};
        const tempInitialData = options.tempInitialData ?? {};

        return {
            initialData,
            tempInitialData,
            dataPath,
            tempPath,
            lazyInitialization: options.lazyInitialization ?? true,
            destroyTempOnExit: options.destroyTempOnExit ?? false
        };
    }

    return {
        /**
         * Name of the extension.
         */
        name: 'vault',
        /**
         * Build command addons for the vault extension.
         * Initializes the storage engines and temporary directory.
         *
         * @param cliCoreContext Context provided by CLI Core.
         * @returns Addons to be added to the CLI Core command.
         */
        buildCommandAddons: ({ appName, logger }) => {
            context.options = _parseOptions(appName);
            context.temp = FileStorage(
                context.options.tempPath,
                context.options.lazyInitialization
            );

            logger.debug(
                `Temporary directory created at ${context.temp.getRootPath()} with default workspace at ${context.temp.getWorkspacePath()}`
            );

            const objectStorage = ObjectStorage<VaultExtensionSchema>(
                FileStorage(
                    context.options.dataPath,
                    context.options.lazyInitialization
                ),
                context.options.initialData ?? {}
            );

            logger.debug(
                `Data storage initialized at ${objectStorage.storage.getWorkspacePath()}`
            );

            const tempObjectStorage = ObjectStorage<VaultExtensionTempSchema>(
                context.temp,
                context.options.tempInitialData ?? {}
            );

            logger.debug(
                `Temporary data storage initialized at ${context.temp.getWorkspacePath()}`
            );

            const secretStorage = SecretStorage(appName);

            logger.debug('Secret storage initialized');

            const addons: VaultExtensionAddons = {
                data: objectStorage,
                secrets: secretStorage,
                temp: tempObjectStorage
            };

            // To satisfy the return type
            return addons as {};
        },
        interceptors: {
            /**
             * Before the CLI Core application exits, clean up the temporary directory if configured to do so.
             */
            beforeEnding(options) {
                if (context.options.destroyTempOnExit) {
                    options.logger.debug(
                        `Destroying temporary directory at ${context.temp.getRootPath()}...`
                    );
                    context.temp?.destroy();
                }
            }
        }
    };
}

export type {
    VaultExtensionOptions,
    VaultExtensionAddons,
    VaultExtensionSchema,
    VaultExtensionTempSchema
};
