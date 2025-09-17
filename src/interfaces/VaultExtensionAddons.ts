import type { ObjectStorageInstance } from '../services/ObjectStorage.js';
import type { SecretStorageInstance } from '../services/SecretStorage.js';
import type { TemporaryDirectoryInstance } from '../services/TemporaryDirectory.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './VaultExtensionSchema.js';

/**
 * Addons provided by the Vault extension.
 */
export default interface VaultExtensionAddons {
    /**
     * Persistent JSON object storage.
     */
    data: ObjectStorageInstance<VaultExtensionSchema>;
    /**
     * Secure secret storage, protected by the operating system's secure storage mechanisms.
     */
    secrets: SecretStorageInstance;
    /**
     * Temporary storage, including a temporary JSON object storage and a temporary directory.
     */
    temp: {
        /**
         * Temporary JSON object storage.
         */
        data: ObjectStorageInstance<VaultExtensionTempSchema>;
        /**
         * Temporary directory for storing temporary files, such as caches or session data.
         */
        directory: TemporaryDirectoryInstance;
    };
}
