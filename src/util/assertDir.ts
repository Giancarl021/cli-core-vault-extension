import { existsSync, lstatSync, mkdirSync } from 'fs';

/**
 * Ensure that the directory for the given path exists, creating it if necessary.
 * @param path The path to ensure the directory for.
 */
export default function assertDir(path: string) {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    } else if (lstatSync(path).isFile()) {
        throw new Error(`Path exists and is not a directory: ${path}`);
    }
}
