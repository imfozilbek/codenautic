import {describe, expect, test} from "bun:test"

import {API_KEY_STATUS} from "../../../src/domain/value-objects/api-key-config.value-object"
import {OrganizationFactory} from "../../../src/domain/factories/organization.factory"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("OrganizationFactory", () => {
    test("creates organization with defaults and owner member", () => {
        const factory = new OrganizationFactory()
        const organization = factory.create({
            name: "Acme",
            ownerId: "owner-1",
        })

        expect(organization.id.value).toHaveLength(36)
        expect(organization.name).toBe("Acme")
        expect(organization.ownerId.value).toBe("owner-1")
        expect(organization.memberCount).toBe(1)
        expect(organization.hasMember(organization.ownerId)).toBe(true)
    })

    test("creates organization with nested settings and API keys", () => {
        const factory = new OrganizationFactory()
        const organization = factory.create({
            name: "Acme",
            ownerId: "owner-2",
            settings: {notificationMode: "enabled", limit: 10},
            apiKeys: [{
                provider: "openai",
                keyId: "key-1",
                status: API_KEY_STATUS.INACTIVE,
            }],
            byokEnabled: true,
        })

        expect(organization.settings.get("notificationMode")).toBe("enabled")
        expect(organization.apiKeys).toHaveLength(1)
        expect(organization.apiKeys[0]?.status).toBe(API_KEY_STATUS.INACTIVE)
        expect(organization.byokEnabled).toBe(true)
    })

    test("reconstitutes persisted payload", () => {
        const factory = new OrganizationFactory()
        const organization = factory.reconstitute({
            id: "org-3",
            name: "Replayed",
            ownerId: "owner-3",
            settings: {notify: true},
            byokEnabled: false,
            members: [
                {
                    userId: "owner-3",
                    role: "OWNER",
                },
                {
                    userId: "member-1",
                    role: "ADMIN",
                },
            ],
            apiKeys: [
                {
                    provider: "openai",
                    keyId: "playground-key",
                    status: API_KEY_STATUS.ACTIVE,
                    createdAt: "2026-03-01T00:00:00.000Z",
                },
            ],
        })

        expect(organization.id.value).toBe("org-3")
        expect(organization.name).toBe("Replayed")
        expect(organization.hasMember(organization.ownerId)).toBe(true)
        expect(organization.hasMember(UniqueId.create("member-1"))).toBe(true)
    })
})
