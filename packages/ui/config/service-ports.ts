import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { z } from "zod"

const SERVICE_PORT_REGISTRY_RELATIVE_PATH = path.join("config", "service-ports.json")

const FALLBACK_UI_SERVICE_PORTS = {
    ui: 7110,
    api: 7120,
    uiPreview: 7220,
} as const

const uiServicePortsSchema = z.object({
    services: z.object({
        ui: z.number().int().min(1).max(65535),
        api: z.number().int().min(1).max(65535),
        uiPreview: z.number().int().min(1).max(65535),
    }),
})

/**
 * Централизованные UI-порты, загруженные из корневого service port registry.
 */
export interface IUiServicePorts {
    readonly ui: number
    readonly api: number
    readonly uiPreview: number
}

/**
 * Загружает UI-порты из корневого `config/service-ports.json`.
 *
 * @param startDirectory Директория, откуда искать корневой реестр.
 * @returns Нормализованный набор UI-портов.
 */
export function loadUiServicePorts(startDirectory = process.cwd()): IUiServicePorts {
    const registryPath = resolveServicePortRegistryPath(startDirectory)

    if (registryPath === undefined) {
        return FALLBACK_UI_SERVICE_PORTS
    }

    try {
        const rawRegistry = readFileSync(registryPath, "utf8")
        const parsedRegistry = uiServicePortsSchema.parse(JSON.parse(rawRegistry))

        return {
            ui: parsedRegistry.services.ui,
            api: parsedRegistry.services.api,
            uiPreview: parsedRegistry.services.uiPreview,
        }
    } catch {
        return FALLBACK_UI_SERVICE_PORTS
    }
}

/**
 * Ищет `config/service-ports.json` вверх по дереву директорий.
 *
 * @param startDirectory Стартовая директория поиска.
 * @returns Абсолютный путь к реестру или `undefined`, если файл не найден.
 */
function resolveServicePortRegistryPath(startDirectory: string): string | undefined {
    let currentDirectory = path.resolve(startDirectory)

    while (true) {
        const candidatePath = path.join(currentDirectory, SERVICE_PORT_REGISTRY_RELATIVE_PATH)

        if (existsSync(candidatePath)) {
            return candidatePath
        }

        const parentDirectory = path.dirname(currentDirectory)
        if (parentDirectory === currentDirectory) {
            return undefined
        }

        currentDirectory = parentDirectory
    }
}
