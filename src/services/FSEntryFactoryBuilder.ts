import { readFile, rename, writeFile } from 'fs/promises';
import type { SecretEntryFactory } from '../interfaces/SecretEntry.js';
import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scryptSync
} from 'crypto';
import constants from '../util/constants.js';
import { userInfo } from 'os';

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
    const buffer: Record<string, string> = {};

    function _getCredentials(salt: Buffer): { key: Buffer; userId: Buffer } {
        const key = scryptSync(
            encryptionKey,
            salt,
            constants.filesystemSecretStorage.keyLength
        );

        const userId = Buffer.from(userInfo().uid.toString(), 'utf-8');

        return { key, userId };
    }

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

        return Buffer.concat([salt, iv, tag, encrypted]);
    }

    function _decrypt(data: Buffer): Record<string, string> {
        const saltLength = constants.filesystemSecretStorage.sizeLength;
        const ivLength = constants.filesystemSecretStorage.ivLength;
        const tagLength = constants.filesystemSecretStorage.tagLength;

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

        decipher.setAuthTag(tag);
        decipher.setAAD(userId);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return JSON.parse(decrypted.toString('utf-8'));
    }

    async function _readFile(): Promise<Record<string, string>> {
        const bytes = await readFile(filePath);

        return _decrypt(bytes);
    }

    async function _writeFile(data: Record<string, string>): Promise<void> {
        const bytes = _encrypt(data);

        await writeFile(`${filePath}.tmp`, bytes, {
            mode: 0o600
        });
        await rename(`${filePath}.tmp`, filePath);
    }

    return (appName: string, key: string) => {
        return {
            async getPassword() {},

            async setPassword(value: string) {},

            async deletePassword() {}
        };
    };
}
