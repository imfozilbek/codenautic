import { describe, expect, it } from "vitest"

import {
    isProviderDegradationDetail,
    type IProviderDegradationEventDetail,
} from "@/lib/providers/degradation-mode"

describe("isProviderDegradationDetail", (): void => {
    const validDetail: IProviderDegradationEventDetail = {
        provider: "git",
        level: "degraded",
        eta: "15 minutes",
        affectedFeatures: ["code-review", "diff-view"],
        runbookUrl: "https://docs.example.com/runbook/git",
    }

    it("when payload is a valid detail object, then returns true", (): void => {
        expect(isProviderDegradationDetail(validDetail)).toBe(true)
    })

    it("when provider is 'llm', then returns true", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, provider: "llm" })).toBe(true)
    })

    it("when provider is 'context', then returns true", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, provider: "context" })).toBe(true)
    })

    it("when provider is 'notifications', then returns true", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, provider: "notifications" })).toBe(
            true,
        )
    })

    it("when level is 'operational', then returns true", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, level: "operational" })).toBe(true)
    })

    it("when value is null, then returns false", (): void => {
        expect(isProviderDegradationDetail(null)).toBe(false)
    })

    it("when value is a string, then returns false", (): void => {
        expect(isProviderDegradationDetail("not-an-object")).toBe(false)
    })

    it("when provider is invalid, then returns false", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, provider: "unknown" })).toBe(false)
    })

    it("when level is invalid, then returns false", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, level: "broken" })).toBe(false)
    })

    it("when eta is not a string, then returns false", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, eta: 15 })).toBe(false)
    })

    it("when runbookUrl is not a string, then returns false", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, runbookUrl: 123 })).toBe(false)
    })

    it("when affectedFeatures contains non-string items, then returns false", (): void => {
        expect(
            isProviderDegradationDetail({ ...validDetail, affectedFeatures: [123, "feature"] }),
        ).toBe(false)
    })

    it("when affectedFeatures is not an array, then returns false", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, affectedFeatures: "feature" })).toBe(
            false,
        )
    })

    it("when affectedFeatures is empty array, then returns true", (): void => {
        expect(isProviderDegradationDetail({ ...validDetail, affectedFeatures: [] })).toBe(true)
    })
})
