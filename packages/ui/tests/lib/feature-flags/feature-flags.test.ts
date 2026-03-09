import { describe, expect, it } from "vitest"

import {
    FEATURE_FLAG_KEYS,
    resolveFeatureFlag,
    type TFeatureFlagsMap,
} from "@/lib/feature-flags/feature-flags"

describe("resolveFeatureFlag", (): void => {
    it("when flags map is undefined, then returns false", (): void => {
        const result = resolveFeatureFlag(undefined, FEATURE_FLAG_KEYS.premiumDashboard)

        expect(result).toBe(false)
    })

    it("when flag is explicitly enabled, then returns true", (): void => {
        const flags: TFeatureFlagsMap = {
            [FEATURE_FLAG_KEYS.premiumDashboard]: true,
        }

        const result = resolveFeatureFlag(flags, FEATURE_FLAG_KEYS.premiumDashboard)

        expect(result).toBe(true)
    })

    it("when flag is explicitly disabled, then returns false", (): void => {
        const flags: TFeatureFlagsMap = {
            [FEATURE_FLAG_KEYS.premiumDashboard]: false,
        }

        const result = resolveFeatureFlag(flags, FEATURE_FLAG_KEYS.premiumDashboard)

        expect(result).toBe(false)
    })

    it("when flag key is missing from map, then returns false", (): void => {
        const flags: TFeatureFlagsMap = {}

        const result = resolveFeatureFlag(flags, FEATURE_FLAG_KEYS.premiumDashboard)

        expect(result).toBe(false)
    })

    it("when flags map has other keys but not the requested one, then returns false", (): void => {
        const flags: TFeatureFlagsMap = {
            some_other_flag: true,
        }

        const result = resolveFeatureFlag(flags, FEATURE_FLAG_KEYS.premiumDashboard)

        expect(result).toBe(false)
    })
})
