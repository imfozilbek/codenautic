import {describe, expect, test} from "bun:test"

import {Expert} from "../../../../src/domain/value-objects/prompt/expert"

describe("Expert", () => {
    test("creates expert with normalized fields", () => {
        const expert = Expert.create({
            name: "  Alice  ",
            role: "  Security Reviewer  ",
            responsibilities: [" Find vulnerabilities ", " Validate auth "],
            priority: 1,
        })

        expect(expert.name).toBe("Alice")
        expect(expert.role).toBe("Security Reviewer")
        expect(expert.responsibilities).toEqual([
            "Find vulnerabilities",
            "Validate auth",
        ])
        expect(expert.priority).toBe(1)
    })

    test("returns immutable responsibilities snapshot", () => {
        const expert = Expert.create({
            name: "Bob",
            role: "Logic Checker",
            responsibilities: ["Check consistency"],
            priority: 2,
        })

        const snapshot = [...expert.responsibilities]
        snapshot.push("Unexpected")

        expect(expert.responsibilities).toEqual(["Check consistency"])
    })

    test("throws when name is empty", () => {
        expect(() => {
            Expert.create({
                name: "   ",
                role: "Security Reviewer",
                responsibilities: ["Find vulnerabilities"],
                priority: 1,
            })
        }).toThrow("Expert name cannot be empty")
    })

    test("throws when role is empty", () => {
        expect(() => {
            Expert.create({
                name: "Alice",
                role: "   ",
                responsibilities: ["Find vulnerabilities"],
                priority: 1,
            })
        }).toThrow("Expert role cannot be empty")
    })

    test("throws when responsibility is empty", () => {
        expect(() => {
            Expert.create({
                name: "Alice",
                role: "Security Reviewer",
                responsibilities: ["  "],
                priority: 1,
            })
        }).toThrow("Expert responsibility cannot be empty")
    })

    test("throws when priority is negative", () => {
        expect(() => {
            Expert.create({
                name: "Alice",
                role: "Security Reviewer",
                responsibilities: ["Find vulnerabilities"],
                priority: -1,
            })
        }).toThrow("Expert priority must be greater than or equal to 0")
    })

    test("throws when priority is not finite", () => {
        expect(() => {
            Expert.create({
                name: "Alice",
                role: "Security Reviewer",
                responsibilities: ["Find vulnerabilities"],
                priority: Number.POSITIVE_INFINITY,
            })
        }).toThrow("Expert priority must be a finite number")
    })

    test("formats expert for prompt injection", () => {
        const expert = Expert.create({
            name: "Alice",
            role: "Security Reviewer",
            responsibilities: ["Find vulnerabilities", "Validate auth"],
            priority: 1,
        })

        expect(expert.formatForPrompt()).toBe(
            [
                "Name: Alice",
                "Role: Security Reviewer",
                "Responsibilities:",
                "- Find vulnerabilities",
                "- Validate auth",
                "Priority: 1",
            ].join("\n"),
        )
    })

    test("formats empty responsibilities explicitly", () => {
        const expert = Expert.create({
            name: "Diana",
            role: "Referee",
            responsibilities: [],
            priority: 5,
        })

        expect(expert.formatForPrompt()).toBe(
            [
                "Name: Diana",
                "Role: Referee",
                "Responsibilities:",
                "- none",
                "Priority: 5",
            ].join("\n"),
        )
    })
})
