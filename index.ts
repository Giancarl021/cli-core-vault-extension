import type { CliCoreExtension } from '@giancarl021/cli-core';
import type VaultExtensionAddons from './src/interfaces/VaultExtensionAddons';
import type VaultExtensionOptions from './src/interfaces/VaultExtensionOptions';
import constants from './src/util/constants';
import FileStorage from './src/services/FileStorage';
import StorageEngine from './src/interfaces/StorageEngine';
import ObjectStorage from './src/services/ObjectStorage';
import SecretStorage from './src/services/SecretStorage';
import TemporaryDirectory, {
    type TemporaryDirectoryInstance
} from './src/services/TemporaryDirectory';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './src/interfaces/VaultExtensionSchema';

declare module '@giancarl021/cli-core' {
    export interface CliCoreCommandAddons extends VaultExtensionAddons {}
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

        const initialData = options.initialData ?? {};

        return {
            initialData,
            dataPath,
            tempPath,
            destroyTempOnExit: options.destroyTempOnExit ?? false,
            storageEngine:
                options.storageEngine ??
                (dataPath => FileStorage(dataPath, initialData))
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

            const objectStorage = ObjectStorage(
                context.options.storageEngine(context.options.dataPath)
            );

            logger.debug(
                `Data storage initialized at ${context.options.dataPath}`
            );

            const tempObjectStorage = ObjectStorage(
                context.options.storageEngine(
                    context.tempDir.getPath('data.json')
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

export type {
    StorageEngine,
    VaultExtensionOptions,
    VaultExtensionAddons,
    VaultExtensionSchema,
    VaultExtensionTempSchema
};
