import type { components, operations } from "./generated"

/**
 * Статус системной доступности runtime/api.
 */
export type THealthStatus = components["schemas"]["HealthStatus"]

/**
 * Ответ health endpoint runtime/api.
 */
export type TSystemHealthResponse =
    operations["getSystemHealth"]["responses"][200]["content"]["application/json"]
