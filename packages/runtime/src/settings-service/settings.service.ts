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

interface IConfigCache {
    readonly payload: unknown
    readonly lastModified: number
}

const CONFIG_RESOURCES = {
    settings: "settings.json",
    prompts: "prompts.json",
    rules: "rules.json",
    categories: "categories.json",
    "expert-panels": "expert-panels.json",
} as const

export type ConfigResource = keyof typeof CONFIG_RESOURCES

const CONFIG_RESOURCE_LIST = Object.freeze(
    Object.keys(CONFIG_RESOURCES) as ConfigResource[],
)

/**
 * Loads settings from file system with caching.
 */
@Injectable()
export class SettingsService {
    private readonly settingsFilePath: string
    private readonly resourcePaths: ReadonlyMap<ConfigResource, string>
    private settingsCache: ISettingsCache | undefined
    private readonly configCache = new Map<ConfigResource, IConfigCache>()

    /**
     * Creates settings service.
     *
     * @param config Settings-service configuration.
     */
    public constructor(
        @Inject(SETTINGS_SERVICE_CONFIG_TOKEN)
        config: ISettingsServiceConfig,
    ) {
        this.settingsFilePath = config.data.settingsFilePath
        this.resourcePaths = buildResourcePaths(config.data.defaultsDir, config.data.settingsFilePath)
    }

    /**
     * Returns full settings snapshot.
     *
     * @returns Settings snapshot.
     */
    public async getAll(): Promise<ISettingsSnapshot> {
        const cache = await this.loadSettingsCache()
        return cache.snapshot
    }

    /**
     * Returns setting item by key.
     *
     * @param key Setting key.
     * @returns Setting item when found.
     */
    public async getByKey(key: string): Promise<ISettingItem | undefined> {
        const cache = await this.loadSettingsCache()
        return cache.lookup.get(key)
    }

    /**
     * Returns all supported config resources.
     *
     * @returns Resource list.
     */
    public getConfigResources(): readonly ConfigResource[] {
        return CONFIG_RESOURCE_LIST
    }

    /**
     * Checks whether config resource is supported.
     *
     * @param resource Resource key.
     * @returns True when resource is supported.
     */
    public isConfigResource(resource: string): resource is ConfigResource {
        return CONFIG_RESOURCE_LIST.includes(resource as ConfigResource)
    }

    /**
     * Returns config payload by resource key.
     *
     * @param resource Resource key.
     * @returns Config payload.
     */
    public async getConfigResource(resource: ConfigResource): Promise<unknown> {
        if (resource === "settings") {
            return this.getAll()
        }

        const cache = await this.loadConfigCache(resource)
        return cache.payload
    }

    private async loadSettingsCache(): Promise<ISettingsCache> {
        const file = Bun.file(this.settingsFilePath)
        const exists = await file.exists()
        if (!exists) {
            throw new Error(`Settings file not found: ${this.settingsFilePath}`)
        }

        const lastModified = file.lastModified

        if (this.settingsCache !== undefined && this.settingsCache.lastModified === lastModified) {
            return this.settingsCache
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

        this.settingsCache = cache
        return cache
    }

    private async loadConfigCache(resource: ConfigResource): Promise<IConfigCache> {
        const filePath = this.resourcePaths.get(resource)
        if (filePath === undefined) {
            throw new Error(`Unknown config resource: ${resource}`)
        }

        const file = Bun.file(filePath)
        const exists = await file.exists()
        if (!exists) {
            throw new Error(`Config resource file not found: ${filePath}`)
        }

        const lastModified = file.lastModified
        const existing = this.configCache.get(resource)

        if (existing !== undefined && existing.lastModified === lastModified) {
            return existing
        }

        const payload: unknown = await file.json()
        const cache: IConfigCache = {
            payload,
            lastModified,
        }

        this.configCache.set(resource, cache)
        return cache
    }
}

/**
 * Builds resource file path map from defaults directory.
 *
 * @param defaultsDir Defaults directory.
 * @param settingsFilePath Settings file path.
 * @returns Resource path map.
 */
function buildResourcePaths(
    defaultsDir: string,
    settingsFilePath: string,
): ReadonlyMap<ConfigResource, string> {
    const paths = new Map<ConfigResource, string>()

    for (const resource of CONFIG_RESOURCE_LIST) {
        if (resource === "settings") {
            paths.set(resource, settingsFilePath)
            continue
        }

        const fileName = CONFIG_RESOURCES[resource]
        paths.set(resource, `${defaultsDir}/${fileName}`)
    }

    return paths
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
