import {describe, expect, test} from "bun:test"

import type {ICustomRuleRepository} from "../../../../src/application/ports/outbound/custom-rule-repository.port"
import {
    CUSTOM_RULE_SCOPE,
    CUSTOM_RULE_STATUS,
    type CustomRule,
} from "../../../../src/domain/entities/custom-rule.entity"
import {CustomRuleFactory} from "../../../../src/domain/factories/custom-rule.factory"
import {OrganizationId} from "../../../../src/domain/value-objects/organization-id.value-object"
import type {UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

/**
 * In-memory implementation for `ICustomRuleRepository`.
 */
class InMemoryCustomRuleRepository implements ICustomRuleRepository {
    private readonly storage: Map<string, CustomRule>
    private readonly organizationMap: Map<string, OrganizationId>

    public constructor() {
        this.storage = new Map<string, CustomRule>()
        this.organizationMap = new Map<string, OrganizationId>()
    }

    public findById(id: UniqueId): Promise<CustomRule | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(rule: CustomRule, organizationId?: OrganizationId): Promise<void> {
        this.storage.set(rule.id.value, rule)

        if (organizationId !== undefined) {
            this.organizationMap.set(rule.id.value, organizationId)
        }

        return Promise.resolve()
    }

    public findByOrganizationId(organizationId: OrganizationId): Promise<readonly CustomRule[]> {
        const rules = [...this.storage.values()].filter((rule) => {
            const mappedOrg = this.organizationMap.get(rule.id.value)

            return mappedOrg !== undefined && mappedOrg.value === organizationId.value
        })

        return Promise.resolve(rules)
    }

    public findByStatus(status: keyof typeof CUSTOM_RULE_STATUS): Promise<readonly CustomRule[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => {
                return rule.status === status
            }),
        )
    }

    public findByScope(scope: keyof typeof CUSTOM_RULE_SCOPE): Promise<readonly CustomRule[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => {
                return rule.scope === scope
            }),
        )
    }

    public findActiveByOrganization(
        organizationId: OrganizationId,
    ): Promise<readonly CustomRule[]> {
        const active = [...this.storage.values()].filter((rule) => {
            return rule.status === CUSTOM_RULE_STATUS.ACTIVE
        })

        return Promise.resolve(
            active.filter((rule) => {
                const mappedOrg = this.organizationMap.get(rule.id.value)
                return mappedOrg !== undefined && mappedOrg.value === organizationId.value
            }),
        )
    }
}

describe("ICustomRuleRepository contract", () => {
    test("saves and finds custom rule by identifier", async () => {
        const factory = new CustomRuleFactory()
        const repository = new InMemoryCustomRuleRepository()
        const orgId = OrganizationId.create("acme")
        const rule = factory.reconstitute({
            id: "rule-1",
            title: "No TODO comments",
            rule: "TODO",
            type: "REGEX",
            scope: "FILE",
            severity: "LOW",
            status: "ACTIVE",
        })

        await repository.save(rule, orgId)

        const found = await repository.findById(rule.id)

        expect(found).not.toBeNull()
        if (found === null) {
            throw new Error("Saved rule should be retrievable by id")
        }
        expect(found.id.equals(rule.id)).toBe(true)
    })

    test("finds custom rules by organization", async () => {
        const factory = new CustomRuleFactory()
        const repository = new InMemoryCustomRuleRepository()
        const orgA = OrganizationId.create("org-a")
        const orgB = OrganizationId.create("org-b")

        await repository.save(
            factory.reconstitute({
                id: "org-a-1",
                title: "Org A rule",
                rule: "TODO",
                type: "REGEX",
                scope: "FILE",
                severity: "LOW",
                status: "ACTIVE",
            }),
            orgA,
        )
        await repository.save(
            factory.reconstitute({
                id: "org-b-1",
                title: "Org B rule",
                rule: "FIXME",
                type: "PROMPT",
                scope: "CCR",
                severity: "MEDIUM",
                status: "PENDING",
            }),
            orgB,
        )

        const fromOrgA = await repository.findByOrganizationId(orgA)
        const fromOrgB = await repository.findByOrganizationId(orgB)

        expect(fromOrgA).toHaveLength(1)
        expect(fromOrgA[0]?.id.value).toBe("org-a-1")
        expect(fromOrgB).toHaveLength(1)
        expect(fromOrgB[0]?.id.value).toBe("org-b-1")
    })

    test("finds custom rules by status and scope", async () => {
        const factory = new CustomRuleFactory()
        const repository = new InMemoryCustomRuleRepository()
        const orgId = OrganizationId.create("org-scope")

        await repository.save(
            factory.reconstitute({
                id: "pending-file",
                title: "Pending file rule",
                rule: "TODO",
                type: "REGEX",
                scope: "FILE",
                severity: "LOW",
                status: "PENDING",
            }),
            orgId,
        )
        await repository.save(
            factory.reconstitute({
                id: "active-file",
                title: "Active file rule",
                rule: "TODO",
                type: "REGEX",
                scope: "FILE",
                severity: "LOW",
                status: "ACTIVE",
            }),
            orgId,
        )
        await repository.save(
            factory.reconstitute({
                id: "active-ccr",
                title: "Active ccr rule",
                rule: "no-empty",
                type: "PROMPT",
                scope: "CCR",
                severity: "HIGH",
                status: "ACTIVE",
            }),
            orgId,
        )

        const byStatus = await repository.findByStatus(CUSTOM_RULE_STATUS.ACTIVE)
        const byScope = await repository.findByScope(CUSTOM_RULE_SCOPE.FILE)

        expect(byStatus).toHaveLength(2)
        expect(byScope).toHaveLength(2)
    })

    test("finds active custom rules for organization", async () => {
        const factory = new CustomRuleFactory()
        const repository = new InMemoryCustomRuleRepository()
        const orgId = OrganizationId.create("org-active")
        const anotherOrg = OrganizationId.create("org-other")

        await repository.save(
            factory.reconstitute({
                id: "org-active-1",
                title: "Active org rule",
                rule: "TODO",
                type: "REGEX",
                scope: "FILE",
                severity: "LOW",
                status: "ACTIVE",
            }),
            orgId,
        )
        await repository.save(
            factory.reconstitute({
                id: "org-active-2",
                title: "Inactive org rule",
                rule: "FIXME",
                type: "PROMPT",
                scope: "FILE",
                severity: "MEDIUM",
                status: "PENDING",
            }),
            orgId,
        )
        await repository.save(
            factory.reconstitute({
                id: "other-org",
                title: "Active other org rule",
                rule: "var",
                type: "REGEX",
                scope: "FILE",
                severity: "HIGH",
                status: "ACTIVE",
            }),
            anotherOrg,
        )

        const activeForOrg = await repository.findActiveByOrganization(orgId)

        expect(activeForOrg).toHaveLength(1)
        expect(activeForOrg[0]?.id.value).toBe("org-active-1")
    })
})
