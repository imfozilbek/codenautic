import {describe, expect, test} from "bun:test"

import {TokenUsageRecord} from "../../../src/domain/value-objects/token-usage-record.value-object"

describe("TokenUsageRecord", () => {
    test("creates normalized record and exposes immutable fields", () => {
        const recordedAt = new Date("2026-03-01T10:00:00.000Z")
        const record = TokenUsageRecord.create({
            model: "gpt-4o-mini",
            provider: "openai",
            input: 100,
            output: 200,
            outputReasoning: 50,
            total: 350,
            organizationId: "org-1",
            teamId: "team-1",
            developerId: "dev-1",
            ccrNumber: "33",
            byok: true,
            recordedAt,
        })

        expect(record.model).toBe("gpt-4o-mini")
        expect(record.provider).toBe("openai")
        expect(record.input).toBe(100)
        expect(record.output).toBe(200)
        expect(record.outputReasoning).toBe(50)
        expect(record.total).toBe(350)
        expect(record.total).toBe(350)
        expect(record.organizationId.value).toBe("org-1")
        expect(record.teamId.value).toBe("team-1")
        expect(record.developerId?.value).toBe("dev-1")
        expect(record.ccrNumber).toBe("33")
        expect(record.byok).toBe(true)
        expect(record.recordedAt.getTime()).toBe(recordedAt.getTime())
    })

    test("throws when total does not match components", () => {
        expect(() => {
            TokenUsageRecord.create({
                model: "gpt-4o",
                provider: "openai",
                input: 10,
                output: 10,
                outputReasoning: 10,
                total: 20,
                organizationId: "org-2",
                teamId: "team-2",
                byok: false,
                recordedAt: new Date("2026-03-01T10:00:00.000Z"),
            })
        }).toThrow("total must be equal input + output + outputReasoning")
    })

    test("throws for invalid byok", () => {
        expect(() => {
            TokenUsageRecord.create({
                model: "gpt-4o",
                provider: "openai",
                input: 10,
                output: 10,
                outputReasoning: 10,
                total: 30,
                organizationId: "org-3",
                teamId: "team-3",
                byok: 1 as unknown as boolean,
                recordedAt: new Date("2026-03-01T10:00:00.000Z"),
            })
        }).toThrow("byok must be boolean")
    })
})
