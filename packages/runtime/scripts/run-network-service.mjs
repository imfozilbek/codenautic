import { spawn } from "node:child_process"
import { argv, env, exit, kill, pid } from "node:process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { loadRuntimeServicePorts } from "../src/config/service-ports.ts"

const SERVICE_ENV_KEY = {
    api: "API_PORT",
    "settings-service": "SETTINGS_SERVICE_PORT",
    webhooks: "WEBHOOKS_PORT",
    mcp: "MCP_SSE_PORT",
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const packageDirectory = path.resolve(currentDirectory, "..")
const [serviceName, ...bunArguments] = argv.slice(2)

if (serviceName === undefined || serviceName.length === 0) {
    throw new Error("Не указан runtime service name для run-network-service.mjs")
}

const envKey = SERVICE_ENV_KEY[serviceName]

if (envKey === undefined) {
    throw new Error(`Неподдерживаемый runtime service: ${serviceName}`)
}

const servicePorts = loadRuntimeServicePorts(packageDirectory)
const servicePort = resolveServicePort(servicePorts, serviceName)

const runtimeProcess = spawn("bun", bunArguments, {
    cwd: packageDirectory,
    stdio: "inherit",
    env: {
        ...env,
        [envKey]: env[envKey] ?? String(servicePort),
    },
})

runtimeProcess.on("error", (error) => {
    throw error
})

runtimeProcess.on("exit", (code, signal) => {
    if (signal !== null) {
        kill(pid, signal)
        return
    }

    exit(code ?? 1)
})

/**
 * Сопоставляет runtime service name с централизованным портом из реестра.
 *
 * @param {{api: number, settingsService: number, webhooks: number, mcpSse: number}} services Объект портов из корневого реестра.
 * @param {string} serviceName Имя запускаемого сервиса.
 * @returns {number} Централизованный порт сервиса.
 */
function resolveServicePort(services, serviceName) {
    switch (serviceName) {
        case "api":
            return services.api
        case "settings-service":
            return services.settingsService
        case "webhooks":
            return services.webhooks
        case "mcp":
            return services.mcpSse
        default:
            throw new Error(`Неподдерживаемый runtime service: ${serviceName}`)
    }
}
