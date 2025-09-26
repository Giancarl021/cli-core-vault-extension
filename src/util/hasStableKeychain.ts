import { platform } from 'os';
import { execSync } from 'child_process';

/**
 * Checks if the current platform has a stable keychain available.
 * @returns `true` if a stable keychain is available, `false` otherwise.
 */
export default function hasStableKeychain(): boolean {
    const _platform = platform();

    if (_platform === 'win32') {
        // DPAPI is always available on Windows
        return true;
    }

    if (_platform === 'darwin') {
        // Check if the login keychain is available
        try {
            const output = execSync('security list-keychains', {
                stdio: ['ignore', 'pipe', 'ignore']
            }).toString('utf8');
            return output.includes('login.keychain');
        } catch {
            return false;
        }
    }

    if (_platform === 'linux') {
        // Check if the Secret Service API is available via D-Bus
        if (!process.env.DBUS_SESSION_BUS_ADDRESS) {
            return false;
        }

        try {
            // Check if the 'org.freedesktop.secrets' service is available
            const output = execSync('busctl --user list', {
                stdio: ['ignore', 'pipe', 'ignore']
            }).toString();
            return output.includes('org.freedesktop.secrets');
        } catch {
            return false;
        }
    }

    return false;
}