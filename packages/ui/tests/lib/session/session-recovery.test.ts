import { describe, expect, it, beforeEach } from "vitest"

import {
    buildDraftFieldKey,
    writeSessionPendingIntent,
    readSessionPendingIntent,
    clearSessionPendingIntent,
    writeSessionDraftSnapshot,
    readSessionDraftSnapshot,
    type ISessionDraftSnapshot,
} from "@/lib/session/session-recovery"

describe("session-recovery", (): void => {
    beforeEach((): void => {
        window.sessionStorage.clear()
    })

    describe("buildDraftFieldKey", (): void => {
        it("when field has name attribute, then returns name-based key", (): void => {
            const field = document.createElement("input")
            field.name = "email"

            expect(buildDraftFieldKey(field)).toBe("name:email")
        })

        it("when field has empty name but has id, then returns id-based key", (): void => {
            const field = document.createElement("input")
            field.name = ""
            field.id = "my-input"

            expect(buildDraftFieldKey(field)).toBe("id:my-input")
        })

        it("when field has no name or id but has aria-label, then returns aria-based key", (): void => {
            const field = document.createElement("textarea")
            field.name = ""
            field.id = ""
            field.setAttribute("aria-label", "Comment field")

            expect(buildDraftFieldKey(field)).toBe("aria:Comment field")
        })

        it("when field has no identifiers, then returns unknown fallback", (): void => {
            const field = document.createElement("input")
            field.name = ""
            field.id = ""

            expect(buildDraftFieldKey(field)).toBe("field:unknown")
        })

        it("when field name is whitespace only, then falls through to id", (): void => {
            const field = document.createElement("input")
            field.name = "   "
            field.id = "fallback-id"

            expect(buildDraftFieldKey(field)).toBe("id:fallback-id")
        })

        it("when field id is whitespace only, then falls through to aria-label", (): void => {
            const field = document.createElement("input")
            field.name = ""
            field.id = "   "
            field.setAttribute("aria-label", "Search")

            expect(buildDraftFieldKey(field)).toBe("aria:Search")
        })

        it("when aria-label is whitespace only, then returns unknown fallback", (): void => {
            const field = document.createElement("input")
            field.name = ""
            field.id = ""
            field.setAttribute("aria-label", "   ")

            expect(buildDraftFieldKey(field)).toBe("field:unknown")
        })
    })

    describe("writeSessionPendingIntent", (): void => {
        it("when called with route, then stores it in sessionStorage", (): void => {
            writeSessionPendingIntent("/settings/profile")

            const stored = window.sessionStorage.getItem("codenautic:session:pending-intent")
            expect(stored).toBe("/settings/profile")
        })
    })

    describe("readSessionPendingIntent", (): void => {
        it("when pending intent exists, then returns stored value", (): void => {
            window.sessionStorage.setItem("codenautic:session:pending-intent", "/dashboard")

            expect(readSessionPendingIntent()).toBe("/dashboard")
        })

        it("when pending intent does not exist, then returns undefined", (): void => {
            expect(readSessionPendingIntent()).toBeUndefined()
        })

        it("when pending intent is empty string, then returns undefined", (): void => {
            window.sessionStorage.setItem("codenautic:session:pending-intent", "")

            expect(readSessionPendingIntent()).toBeUndefined()
        })

        it("when pending intent is whitespace only, then returns undefined", (): void => {
            window.sessionStorage.setItem("codenautic:session:pending-intent", "   ")

            expect(readSessionPendingIntent()).toBeUndefined()
        })
    })

    describe("clearSessionPendingIntent", (): void => {
        it("when called, then removes pending intent from sessionStorage", (): void => {
            window.sessionStorage.setItem("codenautic:session:pending-intent", "/some-route")

            clearSessionPendingIntent()

            expect(window.sessionStorage.getItem("codenautic:session:pending-intent")).toBeNull()
        })

        it("when no pending intent exists, then does not throw", (): void => {
            expect((): void => {
                clearSessionPendingIntent()
            }).not.toThrow()
        })
    })

    describe("writeSessionDraftSnapshot", (): void => {
        it("when called with draft, then stores serialized JSON in sessionStorage", (): void => {
            const draft: ISessionDraftSnapshot = {
                fieldKey: "name:title",
                path: "/reviews/new",
                value: "My draft review",
                updatedAt: "2026-03-10T12:00:00.000Z",
            }

            writeSessionDraftSnapshot(draft)

            const stored = window.sessionStorage.getItem("codenautic:session:draft")
            expect(stored).not.toBeNull()
            if (stored !== null) {
                const parsed = JSON.parse(stored) as ISessionDraftSnapshot
                expect(parsed.fieldKey).toBe("name:title")
                expect(parsed.value).toBe("My draft review")
            }
        })
    })

    describe("readSessionDraftSnapshot", (): void => {
        it("when valid draft exists, then returns parsed snapshot", (): void => {
            const draft: ISessionDraftSnapshot = {
                fieldKey: "id:comment-box",
                path: "/reviews/42",
                value: "Some comment",
                updatedAt: "2026-03-10T12:00:00.000Z",
            }
            window.sessionStorage.setItem("codenautic:session:draft", JSON.stringify(draft))

            const result = readSessionDraftSnapshot()

            expect(result).toBeDefined()
            if (result !== undefined) {
                expect(result.fieldKey).toBe("id:comment-box")
                expect(result.path).toBe("/reviews/42")
                expect(result.value).toBe("Some comment")
                expect(result.updatedAt).toBe("2026-03-10T12:00:00.000Z")
            }
        })

        it("when no draft exists, then returns undefined", (): void => {
            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored value is invalid JSON, then returns undefined", (): void => {
            window.sessionStorage.setItem("codenautic:session:draft", "not-json{{{")

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored value is a JSON string (not object), then returns undefined", (): void => {
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify("just a string"),
            )

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored value is null JSON, then returns undefined", (): void => {
            window.sessionStorage.setItem("codenautic:session:draft", "null")

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored object is missing fieldKey, then returns undefined", (): void => {
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify({
                    path: "/reviews/42",
                    value: "data",
                    updatedAt: "2026-03-10T12:00:00.000Z",
                }),
            )

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored object has non-string value, then returns undefined", (): void => {
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify({
                    fieldKey: "name:title",
                    path: "/reviews/42",
                    value: 42,
                    updatedAt: "2026-03-10T12:00:00.000Z",
                }),
            )

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored object has non-string path, then returns undefined", (): void => {
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify({
                    fieldKey: "name:title",
                    path: 123,
                    value: "data",
                    updatedAt: "2026-03-10T12:00:00.000Z",
                }),
            )

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })

        it("when stored object has non-string updatedAt, then returns undefined", (): void => {
            window.sessionStorage.setItem(
                "codenautic:session:draft",
                JSON.stringify({
                    fieldKey: "name:title",
                    path: "/reviews/42",
                    value: "data",
                    updatedAt: 1234567890,
                }),
            )

            expect(readSessionDraftSnapshot()).toBeUndefined()
        })
    })

    describe("roundtrip write + read", (): void => {
        it("when pending intent is written, then it can be read back and cleared", (): void => {
            writeSessionPendingIntent("/settings")

            expect(readSessionPendingIntent()).toBe("/settings")

            clearSessionPendingIntent()
            expect(readSessionPendingIntent()).toBeUndefined()
        })

        it("when draft snapshot is written, then it can be read back", (): void => {
            const draft: ISessionDraftSnapshot = {
                fieldKey: "aria:Review comment",
                path: "/reviews/99",
                value: "Work in progress...",
                updatedAt: "2026-03-10T15:30:00.000Z",
            }

            writeSessionDraftSnapshot(draft)
            const result = readSessionDraftSnapshot()

            expect(result).toEqual(draft)
        })
    })
})
