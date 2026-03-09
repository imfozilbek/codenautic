import { act, renderHook } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createQueryClient } from "@/lib/query/query-client"
import { usePolicyDrift } from "@/lib/hooks/use-policy-drift"
import {
    POLICY_DRIFT_EVENT_NAME,
    type IPolicyDriftEventDetail,
} from "@/lib/permissions/policy-drift"

/**
 * Обёртка с QueryClient для рендера хуков.
 *
 * @returns Provider wrapper function.
 */
function createWrapper(): (props: { children: ReactNode }) => ReactElement {
    const queryClient = createQueryClient()

    return function Wrapper(props: { children: ReactNode }): ReactElement {
        return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    }
}

/**
 * Диспатчит custom event policy drift.
 *
 * @param detail Payload события.
 */
function dispatchPolicyDrift(detail: IPolicyDriftEventDetail): void {
    window.dispatchEvent(new CustomEvent(POLICY_DRIFT_EVENT_NAME, { detail }))
}

describe("usePolicyDrift", (): void => {
    beforeEach((): void => {
        window.localStorage.clear()
    })

    afterEach((): void => {
        window.localStorage.clear()
        vi.restoreAllMocks()
    })

    it("when rendered initially, then policyDriftNotice is undefined", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.policyDriftNotice).toBeUndefined()
    })

    it("when rendered initially, then activeRoleId matches persisted role", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        expect(result.current.activeRoleId).toBeDefined()
    })

    it("when policy drift event fires with valid detail, then updates activeRoleId", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            dispatchPolicyDrift({
                nextRole: "lead",
                reason: "Plan upgrade detected",
            })
        })

        expect(result.current.activeRoleId).toBe("lead")
    })

    it("when policy drift event fires, then sets policyDriftNotice", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            dispatchPolicyDrift({
                nextRole: "developer",
                reason: "Entitlement change",
            })
        })

        expect(result.current.policyDriftNotice).toContain("developer")
        expect(result.current.policyDriftNotice).toContain("Entitlement change")
    })

    it("when policy drift event has invalid detail, then does not update", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            window.dispatchEvent(
                new CustomEvent(POLICY_DRIFT_EVENT_NAME, {
                    detail: { nextRole: "invalid-role", reason: "test" },
                }),
            )
        })

        expect(result.current.policyDriftNotice).toBeUndefined()
    })

    it("when policy drift event has null detail, then does not update", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            window.dispatchEvent(
                new CustomEvent(POLICY_DRIFT_EVENT_NAME, {
                    detail: null,
                }),
            )
        })

        expect(result.current.policyDriftNotice).toBeUndefined()
    })

    it("when multiple drift events fire, then uses latest role", (): void => {
        const { result } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        act((): void => {
            dispatchPolicyDrift({
                nextRole: "lead",
                reason: "First change",
            })
        })

        act((): void => {
            dispatchPolicyDrift({
                nextRole: "viewer",
                reason: "Downgrade",
            })
        })

        expect(result.current.activeRoleId).toBe("viewer")
        expect(result.current.policyDriftNotice).toContain("viewer")
        expect(result.current.policyDriftNotice).toContain("Downgrade")
    })

    it("when unmounted, then removes event listener", (): void => {
        const removeSpy = vi.spyOn(window, "removeEventListener")

        const { unmount } = renderHook(
            (): ReturnType<typeof usePolicyDrift> => {
                return usePolicyDrift()
            },
            { wrapper: createWrapper() },
        )

        unmount()

        const driftRemoved = removeSpy.mock.calls.some(
            (call): boolean => call[0] === POLICY_DRIFT_EVENT_NAME,
        )
        expect(driftRemoved).toBe(true)
    })
})
