import { describe, expect, it } from "vitest"

import { FEATURE_FLAG_KEYS, type IFeatureFlagsResponse } from "@/lib/feature-flags/feature-flags"
import {
    isFeatureFlagEnabled,
    type IFeatureFlagQueryState,
} from "@/lib/hooks/queries/use-feature-flags-query"

/**
 * Создаёт query-state для тестирования feature flag guard.
 *
 * @param overrides Частичное переопределение стандартного state.
 * @returns Полный query-state объект.
 */
function createQueryState(overrides: Partial<IFeatureFlagQueryState> = {}): IFeatureFlagQueryState {
    return {
        data: undefined,
        error: null,
        isPending: false,
        ...overrides,
    }
}

/**
 * Создаёт ответ feature flags endpoint для тестов.
 *
 * @param premiumDashboardValue Значение premium dashboard флага.
 * @returns Объект ответа backend.
 */
function createFlagsResponse(premiumDashboardValue: boolean): IFeatureFlagsResponse {
    return {
        flags: {
            premium_dashboard: premiumDashboardValue,
        },
    }
}

describe("isFeatureFlagEnabled", (): void => {
    it("возвращает true при включённом premium флаге", (): void => {
        const isEnabled = isFeatureFlagEnabled(
            createQueryState({
                data: createFlagsResponse(true),
            }),
            FEATURE_FLAG_KEYS.premiumDashboard,
        )

        expect(isEnabled).toBe(true)
    })

    it("возвращает false при выключенном premium флаге", (): void => {
        const isEnabled = isFeatureFlagEnabled(
            createQueryState({
                data: createFlagsResponse(false),
            }),
            FEATURE_FLAG_KEYS.premiumDashboard,
        )

        expect(isEnabled).toBe(false)
    })

    it("возвращает false в pending состоянии (deny-by-default)", (): void => {
        const isEnabled = isFeatureFlagEnabled(
            createQueryState({
                isPending: true,
                data: createFlagsResponse(true),
            }),
            FEATURE_FLAG_KEYS.premiumDashboard,
        )

        expect(isEnabled).toBe(false)
    })

    it("возвращает false когда данные флагов отсутствуют", (): void => {
        const isEnabled = isFeatureFlagEnabled(
            createQueryState({
                data: undefined,
            }),
            FEATURE_FLAG_KEYS.premiumDashboard,
        )

        expect(isEnabled).toBe(false)
    })

    it("возвращает false при ошибке backend даже если флаг был true", (): void => {
        const isEnabled = isFeatureFlagEnabled(
            createQueryState({
                data: createFlagsResponse(true),
                error: new Error("feature flags unavailable"),
            }),
            FEATURE_FLAG_KEYS.premiumDashboard,
        )

        expect(isEnabled).toBe(false)
    })
})
