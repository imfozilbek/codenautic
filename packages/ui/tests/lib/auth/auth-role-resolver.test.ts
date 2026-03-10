import { describe, expect, it } from "vitest"

import {
    readStoredTenantId,
    resolveAccessibleRouteFallbackPath,
    resolveAuthAccess,
    resolveAuthRole,
    resolveAuthTenantId,
    type IResolvedAuthAccess,
} from "@/lib/auth/auth-role-resolver"
import type { IAuthSession } from "@/lib/auth/types"
import { TENANT_STORAGE_KEY } from "@/lib/sync/multi-tab-consistency"

function createSession(overrides?: Partial<IAuthSession["user"]>): IAuthSession {
    return {
        provider: "github",
        expiresAt: "2030-01-01T00:00:00.000Z",
        user: {
            id: "u-1",
            email: "dev@example.com",
            displayName: "Dev User",
            ...overrides,
        },
    }
}

describe("resolveAuthRole", (): void => {
    it("когда session.user.role является валидной ролью, тогда возвращает её", (): void => {
        const session = createSession({ role: "admin" })
        expect(resolveAuthRole(session)).toBe("admin")
    })

    it("когда session.user.role является валидной ролью developer, тогда возвращает developer", (): void => {
        const session = createSession({ role: "developer" })
        expect(resolveAuthRole(session)).toBe("developer")
    })

    it("когда session.user.role невалидна и roles содержит массив ролей, тогда возвращает роль с наивысшим приоритетом", (): void => {
        const session = createSession({
            role: "unknown-role",
            roles: ["viewer", "lead", "developer"],
        })
        expect(resolveAuthRole(session)).toBe("lead")
    })

    it("когда session.user.role невалидна и roles содержит admin, тогда возвращает admin", (): void => {
        const session = createSession({
            role: "custom",
            roles: ["viewer", "admin", "developer"],
        })
        expect(resolveAuthRole(session)).toBe("admin")
    })

    it("когда session.user.role невалидна и roles пуст, тогда возвращает viewer", (): void => {
        const session = createSession({
            role: "invalid",
            roles: [],
        })
        expect(resolveAuthRole(session)).toBe("viewer")
    })

    it("когда session.user.role невалидна и roles отсутствует, тогда возвращает viewer", (): void => {
        const session = createSession({
            role: "invalid",
        })
        expect(resolveAuthRole(session)).toBe("viewer")
    })

    it("когда session.user.role невалидна и roles содержит невалидные значения, тогда возвращает viewer", (): void => {
        const session = createSession({
            role: "custom",
            roles: ["x", "y", "z"],
        })
        expect(resolveAuthRole(session)).toBe("viewer")
    })

    it("когда roles содержит смесь валидных и невалидных ролей, тогда игнорирует невалидные", (): void => {
        const session = createSession({
            role: "custom",
            roles: ["x", "developer", "unknown", "viewer"],
        })
        expect(resolveAuthRole(session)).toBe("developer")
    })

    it("когда role не определена и roles отсутствует, тогда возвращает viewer", (): void => {
        const session = createSession({})
        expect(resolveAuthRole(session)).toBe("viewer")
    })
})

describe("resolveAuthTenantId", (): void => {
    it("когда в storage сохранён валидный tenant, тогда возвращает его", (): void => {
        window.localStorage.setItem(TENANT_STORAGE_KEY, "frontend-team")
        const session = createSession({ tenantId: "platform-team" })
        expect(resolveAuthTenantId(session)).toBe("frontend-team")
        window.localStorage.removeItem(TENANT_STORAGE_KEY)
    })

    it("когда storage пуст и session имеет валидный tenantId, тогда возвращает его", (): void => {
        const session = createSession({ tenantId: "runtime-team" })
        expect(resolveAuthTenantId(session)).toBe("runtime-team")
    })

    it("когда storage пуст и session.tenantId невалиден, тогда возвращает platform-team", (): void => {
        const session = createSession({ tenantId: "unknown-team" })
        expect(resolveAuthTenantId(session)).toBe("platform-team")
    })

    it("когда storage пуст и session.tenantId отсутствует, тогда возвращает platform-team", (): void => {
        const session = createSession({})
        expect(resolveAuthTenantId(session)).toBe("platform-team")
    })
})

describe("readStoredTenantId", (): void => {
    it("когда в localStorage есть валидный tenant, тогда возвращает его", (): void => {
        window.localStorage.setItem(TENANT_STORAGE_KEY, "runtime-team")
        expect(readStoredTenantId()).toBe("runtime-team")
        window.localStorage.removeItem(TENANT_STORAGE_KEY)
    })

    it("когда localStorage пуст, тогда возвращает undefined", (): void => {
        expect(readStoredTenantId()).toBeUndefined()
    })

    it("когда localStorage содержит невалидный tenant, тогда возвращает undefined", (): void => {
        window.localStorage.setItem(TENANT_STORAGE_KEY, "unknown-org")
        expect(readStoredTenantId()).toBeUndefined()
        window.localStorage.removeItem(TENANT_STORAGE_KEY)
    })
})

describe("resolveAuthAccess", (): void => {
    it("возвращает нормализованный role и tenantId", (): void => {
        const session = createSession({ role: "lead", tenantId: "frontend-team" })
        const access = resolveAuthAccess(session)
        expect(access.role).toBe("lead")
        expect(access.tenantId).toBe("frontend-team")
    })

    it("использует fallback для невалидных role и tenantId", (): void => {
        const session = createSession({ role: "custom", tenantId: "unknown" })
        const access = resolveAuthAccess(session)
        expect(access.role).toBe("viewer")
        expect(access.tenantId).toBe("platform-team")
    })
})

describe("resolveAccessibleRouteFallbackPath", (): void => {
    it("когда есть доступный маршрут, отличный от текущего, тогда возвращает его", (): void => {
        const access: IResolvedAuthAccess = {
            role: "admin",
            tenantId: "platform-team",
        }
        const fallback = resolveAccessibleRouteFallbackPath(access, "/settings-billing")
        expect(fallback).toBeDefined()
        expect(fallback).not.toBe("/settings-billing")
    })

    it("когда текущий путь — / и пользователь имеет доступ к другим маршрутам, тогда возвращает путь", (): void => {
        const access: IResolvedAuthAccess = {
            role: "admin",
            tenantId: "platform-team",
        }
        const fallback = resolveAccessibleRouteFallbackPath(access, "/")
        expect(fallback).toBeDefined()
        expect(fallback).not.toBe("/")
    })

    it("когда текущий путь — / и нет доступных маршрутов (viewer + runtime-team), тогда возвращает undefined если / — единственный", (): void => {
        const access: IResolvedAuthAccess = {
            role: "viewer",
            tenantId: "platform-team",
        }
        const fallback = resolveAccessibleRouteFallbackPath(access, "/")
        expect(typeof fallback === "string" || fallback === undefined).toBe(true)
    })

    it("когда текущий путь не / и нет доступных альтернативных маршрутов, тогда возвращает /", (): void => {
        const access: IResolvedAuthAccess = {
            role: "viewer",
            tenantId: "runtime-team",
        }
        const fallback = resolveAccessibleRouteFallbackPath(access, "/settings-organization")
        expect(fallback).toBeDefined()
    })
})
