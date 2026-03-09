import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useOrganizationSwitcher } from "@/lib/hooks/use-organization-switcher"
import { TENANT_STORAGE_KEY } from "@/lib/sync/multi-tab-consistency"

describe("useOrganizationSwitcher", (): void => {
    beforeEach((): void => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })

    afterEach((): void => {
        window.localStorage.clear()
        window.sessionStorage.clear()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it("when rendered with no stored value, then uses default organization", (): void => {
        const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
            return useOrganizationSwitcher()
        })

        expect(result.current.activeOrganizationId).toBe("platform-team")
    })

    it("when localStorage has stored tenantId, then initializes with stored value", (): void => {
        window.localStorage.setItem(TENANT_STORAGE_KEY, "frontend-team")

        const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
            return useOrganizationSwitcher()
        })

        expect(result.current.activeOrganizationId).toBe("frontend-team")
    })

    it("when localStorage has invalid tenantId, then falls back to default", (): void => {
        window.localStorage.setItem(TENANT_STORAGE_KEY, "invalid-org")

        const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
            return useOrganizationSwitcher()
        })

        expect(result.current.activeOrganizationId).toBe("platform-team")
    })

    it("when rendered, then returns list of organizations", (): void => {
        const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
            return useOrganizationSwitcher()
        })

        expect(result.current.organizations).toHaveLength(3)
        expect(result.current.organizations[0]?.id).toBe("platform-team")
        expect(result.current.organizations[1]?.id).toBe("frontend-team")
        expect(result.current.organizations[2]?.id).toBe("runtime-team")
    })

    describe("handleOrganizationChange", (): void => {
        it("when switching to valid organization and confirmed, then updates activeOrganizationId", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("frontend-team")
            })

            expect(result.current.activeOrganizationId).toBe("frontend-team")
        })

        it("when switching to same organization, then does nothing", (): void => {
            const confirmSpy = vi.fn((): boolean => true)
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: confirmSpy,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("platform-team")
            })

            expect(confirmSpy).not.toHaveBeenCalled()
        })

        it("when switching to invalid tenantId, then does nothing", (): void => {
            const confirmSpy = vi.fn((): boolean => true)
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: confirmSpy,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("invalid-org")
            })

            expect(result.current.activeOrganizationId).toBe("platform-team")
            expect(confirmSpy).not.toHaveBeenCalled()
        })

        it("when user cancels confirmation, then does not switch", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => false,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("frontend-team")
            })

            expect(result.current.activeOrganizationId).toBe("platform-team")
        })

        it("when switching, then updates localStorage with new tenantId", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("runtime-team")
            })

            expect(window.localStorage.getItem(TENANT_STORAGE_KEY)).toBe("runtime-team")
        })

        it("when switching, then clears tenant-scoped storage keys", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            window.localStorage.setItem("codenautic:tenant:filters", "some-value")
            window.localStorage.setItem("codenautic:tenant:draft", "draft-value")
            window.localStorage.setItem("unrelated-key", "keep-this")

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("frontend-team")
            })

            expect(window.localStorage.getItem("codenautic:tenant:filters")).toBeNull()
            expect(window.localStorage.getItem("codenautic:tenant:draft")).toBeNull()
            expect(window.localStorage.getItem("unrelated-key")).toBe("keep-this")
        })

        it("when switching, then dispatches tenant-switched custom event", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            const dispatchSpy = vi.spyOn(window, "dispatchEvent")

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("runtime-team")
            })

            const switchedEvent = dispatchSpy.mock.calls.find((call): boolean => {
                const evt = call[0] as CustomEvent<unknown>
                return evt.type === "codenautic:tenant-switched"
            })
            expect(switchedEvent).toBeDefined()
        })

        it("when switching and BroadcastChannel available, then posts sync message", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            const postMessageSpy = vi.fn()
            const closeSpy = vi.fn()

            vi.stubGlobal(
                "BroadcastChannel",
                class MockBroadcastChannel {
                    public postMessage(data: unknown): void {
                        postMessageSpy(data)
                    }

                    public close(): void {
                        closeSpy()
                    }
                },
            )

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("frontend-team")
            })

            expect(postMessageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "tenant",
                    tenantId: "frontend-team",
                }),
            )
            expect(closeSpy).toHaveBeenCalled()
        })

        it("when organizationId is not in options list, then does not switch", (): void => {
            Object.defineProperty(window, "confirm", {
                configurable: true,
                writable: true,
                value: (): boolean => true,
            })

            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.handleOrganizationChange("platform-team")
            })

            expect(result.current.activeOrganizationId).toBe("platform-team")
        })
    })

    describe("setActiveOrganizationId", (): void => {
        it("when called directly, then updates activeOrganizationId", (): void => {
            const { result } = renderHook((): ReturnType<typeof useOrganizationSwitcher> => {
                return useOrganizationSwitcher()
            })

            act((): void => {
                result.current.setActiveOrganizationId("runtime-team")
            })

            expect(result.current.activeOrganizationId).toBe("runtime-team")
        })
    })
})
