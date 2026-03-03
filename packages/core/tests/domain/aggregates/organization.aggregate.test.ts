import {describe, expect, test} from "bun:test"

import {MemberRole} from "../../../src/domain/value-objects/member-role.value-object"
import {APIKeyConfig} from "../../../src/domain/value-objects/api-key-config.value-object"
import {Organization, type IOrganizationProps} from "../../../src/domain/aggregates/organization.aggregate"
import {OrgSettings} from "../../../src/domain/value-objects/org-settings.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("Organization aggregate", () => {
    test("initializes with owner as mandatory member", () => {
        const organization = new Organization(UniqueId.create("org-1"), createOrganizationProps({
            name: "Acme Org",
            ownerId: "owner-1",
        }))

        expect(organization.id.value).toBe("org-1")
        expect(organization.name).toBe("Acme Org")
        expect(organization.ownerId.value).toBe("owner-1")
        expect(organization.memberCount).toBe(1)
        expect(organization.hasMember(UniqueId.create("owner-1"))).toBe(true)
        expect(organization.isOwner(UniqueId.create("owner-1"))).toBe(true)
    })

    test("adds and removes member", () => {
        const organization = new Organization(UniqueId.create("org-2"), createOrganizationProps({
            name: "Team Org",
            ownerId: "owner-2",
        }))

        const memberId = UniqueId.create("member-1")
        organization.addMember(memberId, MemberRole.create("MEMBER"))

        expect(organization.hasMember(memberId)).toBe(true)
        expect(organization.getMemberRole(memberId)?.toString()).toBe("MEMBER")
        expect(organization.memberCount).toBe(2)

        organization.removeMember(memberId)

        expect(organization.hasMember(memberId)).toBe(false)
        expect(organization.memberCount).toBe(1)
    })

    test("updates settings via merge", () => {
        const organization = new Organization(UniqueId.create("org-3"), createOrganizationProps({
            name: "Merge Org",
            ownerId: "owner-3",
        }))

        organization.updateSettings({reviewWindow: 30, notifications: false})

        expect(organization.settings.get("reviewWindow")).toBe(30)
        expect(organization.settings.get("notifications")).toBe(false)
    })

    test("throws when adding duplicate member", () => {
        const organization = new Organization(UniqueId.create("org-4"), createOrganizationProps({
            name: "Duplicate Org",
            ownerId: "owner-4",
        }))
        const memberId = UniqueId.create("member-2")

        organization.addMember(memberId, MemberRole.create("MEMBER"))

        expect(() => {
            organization.addMember(memberId, MemberRole.create("ADMIN"))
        }).toThrow(`Member ${memberId.value} already exists`)
    })

    test("throws when removing owner", () => {
        const organization = new Organization(UniqueId.create("org-5"), createOrganizationProps({
            name: "Owner Org",
            ownerId: "owner-5",
        }))

        expect(() => {
            organization.removeMember(UniqueId.create("owner-5"))
        }).toThrow("Owner cannot be removed")
    })

    test("throws when organization name is empty", () => {
        expect(() => {
            new Organization(UniqueId.create("org-6"), createOrganizationProps({
                name: "   ",
                ownerId: "owner-6",
            }))
        }).toThrow("Organization name cannot be empty")
    })

    test("throws when owner role is downgraded in constructor", () => {
        expect(() => {
            new Organization(UniqueId.create("org-7"), createOrganizationProps({
                name: "Bad Owner Org",
                ownerId: "owner-7",
                members: [{
                    userId: "owner-7",
                    role: "MEMBER",
                }],
            }))
        }).toThrow("Owner role cannot be downgraded")
    })

    test("throws on duplicate api key ids", () => {
        const duplicateKeys = [
            APIKeyConfig.create({
                provider: "openai",
                keyId: "key-1",
            }),
            APIKeyConfig.create({
                provider: "openai",
                keyId: "key-1",
            }),
        ]
        expect(() => {
            new Organization(UniqueId.create("org-8"), createOrganizationProps({
                name: "Key Org",
                ownerId: "owner-8",
                apiKeys: duplicateKeys,
            }))
        }).toThrow("Duplicate API key id")
    })
})

/**
 * Builds Organization props for tests.
 *
 * @param overrides Custom props.
 * @returns Aggregated props.
 */
function createOrganizationProps(overrides: {
    name: string
    ownerId: string
    settings?: Record<string, unknown>
    apiKeys?: APIKeyConfig[]
    byokEnabled?: boolean
    members?: {userId: string; role: string}[]
}): IOrganizationProps {
    return {
        name: overrides.name,
        ownerId: UniqueId.create(overrides.ownerId),
        settings: OrgSettings.create(overrides.settings),
        apiKeys: overrides.apiKeys ?? [],
        byokEnabled: overrides.byokEnabled ?? false,
        members: overrides.members ?? [
            {
                userId: overrides.ownerId,
                role: "OWNER",
            },
        ],
    }
}
