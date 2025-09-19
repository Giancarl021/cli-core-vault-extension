import type { ObjectStorageInstance } from '../services/ObjectStorage.js';
import type { SecretStorageInstance } from '../services/SecretStorage.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './VaultExtensionSchema.js';

/**
 * Addons provided by the Vault extension.
 */
export default interface VaultExtensionAddons {
    /**
     * Persistent data storage, backed by a JSON file.
     * It also exposes the underlying storage engine for specific operations with files.
     */
    data: ObjectStorageInstance<VaultExtensionSchema>;
    /**
     * Secure secret storage, protected by the operating system's secure storage mechanisms.
     */
    secrets: SecretStorageInstance;
    /**
     * Temporary data storage, backed by a JSON file in a temporary directory.
     * It also exposes the underlying storage engine for specific operations with files.
     */
    temp: ObjectStorageInstance<VaultExtensionTempSchema>;
}
