import {describe, expect, test} from "bun:test"

import type {IRuleRepository} from "../../../../src/application/ports/outbound/rule/rule-repository.port"
import {RULE_STATUS, Rule, type RuleStatus} from "../../../../src/domain/aggregates/rule.aggregate"
import {RuleFactory} from "../../../../src/domain/factories/rule.factory"
import {type UniqueId} from "../../../../src/domain/value-objects/unique-id.value-object"

class InMemoryRuleRepository implements IRuleRepository {
    private readonly storage: Map<string, Rule>

    public constructor() {
        this.storage = new Map<string, Rule>()
    }

    public findById(id: UniqueId): Promise<Rule | null> {
        return Promise.resolve(this.storage.get(id.value) ?? null)
    }

    public save(rule: Rule): Promise<void> {
        this.storage.set(rule.id.value, rule)
        return Promise.resolve()
    }

    public findByStatus(status: RuleStatus): Promise<readonly Rule[]> {
        return Promise.resolve(
            [...this.storage.values()].filter((rule) => {
                return rule.status === status
            }),
        )
    }
}

describe("IRuleRepository contract", () => {
    test("saves and finds rule by identifier", async () => {
        const ruleFactory = new RuleFactory()
        const repository = new InMemoryRuleRepository()
        const rule = ruleFactory.create({
            name: "No TODO comments",
            description: "Blocks TODO comments in production code.",
            expression: "TODO",
        })

        await repository.save(rule)

        const found = await repository.findById(rule.id)

        expect(found).not.toBeNull()
        if (found === null) {
            throw new Error("Saved rule must be retrievable by id")
        }
        expect(found.id.equals(rule.id)).toBe(true)
    })

    test("returns only rules with requested status", async () => {
        const ruleFactory = new RuleFactory()
        const repository = new InMemoryRuleRepository()
        const activeRule = ruleFactory.create({
            name: "Enforce explicit return type",
            description: "Requires explicit return type for all exported functions.",
            expression: "explicit-function-return-type",
        })
        const draftRule = ruleFactory.create({
            name: "No mutable exports",
            description: "Flags mutable exported bindings.",
            expression: "no-mutable-exports",
        })

        activeRule.activate(new Date("2026-03-02T10:00:00.000Z"))
        await repository.save(activeRule)
        await repository.save(draftRule)

        const activeRules = await repository.findByStatus(RULE_STATUS.ACTIVE)

        expect(activeRules).toHaveLength(1)
        expect(activeRules[0]?.id.equals(activeRule.id)).toBe(true)
    })
})
