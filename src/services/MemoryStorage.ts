import type StorageEngine from '../interfaces/StorageEngine';

export default function MemoryStorage<Schema extends object>(
    path: string,
    initialData?: Schema
): StorageEngine<Schema> {
    const data: {
        [key: string]: Schema;
    } = {
        [path]: initialData ?? ({} as Schema)
    };

    async function write<LocalSchema extends object = Schema>(
        value: LocalSchema
    ): Promise<void> {
        data[path] = value as unknown as Schema;
    }

    async function read<
        LocalSchema extends object = Schema
    >(): Promise<LocalSchema> {
        return (data[path] ?? {}) as unknown as LocalSchema;
    }

    async function remove(): Promise<void> {
        delete data[path];
    }

    return {
        write,
        read,
        remove
    };
}
