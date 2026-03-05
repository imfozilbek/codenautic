import {describe, expect, test} from "bun:test"

import {RepositoryId} from "../../../src/domain/value-objects/repository-id.value-object"
import {Team, type ITeamProps} from "../../../src/domain/entities/team.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("Team", () => {
    test("creates team with normalized name and deduplicated collections", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "  Core Team  ",
            organizationId: "org-1",
            memberIds: ["member-1", "member-1", "member-2"],
            repoIds: ["gh:repo-1", "gh:repo-1", "gh:repo-2"],
            ruleIds: ["rule-1", "rule-1", "rule-3"],
            disabledRuleUuids: ["rule-disabled-1"],
        }))

        expect(team.name).toBe("Core Team")
        expect(team.organizationId.value).toBe("org-1")
        expect(team.memberIds.map((id) => id.value)).toEqual(["member-1", "member-2"])
        expect(team.repoIds.map((id) => id.toString())).toEqual(["gh:repo-1", "gh:repo-2"])
        expect(team.ruleIds.map((id) => id.value)).toEqual(["rule-1", "rule-3"])
    })

    test("adds member and removes member", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Team",
            organizationId: "org-2",
            memberIds: ["member-1"],
            repoIds: [],
            ruleIds: [],
            disabledRuleUuids: [],
        }))
        const memberId = UniqueId.create("member-2")

        team.addMember(memberId)

        expect(team.hasMember(memberId)).toBe(true)
        expect(team.memberIds).toHaveLength(2)
        expect(team.hasMember(UniqueId.create("member-1"))).toBe(true)

        team.removeMember(UniqueId.create("member-1"))

        expect(team.memberIds).toHaveLength(1)
        expect(team.hasMember(UniqueId.create("member-1"))).toBe(false)
    })

    test("assigns repository to team", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Repo Team",
            organizationId: "org-3",
            memberIds: [],
            repoIds: ["gh:repo-1"],
            ruleIds: [],
            disabledRuleUuids: [],
        }))
        const repoId = RepositoryId.parse("gl:repo-2")

        team.assignRepo(repoId)

        expect(team.repoIds.map((repo) => repo.toString())).toEqual([
            "gh:repo-1",
            "gl:repo-2",
        ])
    })

    test("throws on duplicate member", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Dup Team",
            organizationId: "org-4",
            memberIds: ["member-1"],
            repoIds: [],
            ruleIds: [],
            disabledRuleUuids: [],
        }))

        expect(() => {
            team.addMember(UniqueId.create("member-1"))
        }).toThrow("Member member-1 already exists")
    })

    test("throws on removing missing member", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Missing Team",
            organizationId: "org-5",
            memberIds: ["member-1"],
            repoIds: [],
            ruleIds: [],
            disabledRuleUuids: [],
        }))

        expect(() => {
            team.removeMember(UniqueId.create("member-999"))
        }).toThrow("Member member-999 does not exist")
    })

    test("throws on duplicate repository assignment", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Dup Repo Team",
            organizationId: "org-6",
            memberIds: [],
            repoIds: ["gh:repo-1"],
            ruleIds: [],
            disabledRuleUuids: [],
        }))

        expect(() => {
            team.assignRepo(RepositoryId.parse("gh:repo-1"))
        }).toThrow("Repository gh:repo-1 already assigned")
    })

    test("throws when team name is empty", () => {
        expect(() => {
            void new Team(UniqueId.create(), createTeamProps({
                name: "   ",
                organizationId: "org-7",
                memberIds: [],
                repoIds: [],
                ruleIds: [],
                disabledRuleUuids: [],
            }))
        }).toThrow("Team name cannot be empty")
    })

    test("returns defensive copies from getters", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Copy Team",
            organizationId: "org-8",
            memberIds: ["member-1"],
            repoIds: ["gh:repo-1"],
            ruleIds: ["rule-1"],
            disabledRuleUuids: ["rule-disabled-1"],
        }))

        const members = team.memberIds
        const repos = team.repoIds
        const rules = team.ruleIds

        expect(members).not.toBe(team.memberIds)
        expect(repos).not.toBe(team.repoIds)
        expect(rules).not.toBe(team.ruleIds)

        const disabledRuleIds = team.disabledRuleUuids
        const disabledRuleIdsCopy = [...disabledRuleIds]

        expect(disabledRuleIds).not.toBe(disabledRuleIdsCopy)
    })

    test("handles disabled rules for disable/enable workflow", () => {
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Disabled Team",
            organizationId: "org-9",
            memberIds: [],
            repoIds: [],
            ruleIds: ["rule-1", "rule-2"],
            disabledRuleUuids: [],
        }))

        expect(team.disabledRuleUuids).toEqual([])

        const disableRule = UniqueId.create("rule-1")
        const enableRule = UniqueId.create("rule-2")
        team.disableRule(disableRule)
        team.disableRule(enableRule)

        expect(team.disabledRuleUuids.map((id) => id.value)).toEqual(["rule-1", "rule-2"])

        team.enableRule(disableRule)

        expect(team.disabledRuleUuids.map((id) => id.value)).toEqual(["rule-2"])
    })

    test("ignores disabling already disabled rule", () => {
        const ruleId = UniqueId.create("rule-1")
        const team = new Team(UniqueId.create(), createTeamProps({
            name: "Disabled Team",
            organizationId: "org-10",
            memberIds: [],
            repoIds: [],
            ruleIds: [],
            disabledRuleUuids: [ruleId.value],
        }))

        team.disableRule(ruleId)

        expect(team.disabledRuleUuids.map((id) => id.value)).toEqual(["rule-1"])
    })

    test("throws when organizationId is missing", () => {
        expect(() => {
            void new Team(UniqueId.create(), {
                name: "Missing Org",
                organizationId: undefined as unknown as UniqueId,
                memberIds: [],
                repoIds: [],
                ruleIds: [],
                disabledRuleUuids: [],
            })
        }).toThrow("Team organizationId must be defined")
    })

    test("throws when member id is missing", () => {
        expect(() => {
            void new Team(UniqueId.create(), {
                name: "Bad member",
                organizationId: UniqueId.create("org-11"),
                memberIds: [undefined as unknown as UniqueId],
                repoIds: [],
                ruleIds: [],
                disabledRuleUuids: [],
            })
        }).toThrow("Member id cannot be empty")
    })

    test("throws when repo id is missing", () => {
        expect(() => {
            void new Team(UniqueId.create(), {
                name: "Bad repo",
                organizationId: UniqueId.create("org-12"),
                memberIds: [],
                repoIds: [undefined as unknown as RepositoryId],
                ruleIds: [],
                disabledRuleUuids: [],
            })
        }).toThrow("Repo id cannot be empty")
    })

    test("throws when rule id is missing", () => {
        expect(() => {
            void new Team(UniqueId.create(), {
                name: "Bad rule",
                organizationId: UniqueId.create("org-13"),
                memberIds: [],
                repoIds: [],
                ruleIds: [undefined as unknown as UniqueId],
                disabledRuleUuids: [],
            })
        }).toThrow("Rule id cannot be empty")
    })
})

/**
 * Builds team props for tests.
 *
 * @param overrides Override map for default fields.
 * @returns Team props with normalized collections.
 */
function createTeamProps(overrides: {
    name: string
    organizationId: string
    memberIds: readonly string[]
    repoIds: readonly string[]
    ruleIds: readonly string[]
    disabledRuleUuids: readonly string[]
}): ITeamProps {
    return {
        name: overrides.name,
        organizationId: UniqueId.create(overrides.organizationId),
        memberIds: overrides.memberIds.map((id) => UniqueId.create(id)),
        repoIds: overrides.repoIds.map((id) => RepositoryId.parse(id)),
        ruleIds: overrides.ruleIds.map((id) => UniqueId.create(id)),
        disabledRuleUuids: overrides.disabledRuleUuids.map((id) => UniqueId.create(id)),
    }
}
