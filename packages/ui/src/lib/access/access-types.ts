/**
 * Поддерживаемые роли пользовательского интерфейса.
 */
export type TUiRole = "admin" | "developer" | "lead" | "viewer"

/**
 * Поддерживаемые workspace/tenant идентификаторы.
 */
export type TTenantId = "frontend-team" | "platform-team" | "runtime-team"

/**
 * Приоритет ролей от младшей к старшей.
 */
export const UI_ROLE_PRIORITY: ReadonlyArray<TUiRole> = ["viewer", "developer", "lead", "admin"]

/**
 * Проверяет, что значение является валидной UI-ролью.
 *
 * @param value Неизвестное значение.
 * @returns true, если значение совпадает с поддерживаемой ролью.
 */
export function isUiRole(value: unknown): value is TUiRole {
    return value === "viewer" || value === "developer" || value === "lead" || value === "admin"
}

/**
 * Проверяет, что значение является валидным tenant id.
 *
 * @param value Неизвестное значение.
 * @returns true, если значение совпадает с поддерживаемым tenant id.
 */
export function isTenantId(value: unknown): value is TTenantId {
    return value === "platform-team" || value === "frontend-team" || value === "runtime-team"
}
