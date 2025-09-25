import constants from './src/util/constants.js';
import FileStorage, {
    FileStorageInstance
} from './src/services/FileStorage.js';
import ObjectStorage from './src/services/ObjectStorage.js';
import SecretStorage, {
    FallbackStorageOptions
} from './src/services/SecretStorage.js';

import { type CliCoreExtension } from '@giancarl021/cli-core';
import type VaultExtensionAddons from './src/interfaces/VaultExtensionAddons.js';
import type VaultExtensionOptions from './src/interfaces/VaultExtensionOptions.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './src/interfaces/VaultExtensionSchema.js';
import hasStableKeychain from './src/util/hasStableKeychain.js';

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
    options?: VaultExtensionOptions;
    /**
     * Temporary directory instance for the vault extension.
     */
    temp?: FileStorageInstance<VaultExtensionTempSchema>;
    /**
     * Whether the underlying OS keychain is stable and reliable.
     */
    stableKeychain: boolean;
    /**
     * Whether the filesystem encryption key is valid.
     */
    validFilesystemEncryptionKey?: boolean;
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
        stableKeychain: hasStableKeychain()
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

        if (
            dataPath.startsWith(tempPath + '/') ||
            tempPath.startsWith(dataPath + '/')
        ) {
            throw new Error(
                `Data path and temporary path cannot be subdirectories of each other: ${dataPath} and ${tempPath}`
            );
        }

        const initialData = options.initialData ?? {};
        const tempInitialData = options.tempInitialData ?? {};

        return {
            initialData,
            tempInitialData,
            dataPath,
            tempPath,
            secretStorage: {
                mode: options.secretStorage?.mode ?? 'auto',
                encryptionKeyEnvVar:
                    options.secretStorage?.encryptionKeyEnvVar ??
                    'CLI_CORE_VAULT_KEY'
            },
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
                `Temporary directory created at ${context.options.tempPath}`
            );

            const objectStorage = ObjectStorage<VaultExtensionSchema>(
                FileStorage(
                    context.options.dataPath,
                    context.options.lazyInitialization
                ),
                context.options.initialData
            );

            logger.debug(
                `Data storage initialized at ${context.options.dataPath}`
            );

            const tempObjectStorage = ObjectStorage<VaultExtensionTempSchema>(
                context.temp,
                context.options.tempInitialData
            );

            const secretEnvVar =
                process.env[
                    context.options.secretStorage.encryptionKeyEnvVar
                ] || '';

            context.validFilesystemEncryptionKey = Boolean(secretEnvVar);

            if (
                !context.stableKeychain &&
                context.options.secretStorage.mode === 'keychain'
            ) {
                logger.warning(
                    `The current system does not have a stable keychain. Please change the secret storage mode to \`filesystem\` or \`auto\` with a valid encryption key set in the ${context.options.secretStorage.encryptionKeyEnvVar} environment variable to ensure data safety and persistance.`
                );
            }

            const keychainOptions: FallbackStorageOptions | undefined =
                context.options.secretStorage.mode === 'keychain'
                    ? undefined
                    : context.options.secretStorage.mode === 'filesystem' ||
                        !context.stableKeychain
                      ? {
                            useFilesystem: true,
                            encryptionKey: secretEnvVar,
                            filePath: `${context.options.dataPath}/${constants.workspace.defaultKey}/${constants.workspace.secretPath}`,
                            lazyInitialization:
                                context.options.lazyInitialization
                        }
                      : undefined;

            const secretStorage = SecretStorage(appName, keychainOptions);

            logger.debug(
                `Secret storage initialized using ${keychainOptions ? 'filesystem' : 'keychain'} mode`
            );

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
             * Before running any command, ensure that if the OS keychain is not stable,
             * a valid encryption key is provided for filesystem fallback storage, warning
             * the user if not.
             * @param options Options provided by CLI Core.
             * @param route The current command route.
             * @returns The command route, or an error route if validation fails.
             */
            async beforeRunning(options, route) {
                if (
                    (context.options?.secretStorage.mode ?? 'keychain') ===
                        'keychain' ||
                    context.stableKeychain ||
                    context.validFilesystemEncryptionKey
                )
                    return route;

                return {
                    ...route,
                    status: 'error',
                    result: new Error(
                        `${(context.options?.secretStorage.mode ?? 'auto') === 'auto' ? 'Your system does not have a stable keychain, using filesystem secret storage.' : 'No encryption key available'}. To avoid data loss set a encryption key for the filesystem secret storage by setting the ${options.logger.colors.yellowBright(context.options?.secretStorage.encryptionKeyEnvVar ?? 'CLI_CORE_VAULT_KEY')} environment variable.`
                    )
                };
            },
            /**
             * Before the CLI Core application exits, clean up the temporary directory if configured to do so.
             * @param options Options provided by CLI Core.
             * @returns A promise that resolves when the cleanup is complete.
             */
            async beforeEnding(options) {
                if (context.options?.destroyTempOnExit) {
                    options.logger.debug('Destroying temporary directory');

                    await context.temp?.destroy();
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
