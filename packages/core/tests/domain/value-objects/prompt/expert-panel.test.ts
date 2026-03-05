import {describe, expect, test} from "bun:test"

import {Expert} from "../../../../src/domain/value-objects/prompt/expert"
import {ExpertPanel} from "../../../../src/domain/value-objects/prompt/expert-panel"

function createExpert(params: {
    readonly name: string
    readonly role: string
    readonly responsibilities: readonly string[]
    readonly priority: number
}): Expert {
    return Expert.create({
        name: params.name,
        role: params.role,
        responsibilities: params.responsibilities,
        priority: params.priority,
    })
}

describe("ExpertPanel", () => {
    test("creates panel and exposes size", () => {
        const panel = ExpertPanel.create([
            createExpert({
                name: "Trinity",
                role: "Syntax",
                responsibilities: ["Check syntax"],
                priority: 2,
            }),
            createExpert({
                name: "Morpheus",
                role: "Logic",
                responsibilities: ["Check logic"],
                priority: 1,
            }),
        ])

        expect(panel.size).toBe(2)
        expect(panel.experts).toHaveLength(2)
    })

    test("returns immutable experts snapshot", () => {
        const panel = ExpertPanel.create([
            createExpert({
                name: "Trinity",
                role: "Syntax",
                responsibilities: ["Check syntax"],
                priority: 2,
            }),
        ])

        const snapshot = [...panel.experts]
        snapshot.push(
            createExpert({
                name: "Injected",
                role: "Fake",
                responsibilities: ["Unexpected"],
                priority: 99,
            }),
        )

        expect(panel.size).toBe(1)
        expect(panel.experts[0]?.name).toBe("Trinity")
    })

    test("formats experts sorted by priority then name", () => {
        const panel = ExpertPanel.create([
            createExpert({
                name: "Niobe",
                role: "Referee",
                responsibilities: ["Resolve conflicts"],
                priority: 3,
            }),
            createExpert({
                name: "Morpheus",
                role: "Logic",
                responsibilities: ["Check logic"],
                priority: 1,
            }),
            createExpert({
                name: "Trinity",
                role: "Syntax",
                responsibilities: ["Check syntax"],
                priority: 1,
            }),
        ])

        expect(panel.formatForPrompt()).toBe(
            [
                "Expert 1:",
                "Name: Morpheus",
                "Role: Logic",
                "Responsibilities:",
                "- Check logic",
                "Priority: 1",
                "",
                "Expert 2:",
                "Name: Trinity",
                "Role: Syntax",
                "Responsibilities:",
                "- Check syntax",
                "Priority: 1",
                "",
                "Expert 3:",
                "Name: Niobe",
                "Role: Referee",
                "Responsibilities:",
                "- Resolve conflicts",
                "Priority: 3",
            ].join("\n"),
        )
    })

    test("formats empty panel explicitly", () => {
        const panel = ExpertPanel.create([])

        expect(panel.size).toBe(0)
        expect(panel.formatForPrompt()).toBe("Experts:\n- none")
    })

    test("throws when experts list is not an array", () => {
        expect(() => {
            ExpertPanel.create("invalid" as unknown as Expert[])
        }).toThrow("ExpertPanel experts must be an array")
    })

    test("throws when experts list contains non-expert value", () => {
        expect(() => {
            ExpertPanel.create([
                createExpert({
                    name: "Trinity",
                    role: "Syntax",
                    responsibilities: ["Check syntax"],
                    priority: 1,
                }),
                "bad-value" as unknown as Expert,
            ])
        }).toThrow("ExpertPanel experts must contain Expert value objects")
    })

    test("serializes to plain object", () => {
        const panel = ExpertPanel.create([
            createExpert({
                name: "Trinity",
                role: "Syntax",
                responsibilities: ["Check syntax"],
                priority: 1,
            }),
        ])

        expect(panel.toJSON()).toEqual({
            experts: [
                {
                    name: "Trinity",
                    role: "Syntax",
                    responsibilities: ["Check syntax"],
                    priority: 1,
                },
            ],
        })
    })
})
