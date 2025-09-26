import constants from './src/util/constants.js';
import FileStorage, {
    FileStorageInstance
} from './src/services/FileStorage.js';
import ObjectStorage from './src/services/ObjectStorage.js';
import SecretStorage, {
    type FallbackStorageOptions
} from './src/services/SecretStorage.js';
import hasStableKeychain from './src/util/hasStableKeychain.js';

import { type CliCoreExtension } from '@giancarl021/cli-core';
import type VaultExtensionAddons from './src/interfaces/VaultExtensionAddons.js';
import type VaultExtensionOptions from './src/interfaces/VaultExtensionOptions.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './src/interfaces/VaultExtensionSchema.js';
import type { PartialVaultExtensionOptions } from './src/interfaces/VaultExtensionOptions.js';

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

interface EnvVarResult {
    name: string;
    value: string;
    valid: boolean;
}

/**
 * Vault extension for CLI Core.
 * Allows easy management of persistent and temporary JSON data storage,
 * as well as secret storage based on the OS keychain.
 * @param options Options for configuring the vault extension.
 * @returns A CLI Core extension object.
 */
export default function VaultExtension(
    options: PartialVaultExtensionOptions = {}
): CliCoreExtension {
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

    /**
     * Get a environment variable and check if it is valid (non-empty).
     * @param envVarName The name of the environment variable to check for the encryption key.
     * @returns The value of the environment variable and its validity.
     */
    function _getEnvVar(envVarName: string): EnvVarResult {
        const value = process.env[envVarName] || '';
        return { value, valid: Boolean(value.trim()), name: envVarName };
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
            const _options = _parseOptions(appName);
            const temp = FileStorage(
                _options.tempPath,
                _options.lazyInitialization
            );

            logger.debug(`Temporary directory created at ${_options.tempPath}`);

            const objectStorage = ObjectStorage<VaultExtensionSchema>(
                FileStorage(_options.dataPath, _options.lazyInitialization),
                _options.initialData
            );

            logger.debug(`Data storage initialized at ${_options.dataPath}`);

            const tempObjectStorage = ObjectStorage<VaultExtensionTempSchema>(
                temp,
                _options.tempInitialData
            );

            const stableKeychain = hasStableKeychain();
            const fileSystemEncryptionKey = _getEnvVar(
                _options.secretStorage.encryptionKeyEnvVar
            );

            if (!stableKeychain && _options.secretStorage.mode === 'keychain') {
                logger.warning(
                    `The current system does not have a stable keychain. Please change the secret storage mode to \`filesystem\` or \`auto\` with a valid encryption key set in the ${fileSystemEncryptionKey.name} environment variable to ensure data safety and persistance.`
                );
            }

            let keychainOptions: FallbackStorageOptions | undefined = undefined;

            if (
                // Using filesystem storage either by explicit configuration
                // or because the keychain is not stable.
                _options.secretStorage.mode !== 'keychain' &&
                (_options.secretStorage.mode === 'filesystem' ||
                    !stableKeychain)
            ) {
                keychainOptions = {
                    useFilesystem: true,
                    encryptionKey: fileSystemEncryptionKey.value,
                    filePath: `${_options.dataPath}/${constants.workspace.defaultKey}/${constants.workspace.secretPath}`,
                    lazyInitialization: _options.lazyInitialization
                };
            }

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
                const _options = _parseOptions(options.appName);
                const stableKeychain = hasStableKeychain();

                const forcedKeychain =
                    _options.secretStorage.mode === 'keychain';

                const autoMode = _options.secretStorage.mode === 'auto';

                const fileSystemEncryptionKey = _getEnvVar(
                    _options.secretStorage.encryptionKeyEnvVar
                );

                if (
                    forcedKeychain ||
                    (autoMode && stableKeychain) ||
                    fileSystemEncryptionKey.valid
                )
                    return route;

                const message = `${autoMode ? 'Your system does not have a stable keychain, using filesystem secret storage' : 'No encryption key available'}. To avoid data loss set a encryption key for the filesystem secret storage by setting the ${options.logger.colors.yellowBright(_options.secretStorage.encryptionKeyEnvVar)} environment variable.`;

                return {
                    ...route,
                    status: 'error',
                    result: new Error(message)
                };
            },
            /**
             * Before the CLI Core application exits, clean up the temporary directory if configured to do so.
             * @param options Options provided by CLI Core.
             * @returns A promise that resolves when the cleanup is complete.
             */
            async beforeEnding(options) {
                const _options = _parseOptions(options.appName);
                if (_options.destroyTempOnExit) {
                    options.logger.debug('Destroying temporary directory');

                    const temp = FileStorage(
                        _options.tempPath,
                        _options.lazyInitialization
                    );

                    await temp.destroy();
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
