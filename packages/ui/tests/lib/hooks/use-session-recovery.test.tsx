import { act, renderHook } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterContextProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createQueryClient } from "@/lib/query/query-client"
import { useSessionRecovery } from "@/lib/hooks/use-session-recovery"
import type { ISessionExpiredEventDetail } from "@/lib/session/session-recovery"
import { routeTree } from "@/routeTree.gen"

/**
 * Обёртка с необходимыми провайдерами для рендера хуков.
 *
 * @param props Children.
 * @returns Provider wrapper.
 */
function createWrapper(): (props: { children: ReactNode }) => ReactElement {
    const queryClient = createQueryClient()
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    })

    return function Wrapper(props: { children: ReactNode }): ReactElement {
        return (
            <RouterContextProvider router={router}>
                <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
            </RouterContextProvider>
        )
    }
}

/**
 * Диспатчит custom event session-expired.
 *
 * @param detail Детали события.
 */
function dispatchSessionExpired(detail: ISessionExpiredEventDetail): void {
    window.dispatchEvent(new CustomEvent("codenautic:session-expired", { detail }))
}

/**
 * Создаёт input event на элементе.
 *
 * @param element HTML-элемент.
 */
function fireInputEvent(element: HTMLElement): void {
    element.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("useSessionRecovery", (): void => {
    beforeEach((): void => {
        window.sessionStorage.clear()
    })

    afterEach((): void => {
        window.sessionStorage.clear()
        vi.restoreAllMocks()
    })

    describe("session-expired event", (): void => {
        it("when session-expired fires with code 401, then opens recovery modal", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            act((): void => {
                dispatchSessionExpired({ code: 401 })
            })

            expect(result.current.isSessionRecoveryOpen).toBe(true)
            expect(result.current.sessionFailureCode).toBe(401)
        })

        it("when session-expired fires with code 419, then sets failure code 419", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            act((): void => {
                dispatchSessionExpired({ code: 419 })
            })

            expect(result.current.isSessionRecoveryOpen).toBe(true)
            expect(result.current.sessionFailureCode).toBe(419)
        })

        it("when fires without pendingIntent, then uses current pathname", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            act((): void => {
                dispatchSessionExpired({ code: 401 })
            })

            const storedIntent = window.sessionStorage.getItem("codenautic:session:pending-intent")
            expect(storedIntent).toBe("/dashboard")
            expect(result.current.isSessionRecoveryOpen).toBe(true)
        })

        it("when fires with pendingIntent, then writes intent to sessionStorage", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            act((): void => {
                dispatchSessionExpired({ code: 401, pendingIntent: "/settings" })
            })

            const storedIntent = window.sessionStorage.getItem("codenautic:session:pending-intent")
            expect(storedIntent).toBe("/settings")
            expect(result.current.isSessionRecoveryOpen).toBe(true)
        })
    })

    describe("input autosave", (): void => {
        it("when user types into text input, then writes draft to sessionStorage", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const input = document.createElement("input")
            input.type = "text"
            input.id = "project-name"
            input.value = "CodeNautic"
            document.body.appendChild(input)

            act((): void => {
                fireInputEvent(input)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).not.toBeNull()
            const draft = JSON.parse(rawDraft as string) as Record<string, unknown>
            expect(draft.fieldKey).toBe("id:project-name")
            expect(draft.value).toBe("CodeNautic")

            document.body.removeChild(input)
        })

        it("when user types into textarea, then writes draft", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const textarea = document.createElement("textarea")
            textarea.id = "description"
            textarea.value = "Some description text"
            document.body.appendChild(textarea)

            act((): void => {
                fireInputEvent(textarea)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).not.toBeNull()
            const draft = JSON.parse(rawDraft as string) as Record<string, unknown>
            expect(draft.fieldKey).toBe("id:description")
            expect(draft.value).toBe("Some description text")

            document.body.removeChild(textarea)
        })

        it("when user types into email input, then writes draft", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const input = document.createElement("input")
            input.type = "email"
            input.id = "user-email"
            input.value = "dev@example.com"
            document.body.appendChild(input)

            act((): void => {
                fireInputEvent(input)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).not.toBeNull()
            const draft = JSON.parse(rawDraft as string) as Record<string, unknown>
            expect(draft.value).toBe("dev@example.com")

            document.body.removeChild(input)
        })

        it("when user types into checkbox, then does not autosave", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const input = document.createElement("input")
            input.type = "checkbox"
            input.id = "agree"
            input.checked = true
            document.body.appendChild(input)

            act((): void => {
                fireInputEvent(input)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).toBeNull()

            document.body.removeChild(input)
        })

        it("when input value is empty, then does not write draft", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const input = document.createElement("input")
            input.type = "text"
            input.id = "empty-field"
            input.value = "   "
            document.body.appendChild(input)

            act((): void => {
                fireInputEvent(input)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).toBeNull()

            document.body.removeChild(input)
        })

        it("when input has name, then fieldKey uses name: prefix", (): void => {
            renderHook(useSessionRecovery, { wrapper: createWrapper() })

            const input = document.createElement("input")
            input.type = "text"
            input.name = "username"
            input.value = "dev"
            document.body.appendChild(input)

            act((): void => {
                fireInputEvent(input)
            })

            const rawDraft = window.sessionStorage.getItem("codenautic:session:draft")
            expect(rawDraft).not.toBeNull()
            const draft = JSON.parse(rawDraft as string) as Record<string, unknown>
            expect(draft.fieldKey).toBe("name:username")

            document.body.removeChild(input)
        })
    })

    describe("re-authenticate", (): void => {
        it("when called with pending intent and draft, then dispatches restored event and navigates", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            window.sessionStorage.setItem("codenautic:session:pending-intent", "/reviews")
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify({
                    fieldKey: "id:comment",
                    path: "/reviews",
                    value: "Draft comment",
                    updatedAt: new Date().toISOString(),
                }),
            )

            const dispatchSpy = vi.spyOn(window, "dispatchEvent")

            act((): void => {
                dispatchSessionExpired({ code: 401 })
            })

            act((): void => {
                result.current.handleReAuthenticate()
            })

            expect(result.current.isSessionRecoveryOpen).toBe(false)
            expect(result.current.restoredDraftMessage).toContain("id:comment")

            const restoredEvent = dispatchSpy.mock.calls.find((call): boolean => {
                const evt = call[0] as CustomEvent<unknown>
                return evt.type === "codenautic:session-draft-restored"
            })
            expect(restoredEvent).toBeDefined()

            expect(window.sessionStorage.getItem("codenautic:session:pending-intent")).toBeNull()
        })

        it("when called without draft, then navigates without draft message", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            window.sessionStorage.setItem("codenautic:session:pending-intent", "/settings")

            act((): void => {
                dispatchSessionExpired({ code: 401 })
            })

            act((): void => {
                result.current.handleReAuthenticate()
            })

            expect(result.current.isSessionRecoveryOpen).toBe(false)
            expect(result.current.restoredDraftMessage).toBeUndefined()
        })

        it("when called without pending intent, then navigates to current pathname", (): void => {
            const { result } = renderHook(useSessionRecovery, { wrapper: createWrapper() })

            act((): void => {
                dispatchSessionExpired({ code: 419 })
            })

            act((): void => {
                result.current.handleReAuthenticate()
            })

            expect(result.current.isSessionRecoveryOpen).toBe(false)
        })
    })

    describe("cleanup", (): void => {
        it("when unmounts, then removes event listeners", (): void => {
            const removeSpy = vi.spyOn(window, "removeEventListener")
            const removeDocSpy = vi.spyOn(document, "removeEventListener")

            const { unmount } = renderHook(useSessionRecovery, {
                wrapper: createWrapper(),
            })

            unmount()

            const sessionExpiredRemoved = removeSpy.mock.calls.some(
                (call): boolean => call[0] === "codenautic:session-expired",
            )
            const inputRemoved = removeDocSpy.mock.calls.some(
                (call): boolean => call[0] === "input",
            )

            expect(sessionExpiredRemoved).toBe(true)
            expect(inputRemoved).toBe(true)
        })
    })
})
