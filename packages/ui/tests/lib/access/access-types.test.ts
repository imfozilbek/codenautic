import { describe, expect, it } from "vitest"

import { isUiRole, isTenantId, UI_ROLE_PRIORITY } from "@/lib/access/access-types"

describe("isUiRole", (): void => {
    it("when value is 'admin', then returns true", (): void => {
        expect(isUiRole("admin")).toBe(true)
    })

    it("when value is 'developer', then returns true", (): void => {
        expect(isUiRole("developer")).toBe(true)
    })

    it("when value is 'lead', then returns true", (): void => {
        expect(isUiRole("lead")).toBe(true)
    })

    it("when value is 'viewer', then returns true", (): void => {
        expect(isUiRole("viewer")).toBe(true)
    })

    it("when value is unknown string, then returns false", (): void => {
        expect(isUiRole("superadmin")).toBe(false)
    })

    it("when value is a number, then returns false", (): void => {
        expect(isUiRole(42)).toBe(false)
    })

    it("when value is null, then returns false", (): void => {
        expect(isUiRole(null)).toBe(false)
    })

    it("when value is undefined, then returns false", (): void => {
        expect(isUiRole(undefined)).toBe(false)
    })
})

describe("isTenantId", (): void => {
    it("when value is 'platform-team', then returns true", (): void => {
        expect(isTenantId("platform-team")).toBe(true)
    })

    it("when value is 'frontend-team', then returns true", (): void => {
        expect(isTenantId("frontend-team")).toBe(true)
    })

    it("when value is 'runtime-team', then returns true", (): void => {
        expect(isTenantId("runtime-team")).toBe(true)
    })

    it("when value is unknown string, then returns false", (): void => {
        expect(isTenantId("unknown-team")).toBe(false)
    })

    it("when value is a number, then returns false", (): void => {
        expect(isTenantId(123)).toBe(false)
    })
})

describe("UI_ROLE_PRIORITY", (): void => {
    it("when checked, then contains roles ordered from least to most privileged", (): void => {
        expect(UI_ROLE_PRIORITY).toEqual(["viewer", "developer", "lead", "admin"])
    })
})
