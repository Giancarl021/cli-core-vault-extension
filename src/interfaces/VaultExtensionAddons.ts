import type { ObjectStorageInstance } from '../services/ObjectStorage.js';
import type { SecretStorageInstance } from '../services/SecretStorage.js';
import type { TemporaryDirectoryInstance } from '../services/TemporaryDirectory.js';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './VaultExtensionSchema.js';

export default interface VaultExtensionAddons {
    data: ObjectStorageInstance<VaultExtensionSchema>;
    secrets: SecretStorageInstance;
    temp: {
        data: ObjectStorageInstance<VaultExtensionTempSchema>;
        directory: TemporaryDirectoryInstance;
    };
}
