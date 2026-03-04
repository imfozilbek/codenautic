import {describe, expect, test} from "bun:test"

import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {FEEDBACK_TYPE} from "../../../src/domain/events/feedback-received"
import type {
    IFeedbackRecord,
    IFeedbackRepository,
} from "../../../src/application/ports/outbound/feedback-repository.port"
import {
    LearnTeamPatternsUseCase,
    type ILearnTeamPatternsInput,
} from "../../../src/application/use-cases/learn-team-patterns.use-case"

class InMemoryFeedbackRepository implements IFeedbackRepository {
    private readonly records: readonly IFeedbackRecord[]

    public constructor(records: readonly IFeedbackRecord[]) {
        this.records = records
    }

    public save(_feedback: IFeedbackRecord): Promise<void> {
        return Promise.resolve()
    }

    public saveMany(_feedbacks: readonly IFeedbackRecord[]): Promise<void> {
        return Promise.resolve()
    }

    public findByReviewId(criteria: {readonly reviewId: string}): Promise<readonly IFeedbackRecord[]> {
        return Promise.resolve(
            this.records.filter((record): boolean => record.reviewId === criteria.reviewId),
        )
    }

    public findByIssueId(criteria: {readonly issueId: string}): Promise<readonly IFeedbackRecord[]> {
        return Promise.resolve(
            this.records.filter((record): boolean => record.issueId === criteria.issueId),
        )
    }

    public aggregateByType(criteria: {readonly reviewId: string}): Promise<Record<string, number>> {
        const result: Record<string, number> = {}
        for (const record of this.records) {
            if (record.reviewId !== criteria.reviewId || record.ruleId === undefined) {
                continue
            }

            const current = result[record.type] ?? 0
            result[record.type] = current + 1
        }

        return Promise.resolve(result)
    }

    public findByFilter(criteria?: {
        readonly ruleIds?: readonly string[]
        readonly teamIds?: readonly string[]
    }): Promise<readonly IFeedbackRecord[]> {
        const ruleIds = new Set(criteria?.ruleIds ?? [])
        const teamIds = new Set(criteria?.teamIds ?? [])
        const hasRuleFilter = ruleIds.size > 0
        const hasTeamFilter = teamIds.size > 0

        if (hasRuleFilter === false && hasTeamFilter === false) {
            return Promise.resolve(this.records)
        }

        const filtered = this.records.filter((record): boolean => {
            const ruleMatch = hasRuleFilter === false || (record.ruleId !== undefined && ruleIds.has(record.ruleId))
            const teamMatch = hasTeamFilter === false || (record.teamId !== undefined && teamIds.has(record.teamId))
            return ruleMatch && teamMatch
        })

        return Promise.resolve(filtered)
    }

    public countByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(
            this.records.filter((record): boolean => record.ruleId === ruleId).length,
        )
    }

    public countFalsePositiveByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(
            this.records.filter(
                (record): boolean => record.ruleId === ruleId && record.type === FEEDBACK_TYPE.FALSE_POSITIVE,
            ).length,
        )
    }
}

const reviewerId = UniqueId.create("reviewer-1")
const teamAlpha = "team-alpha"
const teamBeta = "team-beta"
const learnTeamDefaults = {
    minSampleSize: 5,
    minConfidence: 0.35,
    minWeightDelta: 0.1,
    maxAdjustments: 20,
}

const baseTime = new Date("2025-02-10T00:00:00.000Z")

const feedback: IFeedbackRecord[] = [
    ...Array.from({length: 8}, () => ({
        issueId: "issue-a",
        reviewId: "review-a",
        ruleId: "rule-a",
        teamId: teamAlpha,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId: reviewerId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 2}, () => ({
        issueId: "issue-a-fp",
        reviewId: "review-a",
        ruleId: "rule-a",
        teamId: teamAlpha,
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId: reviewerId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 1}, () => ({
        issueId: "issue-b",
        reviewId: "review-b",
        ruleId: "rule-b",
        teamId: teamAlpha,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId: reviewerId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 6}, () => ({
        issueId: "issue-b-fp",
        reviewId: "review-b",
        ruleId: "rule-b",
        teamId: teamAlpha,
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId: reviewerId,
        createdAt: baseTime,
    })),
    ...Array.from({length: 10}, () => ({
        issueId: "issue-c",
        reviewId: "review-c",
        ruleId: "rule-c",
        teamId: teamBeta,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId: reviewerId,
        createdAt: baseTime,
    })),
]

describe("LearnTeamPatternsUseCase", () => {
    test("learns team patterns and emits suggestion adjustments", async () => {
        const useCase = new LearnTeamPatternsUseCase({
            feedbackRepository: new InMemoryFeedbackRepository(feedback),
            defaults: learnTeamDefaults,
        })
        const result = await useCase.execute({
            teamId: teamAlpha,
            minSampleSize: 5,
            minConfidence: 0.5,
            minWeightDelta: 0.1,
            maxAdjustments: 10,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.teamId).toBe(teamAlpha)
        expect(result.value.processedFeedbackCount).toBe(17)
        expect(result.value.adjustments).toHaveLength(2)

        const first = result.value.adjustments.at(0)
        const second = result.value.adjustments.at(1)

        if (first === undefined || second === undefined) {
            throw new Error("Expected two adjustments")
        }

        expect(first.ruleId).toBe("rule-b")
        expect(first.samples).toBe(7)
        expect(first.confidence).toBe(1)
        expect(first.weightDelta).toBeLessThan(0)
        expect(first.falsePositiveRate).toBeCloseTo(0.8571428571428571)
        expect(first.helpfulRate).toBeCloseTo(0.14285714285714285)

        expect(second.ruleId).toBe("rule-a")
        expect(second.samples).toBe(10)
        expect(second.confidence).toBe(1)
        expect(second.weightDelta).toBeGreaterThan(0)
        expect(second.falsePositiveRate).toBe(0.2)
        expect(second.helpfulRate).toBe(0.8)
    })

    test("filters by rule ids", async () => {
        const useCase = new LearnTeamPatternsUseCase({
            feedbackRepository: new InMemoryFeedbackRepository(feedback),
            defaults: learnTeamDefaults,
        })
        const result = await useCase.execute({
            teamId: teamAlpha,
            ruleIds: ["rule-b"],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.adjustments).toHaveLength(1)
        expect(result.value.adjustments.at(0)?.ruleId).toBe("rule-b")
    })

    test("returns empty when team has weak evidence", async () => {
        const useCase = new LearnTeamPatternsUseCase({
            feedbackRepository: new InMemoryFeedbackRepository(feedback),
            defaults: learnTeamDefaults,
        })
        const result = await useCase.execute({
            teamId: teamAlpha,
            minSampleSize: 20,
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value.adjustments).toEqual([])
    })

    test("returns validation error for missing teamId", async () => {
        const useCase = new LearnTeamPatternsUseCase({
            feedbackRepository: new InMemoryFeedbackRepository(feedback),
            defaults: learnTeamDefaults,
        })
        const result = await useCase.execute({
            teamId: "",
        } as ILearnTeamPatternsInput)

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "teamId",
                message: "teamId must be a non-empty string",
            },
        ])
    })

    test("returns validation error for invalid thresholds", async () => {
        const useCase = new LearnTeamPatternsUseCase({
            feedbackRepository: new InMemoryFeedbackRepository(feedback),
            defaults: learnTeamDefaults,
        })
        const result = await useCase.execute({
            teamId: teamAlpha,
            minWeightDelta: 2,
            maxAdjustments: -3,
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "minWeightDelta",
                message: "minWeightDelta must be a number between 0 and 1",
            },
            {
                field: "maxAdjustments",
                message: "maxAdjustments must be a positive integer",
            },
        ])
    })
})
