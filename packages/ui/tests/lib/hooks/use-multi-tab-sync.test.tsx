import { act, renderHook } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createQueryClient } from "@/lib/query/query-client"
import { useMultiTabSync } from "@/lib/hooks/use-multi-tab-sync"
import {
    TENANT_STORAGE_KEY,
    THEME_MODE_STORAGE_KEY,
    THEME_PRESET_STORAGE_KEY,
} from "@/lib/sync/multi-tab-consistency"

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
 * Мокирует BroadcastChannel с контролем отправки сообщений.
 *
 * @returns Объект с методом для отправки сообщений.
 */
function mockBroadcastChannel(): {
    postMessage: (data: unknown) => void
    closed: { value: boolean }
} {
    const listeners: Array<(event: MessageEvent<unknown>) => void> = []
    const closedRef = { value: false }

    vi.stubGlobal(
        "BroadcastChannel",
        class MockBroadcastChannel {
            public addEventListener(
                _type: string,
                listener: (event: MessageEvent<unknown>) => void,
            ): void {
                listeners.push(listener)
            }

            public removeEventListener(
                _type: string,
                listener: (event: MessageEvent<unknown>) => void,
            ): void {
                const index = listeners.indexOf(listener)
                if (index !== -1) {
                    listeners.splice(index, 1)
                }
            }

            public close(): void {
                closedRef.value = true
            }
        },
    )

    return {
        postMessage: (data: unknown): void => {
            for (const listener of [...listeners]) {
                listener(new MessageEvent("message", { data }))
            }
        },
        closed: closedRef,
    }
}

describe("useMultiTabSync", (): void => {
    beforeEach((): void => {
        window.localStorage.clear()
    })

    afterEach((): void => {
        window.localStorage.clear()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    describe("BroadcastChannel", (): void => {
        it("when receives tenant message with different tenantId, then updates tenant", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "tenant", tenantId: "frontend-team" })
            })

            expect(setActiveOrganizationId).toHaveBeenCalledWith("frontend-team")
            expect(result.current.multiTabNotice).toContain("frontend-team")
        })

        it("when receives tenant message with same tenantId, then does not update", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "tenant", tenantId: "platform-team" })
            })

            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })

        it("when receives tenant message with invalid tenantId, then ignores", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "tenant", tenantId: "invalid-team" })
            })

            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })

        it("when receives permissions message, then invalidates queries and shows notice", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "permissions", role: "admin" })
            })

            expect(result.current.multiTabNotice).toContain("admin")
        })

        it("when receives permissions message, then shows permissions notice", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "permissions", role: "developer" })
            })

            expect(result.current.multiTabNotice).toContain("Permissions updated")
        })

        it("when receives theme message, then shows theme notice", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "theme" })
            })

            expect(result.current.multiTabNotice).toContain("Theme updated")
        })

        it("when receives invalid payload, then ignores", (): void => {
            const mock = mockBroadcastChannel()
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                mock.postMessage({ type: "unknown" })
            })

            expect(result.current.multiTabNotice).toBeUndefined()
            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })
    })

    describe("StorageEvent", (): void => {
        it("when tenant storage changes to valid different tenantId, then updates", (): void => {
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: TENANT_STORAGE_KEY,
                        newValue: "runtime-team",
                    }),
                )
            })

            expect(setActiveOrganizationId).toHaveBeenCalledWith("runtime-team")
            expect(result.current.multiTabNotice).toContain("runtime-team")
        })

        it("when tenant storage changes to same tenantId, then does not update", (): void => {
            const setActiveOrganizationId = vi.fn()

            renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: TENANT_STORAGE_KEY,
                        newValue: "platform-team",
                    }),
                )
            })

            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })

        it("when tenant storage changes to invalid value, then ignores", (): void => {
            const setActiveOrganizationId = vi.fn()

            renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: TENANT_STORAGE_KEY,
                        newValue: "invalid-team",
                    }),
                )
            })

            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })

        it("when tenant storage changes to null, then ignores", (): void => {
            const setActiveOrganizationId = vi.fn()

            renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: TENANT_STORAGE_KEY,
                        newValue: null,
                    }),
                )
            })

            expect(setActiveOrganizationId).not.toHaveBeenCalled()
        })

        it("when theme mode storage changes, then shows theme notice", (): void => {
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: THEME_MODE_STORAGE_KEY,
                        newValue: "dark",
                    }),
                )
            })

            expect(result.current.multiTabNotice).toContain("Theme synchronized")
        })

        it("when theme preset storage changes, then shows theme notice", (): void => {
            const setActiveOrganizationId = vi.fn()

            const { result } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            act((): void => {
                window.dispatchEvent(
                    new StorageEvent("storage", {
                        key: THEME_PRESET_STORAGE_KEY,
                        newValue: "ocean",
                    }),
                )
            })

            expect(result.current.multiTabNotice).toContain("Theme synchronized")
        })
    })

    describe("cleanup", (): void => {
        it("when unmounts, then closes channel and removes listeners", (): void => {
            const mock = mockBroadcastChannel()
            const removeWindowSpy = vi.spyOn(window, "removeEventListener")
            const setActiveOrganizationId = vi.fn()

            const { unmount } = renderHook(
                (): ReturnType<typeof useMultiTabSync> => {
                    return useMultiTabSync("platform-team", setActiveOrganizationId)
                },
                { wrapper: createWrapper() },
            )

            unmount()

            expect(mock.closed.value).toBe(true)

            const storageRemoved = removeWindowSpy.mock.calls.some(
                (call): boolean => call[0] === "storage",
            )
            expect(storageRemoved).toBe(true)
        })
    })
})
