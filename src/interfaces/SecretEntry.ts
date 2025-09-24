export default interface SecretEntry {
    getPassword(): Promise<string | null>;
    setPassword(password: string): Promise<void>;
    deletePassword(): Promise<boolean>;
}

export type SecretEntryFactory = (appName: string, key: string) => SecretEntry;
