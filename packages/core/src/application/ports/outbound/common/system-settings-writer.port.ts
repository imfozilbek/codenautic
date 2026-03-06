/**
 * System setting payload for write operations.
 */
export interface ISystemSettingWriteInput {
    readonly key: string
    readonly value: unknown
}

/**
 * Persistence port for system settings.
 */
export interface ISystemSettingsWriter {
    /**
     * Checks whether key already exists.
     *
     * @param key System setting key.
     * @returns Whether setting exists.
     */
    has(key: string): Promise<boolean>

    /**
     * Persists system setting payload.
     *
     * @param setting Setting payload.
     * @returns Promise resolved when save completes.
     */
    save(setting: ISystemSettingWriteInput): Promise<void>
}
