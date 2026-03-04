export const PROVIDER_DEGRADATION_EVENT = "codenautic:provider-degradation"

export type TDegradedProvider = "context" | "git" | "llm" | "notifications"
export type TDegradationLevel = "degraded" | "operational"

export interface IProviderDegradationEventDetail {
    /** Затронутый внешний провайдер. */
    readonly provider: TDegradedProvider
    /** Текущий уровень инцидента. */
    readonly level: TDegradationLevel
    /** Ожидаемое время восстановления. */
    readonly eta: string
    /** Затронутые функции UI. */
    readonly affectedFeatures: ReadonlyArray<string>
    /** Ссылка на runbook/incidents. */
    readonly runbookUrl: string
}

/**
 * Проверка payload события provider degradation.
 *
 * @param value Любой value из CustomEvent.detail.
 * @returns true если payload валиден.
 */
export function isProviderDegradationDetail(value: unknown): value is IProviderDegradationEventDetail {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const candidate = value as {
        readonly provider?: unknown
        readonly level?: unknown
        readonly eta?: unknown
        readonly affectedFeatures?: unknown
        readonly runbookUrl?: unknown
    }

    const isProvider =
        candidate.provider === "git"
        || candidate.provider === "llm"
        || candidate.provider === "context"
        || candidate.provider === "notifications"
    const isLevel = candidate.level === "operational" || candidate.level === "degraded"
    const hasEta = typeof candidate.eta === "string"
    const hasRunbook = typeof candidate.runbookUrl === "string"
    const hasFeatures =
        Array.isArray(candidate.affectedFeatures)
        && candidate.affectedFeatures.every((item): boolean => typeof item === "string")

    return isProvider && isLevel && hasEta && hasRunbook && hasFeatures
}
