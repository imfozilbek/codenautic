/**
 * Известные feature flag keys для UI-фич.
 */
export const FEATURE_FLAG_KEYS = {
    premiumDashboard: "premium_dashboard",
} as const

export type TFeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS]

/**
 * Словарь feature flags, приходящий с backend.
 */
export type TFeatureFlagsMap = Readonly<Record<string, boolean>>

/**
 * Ответ endpoint-а feature flags.
 */
export interface IFeatureFlagsResponse {
    readonly flags: TFeatureFlagsMap
}

/**
 * Возвращает состояние feature flag по ключу (deny-by-default).
 *
 * @param flags Текущая карта feature flags.
 * @param key Ключ feature flag.
 * @returns true только если флаг явно включен.
 */
export function resolveFeatureFlag(
    flags: TFeatureFlagsMap | undefined,
    key: TFeatureFlagKey,
): boolean {
    if (flags === undefined) {
        return false
    }

    return flags[key] === true
}
