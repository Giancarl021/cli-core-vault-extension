import { describe, expect, test } from '@jest/globals';

import MemoryStorage from '../../../src/services/MemoryStorage.js';
import ObjectStorage from '../../../src/services/ObjectStorage.js';

describe('[UNIT] services/ObjectStorage', () => {
    test('Should set and get nested properties correctly', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('testPathNested')
        );

        await storage.set('user.name', 'Alice');
        await storage.set('user.age', 30);
        await storage.set('user.address.city', 'Wonderland');
        await storage.set('settings.theme', 'dark');
        await storage.set('settings.notifications', true);

        expect(await storage.get('user.name')).toBe('Alice');
        expect(await storage.get('user.age')).toBe(30);
        expect(await storage.get('user.address.city')).toBe('Wonderland');
        expect(await storage.get('settings.theme')).toBe('dark');
        expect(await storage.get('settings.notifications')).toBe(true);
    });

    test('Should delete properties correctly', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('testPathDelete')
        );

        await storage.set('user.name', 'Bob');
        await storage.set('user.age', 25);
        await storage.set('user.address.city', 'Builderland');
        await storage.set('settings.theme', 'light');
        await storage.set('settings.notifications', false);

        await storage.remove('user.age');
        await storage.remove('settings.notifications');

        expect(await storage.get('user.name')).toBe('Bob');
        expect(await storage.get('user.age')).toBeUndefined();
        expect(await storage.get('user.address.city')).toBe('Builderland');
        expect(await storage.get('settings.theme')).toBe('light');
        expect(await storage.get('settings.notifications')).toBeUndefined();
    });

    test('Should return default value if property does not exist', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                user: { name: string; age: number };
                settings: { theme: string; notifications: boolean };
            }>('testPathDefault')
        );

        expect(await storage.get('user.name', 'DefaultName')).toBe('DefaultName');
        expect(await storage.get('user.age', 99)).toBe(99);
        expect(await storage.get('settings.theme', 'defaultTheme')).toBe(
            'defaultTheme'
        );
        expect(
            await storage.get('settings.notifications', true)
        ).toBe(true);
    });

    test('Should list all keys correctly', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('testPathListKeys')
        );

        await storage.set('user.name', 'Eve');
        await storage.set('user.age', 22);
        await storage.set('user.address.city', 'Eden');
        await storage.set('settings.theme', 'nature');
        await storage.set('settings.notifications', true);

        const keys = await storage.listKeys();
        expect(keys.sort()).toEqual(
            [
                'user.name',
                'user.age',
                'user.address.city',
                'settings.theme',
                'settings.notifications'
            ].sort()
        );
    });

    test('Should enforce schema types on set method', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                user: { name: string; age: number };
                settings: { theme: string; notifications: boolean };
            }>('testPathTypeSafety')
        );

        // Correct types
        await storage.set('user.name', 'Charlie');
        await storage.set('user.age', 28);
        await storage.set('settings.theme', 'blue');
        await storage.set('settings.notifications', true);

        expect(await storage.get('user.name')).toBe('Charlie');
        expect(await storage.get('user.age')).toBe(28);
        expect(await storage.get('settings.theme')).toBe('blue');
        expect(await storage.get('settings.notifications')).toBe(true);

        // @ts-expect-error: Wrong type (age should be number)
        await storage.set('user.age', 'NotANumber');

        // @ts-expect-error: Wrong type (notifications should be boolean)
        await storage.set('settings.notifications', 'NotABoolean');

        // @ts-expect-error: Non-existent property
        await storage.set('user.nonExistentProp', 'SomeValue');
    });

    test('Should handle setting and getting entire object', async () => {
        const storage = ObjectStorage(
            MemoryStorage<{
                profile: { username: string; details: { bio: string; website: string } };
            }>('testPathEntireObject')
        );

        await storage.set('profile', {
            username: 'devUser',
            details: { bio: 'Developer', website: 'https://devuser.com' }
        });

        expect(await storage.get('profile.username')).toBe('devUser');
        expect(await storage.get('profile.details.bio')).toBe('Developer');
        expect(await storage.get('profile.details.website')).toBe(
            'https://devuser.com'
        );
    });
});