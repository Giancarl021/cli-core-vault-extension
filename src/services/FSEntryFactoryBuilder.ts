import { mkdir, rename, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scryptSync
} from 'crypto';
import { userInfo } from 'os';
import { dirname } from 'path';
import hash from '../util/hash.js';
import constants from '../util/constants.js';
import type { SecretEntryFactory } from '../interfaces/SecretEntry.js';

/**
 * Credentials used for encryption/decryption.
 */
interface Credentials {
    /**
     * Encryption key.
     */
    key: Buffer;
    /**
     * User ID (used as additional authenticated data).
     */
    userId: Buffer;
}

/**
 * Build a SecretEntryFactory that creates SecretEntry instances using filesystem storage.
 * @param filePath The path to the file where secrets will be stored.
 * @param encryptionKey The encryption key used to encrypt/decrypt the secrets.
 * @returns A SecretEntryFactory function.
 */
export default function FSEntryFactoryBuilder(
    filePath: string,
    encryptionKey: string
): SecretEntryFactory {
    const buffer: Record<string, string> = _init();

    /**
     * Derive encryption key and user ID from the provided salt.
     * @param salt The salt used for key derivation.
     * @returns An object containing the derived key and user ID.
     */
    function _getCredentials(salt: Buffer): Credentials {
        const key = scryptSync(
            encryptionKey,
            salt,
            constants.filesystemSecretStorage.keyLength
        );

        const userId = Buffer.from(userInfo().uid.toString(), 'utf-8');

        return { key, userId };
    }

    /**
     * Encrypt the given data using the encryption key and a random IV and salt.
     * @param data The data to encrypt.
     * @returns The encrypted data as a Buffer.
     */
    function _encrypt(data: Record<string, string>): Buffer {
        const bytes = Buffer.from(JSON.stringify(data), 'utf-8');

        const iv = randomBytes(constants.filesystemSecretStorage.ivLength);
        const salt = randomBytes(constants.filesystemSecretStorage.sizeLength);

        const { key, userId } = _getCredentials(salt);

        const cipher = createCipheriv(
            constants.filesystemSecretStorage.algorithm,
            key,
            iv,
            {
                authTagLength: constants.filesystemSecretStorage.tagLength
            }
        );

        cipher.setAAD(userId);

        const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
        const tag = cipher.getAuthTag();

        // Combine salt, iv, tag, and encrypted data into a single Buffer
        return Buffer.concat([salt, iv, tag, encrypted]);
    }

    /**
     * Decrypt the given data using the encryption key.
     * @param data The data to decrypt.
     * @returns The decrypted data as an object.
     */
    function _decrypt(data: Buffer): Record<string, string> {
        const saltLength = constants.filesystemSecretStorage.sizeLength;
        const ivLength = constants.filesystemSecretStorage.ivLength;
        const tagLength = constants.filesystemSecretStorage.tagLength;

        // Extract salt, iv, tag, and encrypted data from the Buffer
        const salt = data.subarray(0, saltLength);
        const iv = data.subarray(saltLength, saltLength + ivLength);
        const tag = data.subarray(
            saltLength + ivLength,
            saltLength + ivLength + tagLength
        );
        const encrypted = data.subarray(saltLength + ivLength + tagLength);

        const { key, userId } = _getCredentials(salt);

        const decipher = createDecipheriv(
            constants.filesystemSecretStorage.algorithm,
            key,
            iv,
            {
                authTagLength: tagLength
            }
        );

        // Verify and set the authentication tag and additional authenticated data
        decipher.setAuthTag(tag);
        decipher.setAAD(userId);

        // Decrypt the data
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        // Parse and return the decrypted data as an object
        return JSON.parse(decrypted.toString('utf-8'));
    }

    /**
     * Read and decrypt the secrets file.
     * @returns The decrypted secrets as an object.
     */
    function _readFile(): Record<string, string> {
        if (!existsSync(filePath)) return {};
        const bytes = readFileSync(filePath);

        try {
            return _decrypt(bytes);
        } catch {
            throw new Error(
                'Failed to decrypt the secrets file. Ensure you are accessing the secrets from the same user and using the correct encryption key'
            );
        }
    }

    /**
     * Write and encrypt the secrets file atomically.
     * @param data The secrets data to write.
     */
    async function _writeFile(data: Record<string, string>): Promise<void> {
        const bytes = _encrypt(data);

        if (!existsSync(dirname(filePath))) {
            await mkdir(dirname(filePath), { recursive: true });
        }

        await writeFile(`${filePath}.tmp`, bytes, {
            mode: 0o600
        });
        await rename(`${filePath}.tmp`, filePath);
    }

    /**
     * Create a unique key for the given appName and key by hashing them.
     * @param appName The name of the application.
     * @param key The key of the secret.
     * @returns The hashed key.
     */
    function _getKey(appName: string, key: string): string {
        return hash(`${appName}.${key}`);
    }

    /**
     * Initialize the storage by reading the existing file or creating a new one.
     * @returns The initial secrets data.
     */
    function _init(): Record<string, string> {
        return _readFile();
    }

    /**
     * Factory function to create a SecretEntry for the given appName and key.
     * @param appName The name of the application.
     * @param key The key of the secret.
     * @returns An object with methods to get, set, and delete the secret.
     */
    return (appName: string, key: string) => {
        const _key = _getKey(appName, key);
        return {
            async getPassword(): Promise<string | null> {
                await Promise.resolve();
                return buffer[_key] ?? null;
            },

            async setPassword(value: string) {
                buffer[_key] = value;
                await _writeFile(buffer);
            },

            async deletePassword(): Promise<boolean> {
                const had = _key in buffer;
                if (!had) return false;

                delete buffer[_key];
                await _writeFile(buffer);

                return true;
            }
        };
    };
}
