import { readFile } from 'fs/promises';
import type { SecretEntryFactory } from '../interfaces/SecretEntry.js';
import { createCipheriv, createDecipheriv } from 'crypto';
import hash from '../util/hash.js';

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
    const key = Buffer.from(hash(encryptionKey), 'hex');
    const iv = '';
    const cipher = createCipheriv(
        'aes-256-gcm',
        Buffer.from(encryptionKey, 'hex'),
        Buffer.alloc(16, 0)
    );

    const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(encryptionKey, 'hex'),
        bytes.slice(0, 16)
    );
    async function _readFile(): Promise<Record<string, string>> {
        const bytes = await readFile(filePath);

        return JSON.parse(bytes);
    }

    return (appName: string, key: string) => {};
}
