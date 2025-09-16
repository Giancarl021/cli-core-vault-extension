import type { ObjectStorageInstance } from '../services/ObjectStorage';
import type { SecretStorageInstance } from '../services/SecretStorage';
import type { TemporaryDirectoryInstance } from '../services/TemporaryDirectory';
import type {
    VaultExtensionSchema,
    VaultExtensionTempSchema
} from './VaultExtensionSchema';

export default interface VaultExtensionAddons {
    data: ObjectStorageInstance<VaultExtensionSchema>;
    secrets: SecretStorageInstance;
    temp: {
        data: ObjectStorageInstance<VaultExtensionTempSchema>;
        directory: TemporaryDirectoryInstance;
    };
}
