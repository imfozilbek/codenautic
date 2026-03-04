import type {ISystemSettingsProvider} from "@codenautic/core"

import {SettingsServiceClient} from "./settings-service.client"

/**
 * Settings-service backed provider for system settings.
 */
export class SettingsServiceSystemSettingsProvider implements ISystemSettingsProvider {
    private readonly client: SettingsServiceClient

    /**
     * Creates system settings provider.
     *
     * @param client Settings-service client.
     */
    public constructor(client: SettingsServiceClient) {
        this.client = client
    }

    /**
     * Returns setting value or null when missing.
     *
     * @param key Setting key.
     * @returns Setting value or null.
     */
    public async get<TValue>(key: string): Promise<TValue | undefined> {
        const item = await this.client.getOptionalSetting<TValue>(key)
        return item?.value
    }

    /**
     * Returns multiple settings by key.
     *
     * @param keys Keys to resolve.
     * @returns Key-value map with nulls for missing keys.
     */
    public async getMany<TValue>(keys: readonly string[]): Promise<ReadonlyMap<string, TValue>> {
        const result = new Map<string, TValue>()
        if (keys.length === 0) {
            return result
        }

        const snapshot = await this.client.getSettingsSnapshot<TValue>()
        const lookup = new Map(snapshot.items.map((item) => [item.key, item.value]))

        for (const key of keys) {
            if (lookup.has(key)) {
                result.set(key, lookup.get(key) as TValue)
            }
        }

        return result
    }
}
