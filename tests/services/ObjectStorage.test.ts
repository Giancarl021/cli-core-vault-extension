import { afterEach, describe, expect, jest, test } from '@jest/globals';

import { fs as memfs } from 'memfs';

jest.unstable_mockModule('fs', () => memfs);
jest.unstable_mockModule('fs/promises', () => memfs.promises);

const { default: FileStorage } = await import(
    '../../src/services/FileStorage.js'
);

import ObjectStorage from '../../src/services/ObjectStorage.js';

afterEach(() => {
    const files = memfs.readdirSync('/');
    for (const file of files) {
        memfs.rmSync(`/${file}`, { recursive: true, force: true });
    }
});

describe('[UNIT] services/ObjectStorage', () => {
    test('Should set and get nested properties correctly', async () => {
        const storage = ObjectStorage(
            FileStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('/', false),
            {} as any
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
            FileStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('/', false),
            {} as any
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
            FileStorage<{
                user: { name: string; age: number };
                settings: { theme: string; notifications: boolean };
            }>('/', false),
            {} as any
        );

        expect(await storage.get('user.name', 'DefaultName')).toBe(
            'DefaultName'
        );
        expect(await storage.get('user.age', 99)).toBe(99);
        expect(await storage.get('settings.theme', 'defaultTheme')).toBe(
            'defaultTheme'
        );
        expect(await storage.get('settings.notifications', true)).toBe(true);
    });

    test('Should list all keys correctly', async () => {
        const storage = ObjectStorage(
            FileStorage<{
                user: { name: string; age: number; address: { city: string } };
                settings: { theme: string; notifications: boolean };
            }>('/', false),
            {} as any
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
            FileStorage<{
                user: { name: string; age: number };
                settings: { theme: string; notifications: boolean };
            }>('/', false),
            {} as any
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
            FileStorage<{
                profile: {
                    username: string;
                    details: { bio: string; website: string };
                };
            }>('/', false),
            {} as any
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

    test('Should return undefined for non-existent keys without default value', async () => {
        const storage = ObjectStorage(
            FileStorage<{
                config: { version: string; debug: boolean };
            }>('/', false),
            {} as any
        );

        expect(await storage.get('config.version')).toBeUndefined();
        expect(await storage.get('config.debug')).toBeUndefined();
        expect(await storage.get('nonExistent.key' as any)).toBeUndefined();
    });

    test('Should return initial data if provided', async () => {
        const initialData = {
            app: { name: 'TestApp', version: '1.0.0' },
            user: { loggedIn: false }
        };

        const storage = ObjectStorage(
            FileStorage<{
                app: { name: string; version: string };
                user: { loggedIn: boolean };
            }>('/', false),
            initialData as any
        );

        expect(await storage.get('app.name')).toBe('TestApp');
        expect(await storage.get('app.version')).toBe('1.0.0');
        expect(await storage.get('user.loggedIn')).toBe(false);
    });

    test('Should handle complex nested structures', async () => {
        const storage = ObjectStorage(
            FileStorage<{
                project: {
                    title: string;
                    tasks: {
                        id: number;
                        description: string;
                        completed: boolean;
                    }[];
                };
            }>('/', false),
            {} as any
        );

        await storage.set('project.title', 'New Project');
        await storage.set('project.tasks', [
            { id: 1, description: 'Task One', completed: false },
            { id: 2, description: 'Task Two', completed: true }
        ]);

        expect(await storage.get('project.title')).toBe('New Project');
        expect(await storage.get('project.tasks.0.description' as any)).toBe(
            'Task One'
        );
        expect(await storage.get('project.tasks[1].completed' as any)).toBe(
            true
        );
    });

    test('Storage instance should be returned correctly', async () => {
        const fileStorage = FileStorage<{
            sample: { key: string };
        }>('/', false);

        const storage = ObjectStorage(fileStorage, {} as any);

        expect(storage.storage).toBe(fileStorage);
    });
});
