import {describe, expect, test} from "bun:test"

import {OrganizationId} from "../../../src/domain/value-objects/organization-id.value-object"

describe("OrganizationId", () => {
    test("treats null and undefined as global tenant", () => {
        const fromNull = OrganizationId.create(null)
        const fromUndefined = OrganizationId.create()

        expect(fromNull.isGlobal()).toBe(true)
        expect(fromNull.value).toBeNull()
        expect(fromNull.toString()).toBe("global")

        expect(fromUndefined.isGlobal()).toBe(true)
        expect(fromUndefined.value).toBeNull()
    })

    test("creates organization id for tenant-scoped value", () => {
        const organizationId = OrganizationId.create("  org_main-001  ")

        expect(organizationId.isGlobal()).toBe(false)
        expect(organizationId.value).toBe("org_main-001")
        expect(organizationId.toString()).toBe("org_main-001")
    })

    test("throws for empty tenant id string", () => {
        expect(() => {
            OrganizationId.create("   ")
        }).toThrow("OrganizationId cannot be empty")
    })

    test("throws for invalid tenant id format", () => {
        expect(() => {
            OrganizationId.create("bad id")
        }).toThrow("OrganizationId has invalid format")

        expect(() => {
            OrganizationId.create("@org")
        }).toThrow("OrganizationId has invalid format")
    })
})
