import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import {
    getUiActionPolicy,
    isRolePreviewEnabled,
    readUiRoleFromStorage,
    writeUiRoleToStorage,
    type TUiActionId,
    type TUiRole,
} from "@/lib/permissions/ui-policy"

describe("getUiActionPolicy", (): void => {
    const ALL_ACTIONS: ReadonlyArray<TUiActionId> = [
        "review.decision",
        "review.finish",
        "team.create",
        "team.invite",
        "team.repo.assign",
        "team.role.manage",
    ]

    describe("admin role", (): void => {
        it("when role is admin, then all actions are enabled", (): void => {
            ALL_ACTIONS.forEach((actionId): void => {
                const policy = getUiActionPolicy("admin", actionId)
                expect(policy.visibility).toBe("enabled")
                expect(policy.reason).toBeUndefined()
            })
        })
    })

    describe("developer role", (): void => {
        it("when role is developer and action is review.decision, then returns enabled", (): void => {
            const policy = getUiActionPolicy("developer", "review.decision")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is developer and action is review.finish, then returns enabled", (): void => {
            const policy = getUiActionPolicy("developer", "review.finish")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is developer and action is team.create, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("developer", "team.create")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Only admin can create or delete teams.")
        })

        it("when role is developer and action is team.invite, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("developer", "team.invite")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Only lead or admin can invite team members.")
        })

        it("when role is developer and action is team.repo.assign, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("developer", "team.repo.assign")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Repository assignment requires lead or admin role.")
        })

        it("when role is developer and action is team.role.manage, then returns hidden with reason", (): void => {
            const policy = getUiActionPolicy("developer", "team.role.manage")
            expect(policy.visibility).toBe("hidden")
            expect(policy.reason).toBe("Role updates are restricted to lead and admin.")
        })
    })

    describe("lead role", (): void => {
        it("when role is lead and action is review.decision, then returns enabled", (): void => {
            const policy = getUiActionPolicy("lead", "review.decision")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is lead and action is review.finish, then returns enabled", (): void => {
            const policy = getUiActionPolicy("lead", "review.finish")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is lead and action is team.create, then returns disabled", (): void => {
            const policy = getUiActionPolicy("lead", "team.create")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Only admin can create or delete teams.")
        })

        it("when role is lead and action is team.invite, then returns enabled", (): void => {
            const policy = getUiActionPolicy("lead", "team.invite")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is lead and action is team.repo.assign, then returns enabled", (): void => {
            const policy = getUiActionPolicy("lead", "team.repo.assign")
            expect(policy.visibility).toBe("enabled")
        })

        it("when role is lead and action is team.role.manage, then returns enabled", (): void => {
            const policy = getUiActionPolicy("lead", "team.role.manage")
            expect(policy.visibility).toBe("enabled")
        })
    })

    describe("viewer role", (): void => {
        it("when role is viewer and action is review.decision, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "review.decision")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe(
                "Viewer can inspect review, but cannot approve or request changes.",
            )
        })

        it("when role is viewer and action is review.finish, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "review.finish")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Viewer cannot finalize review actions.")
        })

        it("when role is viewer and action is team.create, then returns hidden with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "team.create")
            expect(policy.visibility).toBe("hidden")
            expect(policy.reason).toBe("Viewer has read-only access to team management.")
        })

        it("when role is viewer and action is team.invite, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "team.invite")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Viewer cannot invite members.")
        })

        it("when role is viewer and action is team.repo.assign, then returns disabled with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "team.repo.assign")
            expect(policy.visibility).toBe("disabled")
            expect(policy.reason).toBe("Viewer cannot change repository assignments.")
        })

        it("when role is viewer and action is team.role.manage, then returns hidden with reason", (): void => {
            const policy = getUiActionPolicy("viewer", "team.role.manage")
            expect(policy.visibility).toBe("hidden")
            expect(policy.reason).toBe("Viewer cannot update member roles.")
        })
    })
})

describe("isRolePreviewEnabled", (): void => {
    it("when mode is test, then returns true", (): void => {
        const result = isRolePreviewEnabled()
        expect(result).toBe(true)
    })
})

describe("readUiRoleFromStorage", (): void => {
    beforeEach((): void => {
        window.localStorage.clear()
    })

    it("when in test mode and no stored role, then returns admin", (): void => {
        const role = readUiRoleFromStorage()
        expect(role).toBe("admin")
    })

    it("when valid role is stored and preview is enabled, then returns stored role", (): void => {
        window.localStorage.setItem("codenautic:rbac:role", "developer")
        const role = readUiRoleFromStorage()
        expect(role).toBe("developer")
    })

    it("when invalid role is stored, then returns default role", (): void => {
        window.localStorage.setItem("codenautic:rbac:role", "super-admin")
        const role = readUiRoleFromStorage()
        expect(role).toBe("admin")
    })

    it("when localStorage.getItem throws, then returns default role", (): void => {
        const original = window.localStorage
        const throwingStorage = {
            ...original,
            getItem: (): never => {
                throw new Error("Storage error")
            },
            setItem: original.setItem.bind(original),
            removeItem: original.removeItem.bind(original),
            clear: original.clear.bind(original),
            key: original.key.bind(original),
            get length(): number {
                return original.length
            },
        }
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: throwingStorage,
        })

        const role = readUiRoleFromStorage()
        expect(role).toBe("admin")

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: original,
        })
    })
})

describe("writeUiRoleToStorage", (): void => {
    beforeEach((): void => {
        window.localStorage.clear()
    })

    afterEach((): void => {
        vi.restoreAllMocks()
    })

    it("when called with valid role, then stores role in localStorage", (): void => {
        writeUiRoleToStorage("lead")
        const stored = window.localStorage.getItem("codenautic:rbac:role")
        expect(stored).toBe("lead")
    })

    it("when called with valid role, then dispatches custom event", (): void => {
        const eventSpy = vi.fn()
        window.addEventListener("codenautic:rbac-role-changed", eventSpy)

        writeUiRoleToStorage("developer")

        expect(eventSpy).toHaveBeenCalledOnce()
        window.removeEventListener("codenautic:rbac-role-changed", eventSpy)
    })

    it("when dispatched event, then event detail contains role", (): void => {
        let eventDetail: Record<string, unknown> | undefined
        const listener = (event: Event): void => {
            eventDetail = (event as CustomEvent).detail as Record<string, unknown>
        }
        window.addEventListener("codenautic:rbac-role-changed", listener)

        writeUiRoleToStorage("admin")

        expect(eventDetail).toBeDefined()
        expect(eventDetail?.role).toBe("admin")
        window.removeEventListener("codenautic:rbac-role-changed", listener)
    })

    it("when localStorage.setItem throws, then does not dispatch event", (): void => {
        const original = window.localStorage
        const throwingStorage = {
            ...original,
            getItem: original.getItem.bind(original),
            setItem: (): never => {
                throw new Error("Storage full")
            },
            removeItem: original.removeItem.bind(original),
            clear: original.clear.bind(original),
            key: original.key.bind(original),
            get length(): number {
                return original.length
            },
        }
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: throwingStorage,
        })

        const eventSpy = vi.fn()
        window.addEventListener("codenautic:rbac-role-changed", eventSpy)

        writeUiRoleToStorage("viewer")

        expect(eventSpy).not.toHaveBeenCalled()
        window.removeEventListener("codenautic:rbac-role-changed", eventSpy)

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: original,
        })
    })

    it("when called with each valid role, then stores each correctly", (): void => {
        const roles: ReadonlyArray<TUiRole> = ["admin", "developer", "lead", "viewer"]
        roles.forEach((role): void => {
            writeUiRoleToStorage(role)
            const stored = window.localStorage.getItem("codenautic:rbac:role")
            expect(stored).toBe(role)
        })
    })
})

describe("getUiActionPolicy edge cases", (): void => {
    it("when role is valid but actionId is unknown, then returns default policy", (): void => {
        const policy = getUiActionPolicy("admin", "unknown.action" as TUiActionId)
        expect(policy.visibility).toBe("disabled")
        expect(policy.reason).toBe("Action is unavailable for the current role policy.")
    })
})
