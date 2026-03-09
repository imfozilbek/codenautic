import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useProviderDegradation } from "@/lib/hooks/use-provider-degradation"
import {
    PROVIDER_DEGRADATION_EVENT,
    type IProviderDegradationEventDetail,
} from "@/lib/providers/degradation-mode"

/**
 * Создаёт и диспатчит событие деградации провайдера.
 *
 * @param detail Payload события.
 */
function dispatchDegradation(detail: IProviderDegradationEventDetail): void {
    window.dispatchEvent(new CustomEvent(PROVIDER_DEGRADATION_EVENT, { detail }))
}

/**
 * Создаёт полный degradation detail.
 *
 * @param overrides Частичные поля для переопределения.
 * @returns Полный detail объект.
 */
function createDegradationDetail(
    overrides: Partial<IProviderDegradationEventDetail> = {},
): IProviderDegradationEventDetail {
    return {
        affectedFeatures: ["code-review"],
        eta: "15 minutes",
        level: "degraded",
        provider: "llm",
        runbookUrl: "https://runbook.example.com/llm-degraded",
        ...overrides,
    }
}

describe("useProviderDegradation", (): void => {
    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when rendered initially, then providerDegradation is undefined", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        expect(result.current.providerDegradation).toBeUndefined()
    })

    it("when degraded event fires, then sets providerDegradation", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        const detail = createDegradationDetail({
            provider: "git",
            level: "degraded",
            eta: "5 minutes",
            affectedFeatures: ["webhooks", "diff-fetching"],
        })

        act((): void => {
            dispatchDegradation(detail)
        })

        expect(result.current.providerDegradation).toEqual(detail)
    })

    it("when operational event fires after degradation, then clears providerDegradation", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        act((): void => {
            dispatchDegradation(createDegradationDetail({ level: "degraded" }))
        })

        expect(result.current.providerDegradation).not.toBeUndefined()

        act((): void => {
            dispatchDegradation(createDegradationDetail({ level: "operational" }))
        })

        expect(result.current.providerDegradation).toBeUndefined()
    })

    it("when event has invalid detail, then does not update state", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        act((): void => {
            window.dispatchEvent(
                new CustomEvent(PROVIDER_DEGRADATION_EVENT, {
                    detail: { invalid: true },
                }),
            )
        })

        expect(result.current.providerDegradation).toBeUndefined()
    })

    it("when event has null detail, then does not update state", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        act((): void => {
            window.dispatchEvent(
                new CustomEvent(PROVIDER_DEGRADATION_EVENT, {
                    detail: null,
                }),
            )
        })

        expect(result.current.providerDegradation).toBeUndefined()
    })

    it("when multiple degradation events fire, then keeps latest state", (): void => {
        const { result } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        act((): void => {
            dispatchDegradation(
                createDegradationDetail({
                    provider: "llm",
                    eta: "10 minutes",
                }),
            )
        })

        act((): void => {
            dispatchDegradation(
                createDegradationDetail({
                    provider: "context",
                    eta: "30 minutes",
                    affectedFeatures: ["jira-integration"],
                }),
            )
        })

        expect(result.current.providerDegradation?.provider).toBe("context")
        expect(result.current.providerDegradation?.eta).toBe("30 minutes")
    })

    it("when unmounted, then removes event listener", (): void => {
        const removeSpy = vi.spyOn(window, "removeEventListener")

        const { unmount } = renderHook((): ReturnType<typeof useProviderDegradation> => {
            return useProviderDegradation()
        })

        unmount()

        const degradationRemoved = removeSpy.mock.calls.some(
            (call): boolean => call[0] === PROVIDER_DEGRADATION_EVENT,
        )
        expect(degradationRemoved).toBe(true)
    })
})
