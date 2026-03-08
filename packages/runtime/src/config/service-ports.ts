import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { z } from "zod"

const SERVICE_PORT_REGISTRY_RELATIVE_PATH = path.join("config", "service-ports.json")

const FALLBACK_RUNTIME_SERVICE_PORTS = {
    api: 7120,
    settingsService: 7130,
    webhooks: 7140,
    mcpSse: 7210,
} as const

const runtimeServicePortsSchema = z.object({
    services: z.object({
        api: z.number().int().min(1).max(65535),
        settingsService: z.number().int().min(1).max(65535),
        webhooks: z.number().int().min(1).max(65535),
        mcpSse: z.number().int().min(1).max(65535),
    }),
})

/**
 * Сетевые порты runtime-сервисов, централизованно определённые в корневом реестре.
 */
export interface IRuntimeServicePorts {
    readonly api: number
    readonly settingsService: number
    readonly webhooks: number
    readonly mcpSse: number
}

/**
 * Возвращает дефолтный API-порт из централизованного service port registry.
 *
 * @param startDirectory Директория, откуда искать корневой конфиг.
 * @returns Порт runtime/api.
 */
export function resolveDefaultApiPort(startDirectory = process.cwd()): number {
    return loadRuntimeServicePorts(startDirectory).api
}

/**
 * Загружает runtime-порты из корневого `config/service-ports.json`.
 *
 * @param startDirectory Директория, откуда искать корень репозитория.
 * @returns Нормализованный набор runtime-портов.
 */
export function loadRuntimeServicePorts(startDirectory = process.cwd()): IRuntimeServicePorts {
    const registryPath = resolveServicePortRegistryPath(startDirectory)

    if (registryPath === undefined) {
        return FALLBACK_RUNTIME_SERVICE_PORTS
    }

    try {
        const rawRegistry = readFileSync(registryPath, "utf8")
        const parsedRegistry = runtimeServicePortsSchema.parse(JSON.parse(rawRegistry))

        return {
            api: parsedRegistry.services.api,
            settingsService: parsedRegistry.services.settingsService,
            webhooks: parsedRegistry.services.webhooks,
            mcpSse: parsedRegistry.services.mcpSse,
        }
    } catch {
        return FALLBACK_RUNTIME_SERVICE_PORTS
    }
}

/**
 * Ищет `config/service-ports.json` вверх по дереву директорий.
 *
 * @param startDirectory Стартовая директория.
 * @returns Абсолютный путь к реестру или `undefined`, если файл не найден.
 */
function resolveServicePortRegistryPath(startDirectory: string): string | undefined {
    return resolveServicePortRegistryPathFromDirectory(path.resolve(startDirectory))
}

/**
 * Рекурсивно поднимается по дереву директорий в поиске service port registry.
 *
 * @param currentDirectory Текущая директория поиска.
 * @returns Абсолютный путь к реестру или `undefined`.
 */
function resolveServicePortRegistryPathFromDirectory(currentDirectory: string): string | undefined {
    const candidatePath = path.join(currentDirectory, SERVICE_PORT_REGISTRY_RELATIVE_PATH)

    if (existsSync(candidatePath)) {
        return candidatePath
    }

    const parentDirectory = path.dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
        return undefined
    }

    return resolveServicePortRegistryPathFromDirectory(parentDirectory)
}
