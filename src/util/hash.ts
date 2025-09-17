import { createHash } from 'crypto';

/**
 * Generate a SHA-256 hash of the given input string.
 */
export default function hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}
