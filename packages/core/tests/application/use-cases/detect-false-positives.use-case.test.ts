import {describe, expect, test} from "bun:test"

import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {FEEDBACK_TYPE} from "../../../src/domain/events/feedback-received"
import type {IFeedbackRecord, IFeedbackRepository} from "../../../src/application/ports/outbound/feedback-repository.port"
import {
    DetectFalsePositivesUseCase,
    type IDetectFalsePositivesInput,
} from "../../../src/application/use-cases/detect-false-positives.use-case"

class InMemoryFeedbackRepository implements IFeedbackRepository {
    private readonly records: readonly IFeedbackRecord[]

    public constructor(records: readonly IFeedbackRecord[]) {
        this.records = records
    }

    public findByFilter(criteria?: {
        readonly ruleIds?: readonly string[]
    }): Promise<readonly IFeedbackRecord[]> {
        const ruleIds = criteria?.ruleIds ?? []
        if (ruleIds.length === 0) {
            return Promise.resolve(this.records)
        }

        const filtered = this.records.filter((record): boolean => {
            return ruleIds.includes(record.ruleId)
        })

        return Promise.resolve(filtered)
    }

    public countByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(this.records.filter((record): boolean => record.ruleId === ruleId).length)
    }

    public countFalsePositiveByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(
            this.records.filter((record): boolean => {
                return record.ruleId === ruleId && record.type === FEEDBACK_TYPE.FALSE_POSITIVE
            }).length,
        )
    }
}

const userId = UniqueId.create("user-1")
const baseTime = new Date("2025-02-10T00:00:00.000Z")

const feedback: IFeedbackRecord[] = [
    ...Array.from({length: 12}, () => ({
        issueId: "issue-b",
        reviewId: "review-1",
        ruleId: "rule-b",
        teamId: "team-x",
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 3}, () => ({
        issueId: "issue-b-acc",
        reviewId: "review-1",
        ruleId: "rule-b",
        teamId: "team-x",
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 4}, () => ({
        issueId: "issue-a",
        reviewId: "review-1",
        ruleId: "rule-a",
        teamId: "team-y",
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 1}, () => ({
        issueId: "issue-a-acc",
        reviewId: "review-1",
        ruleId: "rule-a",
        teamId: "team-y",
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: baseTime,
    })),
    {
        issueId: "issue-c",
        reviewId: "review-1",
        ruleId: "   ",
        teamId: "team-z",
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId,
        createdAt: baseTime,
    },
    {
        issueId: "issue-d",
        reviewId: "review-1",
        ruleId: "rule-d",
        type: FEEDBACK_TYPE.REJECTED,
        userId,
        createdAt: baseTime,
    },
]

describe("DetectFalsePositivesUseCase", () => {
    test("detects high false-positive rules and resolves recommendations", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({})

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toHaveLength(2)
        const ruleB = result.value.find((entry) => entry.ruleId === "rule-b")
        const ruleA = result.value.find((entry) => entry.ruleId === "rule-a")
        if (ruleB === undefined || ruleA === undefined) {
            throw new Error("Expected two results")
        }

        expect(ruleB).toMatchObject({
            ruleId: "rule-b",
            recommendation: "DEACTIVATE_RULE",
        })
        expect(ruleB.rate).toBeCloseTo(0.8, 10)
        expect(ruleA).toMatchObject({
            ruleId: "rule-a",
            recommendation: "MONITOR",
        })
        expect(ruleA.rate).toBeCloseTo(0.8, 10)
    })

    test("applies rule filter and custom thresholds", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({
            ruleIds: ["rule-a"],
            threshold: 0.2,
            deactivateThreshold: 0.7,
            minSampleSize: 1,
            minDeactivateSampleSize: 2,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toHaveLength(1)
        const ruleA = result.value.at(0)
        if (ruleA === undefined) {
            throw new Error("Expected one result")
        }

        expect(ruleA).toMatchObject({
            ruleId: "rule-a",
            recommendation: "DEACTIVATE_RULE",
        })
        expect(ruleA.rate).toBeCloseTo(0.8, 10)
    })

    test("returns validation error for invalid numeric config", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({
            threshold: 1.5,
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "threshold",
                message: "threshold must be a number between 0 and 1",
            },
        ])
    })

    test("returns validation error for invalid ruleIds", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({
            ruleIds: ["rule-a", ""],
            threshold: 0.1,
        } as IDetectFalsePositivesInput)

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "ruleIds",
                message: "ruleIds must be an array of non-empty strings",
            },
        ])
    })

    test("returns validation error for invalid sample constraints", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({
            minSampleSize: 0,
            minDeactivateSampleSize: 2,
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "minSampleSize",
                message: "minSampleSize must be a positive integer",
            },
        ])
    })

    test("returns empty result when there is not enough evidence", async () => {
        const useCase = new DetectFalsePositivesUseCase(new InMemoryFeedbackRepository(feedback))
        const result = await useCase.execute({
            threshold: 0.1,
            minSampleSize: 20,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([])
    })
})
