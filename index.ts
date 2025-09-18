import constants from './src/util/constants.js';
import FileStorage, { FileStorageFactory } from './src/services/FileStorage.js';
import StorageEngine from './src/interfaces/StorageEngine.js';
import ObjectStorage from './src/services/ObjectStorage.js';
import SecretStorage from './src/services/SecretStorage.js';
import MemoryStorage, {
    MemoryStorageFactory
} from './src/services/MemoryStorage.js';
import assertDir from './src/util/assertDir.js';
import TemporaryDirectory, {
    type TemporaryDirectoryInstance
} from './src/services/TemporaryDirectory.js';

import { type CliCoreExtension } from '@giancarl021/cli-core';
import type VaultExtensionAddons from './src/interfaces/VaultExtensionAddons.js';
import type VaultExtensionOptions from './src/interfaces/VaultExtensionOptions.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './src/interfaces/VaultExtensionSchema.js';
import { dirname } from 'path';

declare module '@giancarl021/cli-core' {
    export interface CliCoreCommandAddons {
        vault: VaultExtensionAddons;
    }
}

interface Context {
    options: VaultExtensionOptions;
    tempDir: TemporaryDirectoryInstance;
}

export default function VaultExtension(
    options: Partial<VaultExtensionOptions> = {}
): CliCoreExtension {
    const context: Context = {
        tempDir: null!,
        options: null!
    };

    function _parseOptions(appName: string): VaultExtensionOptions {
        const dataPath =
            options.dataPath ??
            `${constants.data.rootPrefix}/.${appName}/data.json`;

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
            destroyTempOnExit: options.destroyTempOnExit ?? false,
            storageEngine: options.storageEngine ?? FileStorageFactory()
        };
    }

    return {
        name: 'vault',
        buildCommandAddons: ({ appName, logger }) => {
            context.options = _parseOptions(appName);
            context.tempDir = TemporaryDirectory(context.options.tempPath);

            logger.debug(
                `Temporary directory created at ${context.tempDir.getRootPath()} with default workspace at ${context.tempDir.getWorkspacePath()}`
            );

            assertDir(dirname(context.options.dataPath));

            logger.debug(
                `Ensured data directory exists at ${context.options.dataPath}`
            );

            const objectStorage = ObjectStorage(
                context.options.storageEngine(
                    context.options.dataPath,
                    context.options.initialData
                )
            );

            logger.debug(
                `Data storage initialized at ${context.options.dataPath}`
            );

            const tempObjectStorage = ObjectStorage(
                context.options.storageEngine(
                    context.tempDir.getPath('data.json'),
                    context.options.tempInitialData
                )
            );

            logger.debug(
                `Temporary data storage initialized at ${context.tempDir.getPath(
                    'data.json'
                )}`
            );

            const secretStorage = SecretStorage(appName);

            logger.debug('Secret storage initialized');

            return {
                data: objectStorage,
                secrets: secretStorage,
                temp: {
                    data: tempObjectStorage,
                    directory: context.tempDir
                }
            };
        },
        interceptors: {
            beforeEnding(options) {
                if (context.options.destroyTempOnExit) {
                    options.logger.debug(
                        `Destroying temporary directory at ${context.tempDir.getRootPath()}...`
                    );
                    context.tempDir?.destroy();
                }
            }
        }
    };
}

export { MemoryStorage, MemoryStorageFactory, FileStorage, FileStorageFactory };

export type {
    StorageEngine,
    VaultExtensionOptions,
    VaultExtensionAddons,
    VaultExtensionSchema,
    VaultExtensionTempSchema
};
