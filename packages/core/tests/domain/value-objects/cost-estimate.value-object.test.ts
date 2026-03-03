import {describe, expect, test} from "bun:test"

import {
    CostEstimate,
} from "../../../src/domain/value-objects/cost-estimate.value-object"
import {TokenUsageRecord} from "../../../src/domain/value-objects/token-usage-record.value-object"

describe("CostEstimate", () => {
    test("calculates aggregated cost by model and total", () => {
        const records = [
            TokenUsageRecord.create({
                model: "gpt-4o-mini",
                provider: "openai",
                input: 1000,
                output: 500,
                outputReasoning: 500,
                total: 2000,
                organizationId: "org-1",
                teamId: "team-1",
                byok: false,
                recordedAt: new Date("2026-03-01T10:00:00.000Z"),
            }),
            TokenUsageRecord.create({
                model: "gpt-4o",
                provider: "openai",
                input: 1000,
                output: 1000,
                outputReasoning: 0,
                total: 2000,
                organizationId: "org-1",
                teamId: "team-1",
                byok: false,
                recordedAt: new Date("2026-03-01T10:00:01.000Z"),
            }),
        ]

        const estimate = CostEstimate.calculate(records, {
            currency: "USD",
            defaultInputPerThousand: 0.001,
            defaultOutputPerThousand: 0.002,
            defaultOutputReasoningPerThousand: 0.003,
            byModel: [
                {
                    model: "gpt-4o",
                    inputPerThousand: 0.002,
                    outputPerThousand: 0.004,
                    outputReasoningPerThousand: 0.005,
                },
            ],
        })

        expect(estimate.currency).toBe("USD")
        expect(estimate.byModel).toHaveLength(2)

        const firstRecord = estimate.byModel.find(
            (entry): boolean => entry.model === "gpt-4o-mini",
        )
        const secondRecord = estimate.byModel.find(
            (entry): boolean => entry.model === "gpt-4o",
        )

        expect(firstRecord?.tokens).toBe(2000)
        expect(firstRecord?.cost).toBe(0.0035)
        expect(secondRecord?.tokens).toBe(2000)
        expect(secondRecord?.cost).toBe(0.006)
        expect(estimate.totalCost).toBe(0.0095)
    })

    test("returns zero estimate for empty usage", () => {
        const estimate = CostEstimate.calculate([], {
            currency: "USD",
            defaultInputPerThousand: 1,
            defaultOutputPerThousand: 1,
            defaultOutputReasoningPerThousand: 1,
        })

        expect(estimate.totalCost).toBe(0)
        expect(estimate.byModel).toEqual([])
    })

    test("throws for invalid pricing", () => {
        expect(() => {
            CostEstimate.calculate([], {
                currency: "",
                defaultInputPerThousand: -1,
                defaultOutputPerThousand: 1,
                defaultOutputReasoningPerThousand: 1,
            })
        }).toThrow("pricing.currency cannot be empty")
    })
})
