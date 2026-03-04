import {Inject, Injectable} from "@nestjs/common"

import type {ISettingsServiceConfig} from "./config/settings-config.module"
import {SETTINGS_SERVICE_CONFIG_TOKEN} from "./settings.tokens"

/**
 * Settings item shape exposed by settings-service.
 */
export interface ISettingItem {
    readonly key: string
    readonly value: unknown
}

/**
 * Settings snapshot payload.
 */
export interface ISettingsSnapshot {
    readonly items: readonly ISettingItem[]
}

interface ISettingsCache {
    readonly snapshot: ISettingsSnapshot
    readonly lookup: Map<string, ISettingItem>
    readonly lastModified: number
}

/**
 * Loads settings from file system with caching.
 */
@Injectable()
export class SettingsService {
    private readonly filePath: string
    private cache: ISettingsCache | undefined

    /**
     * Creates settings service.
     *
     * @param config Settings-service configuration.
     */
    public constructor(
        @Inject(SETTINGS_SERVICE_CONFIG_TOKEN)
        config: ISettingsServiceConfig,
    ) {
        this.filePath = config.data.filePath
    }

    /**
     * Returns full settings snapshot.
     *
     * @returns Settings snapshot.
     */
    public async getAll(): Promise<ISettingsSnapshot> {
        const cache = await this.loadCache()
        return cache.snapshot
    }

    /**
     * Returns setting item by key.
     *
     * @param key Setting key.
     * @returns Setting item when found.
     */
    public async getByKey(key: string): Promise<ISettingItem | undefined> {
        const cache = await this.loadCache()
        return cache.lookup.get(key)
    }

    private async loadCache(): Promise<ISettingsCache> {
        const file = Bun.file(this.filePath)
        const exists = await file.exists()
        if (!exists) {
            throw new Error(`Settings file not found: ${this.filePath}`)
        }

        const lastModified = file.lastModified

        if (this.cache !== undefined && this.cache.lastModified === lastModified) {
            return this.cache
        }

        const payload: unknown = await file.json()
        const snapshot = normalizeSnapshot(payload)
        const lookup = new Map<string, ISettingItem>()

        for (const item of snapshot.items) {
            lookup.set(item.key, item)
        }

        const cache: ISettingsCache = {
            snapshot,
            lookup,
            lastModified,
        }

        this.cache = cache
        return cache
    }
}

/**
 * Normalizes and validates settings payload.
 *
 * @param payload Raw JSON payload.
 * @returns Normalized snapshot.
 */
function normalizeSnapshot(payload: unknown): ISettingsSnapshot {
    if (!isRecord(payload)) {
        throw new Error("Settings payload must be an object")
    }

    const itemsValue = payload["items"]
    if (!Array.isArray(itemsValue)) {
        throw new Error("Settings payload must contain items array")
    }

    const items: ISettingItem[] = []
    const uniqueKeys = new Set<string>()

    for (const rawItem of itemsValue) {
        const item = normalizeItem(rawItem)
        if (uniqueKeys.has(item.key)) {
            throw new Error(`Duplicate settings key: ${item.key}`)
        }

        uniqueKeys.add(item.key)
        items.push(item)
    }

    return {
        items: Object.freeze(items),
    }
}

/**
 * Normalizes and validates settings item.
 *
 * @param value Raw item value.
 * @returns Normalized item.
 */
function normalizeItem(value: unknown): ISettingItem {
    if (!isRecord(value)) {
        throw new Error("Settings item must be an object")
    }

    const keyValue = value["key"]
    if (typeof keyValue !== "string") {
        throw new Error("Settings item key must be a string")
    }

    const key = keyValue.trim()
    if (key.length === 0) {
        throw new Error("Settings item key cannot be empty")
    }

    if (!Object.prototype.hasOwnProperty.call(value, "value")) {
        throw new Error(`Settings item '${key}' is missing value`)
    }

    return {
        key,
        value: value["value"],
    }
}

/**
 * Runtime guard for record values.
 *
 * @param value Input value.
 * @returns True when value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}
