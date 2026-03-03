import {describe, expect, test} from "bun:test"

import {FEEDBACK_TYPE} from "../../../src/domain/events/feedback-received"
import {SEVERITY_LEVEL} from "../../../src/domain/value-objects/severity.value-object"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import type {
    IFeedbackRecord,
    IFeedbackRepository,
} from "../../../src/application/ports/outbound/feedback-repository.port"
import {
    AnalyzeFeedbackUseCase,
    type IAnalyzeFeedbackInput,
} from "../../../src/application/use-cases/analyze-feedback.use-case"

class InMemoryFeedbackRepository implements IFeedbackRepository {
    private readonly records: readonly IFeedbackRecord[]

    public constructor(records: readonly IFeedbackRecord[]) {
        this.records = records
    }

    public findByFilter(criteria?: {
        readonly ruleIds?: readonly string[]
        readonly teamIds?: readonly string[]
        readonly severities?: readonly string[]
    }): Promise<readonly IFeedbackRecord[]> {
        const result: IFeedbackRecord[] = []

        for (const record of this.records) {
            if (this.matchesCriteria(record, criteria) === true) {
                result.push(record)
            }
        }

        return Promise.resolve(result)
    }

    private matchesCriteria(
        record: IFeedbackRecord,
        criteria?: {
            readonly ruleIds?: readonly string[]
            readonly teamIds?: readonly string[]
            readonly severities?: readonly string[]
        },
    ): boolean {
        if (this.matchesList(criteria?.ruleIds, record.ruleId) === false) {
            return false
        }

        if (this.matchesList(criteria?.teamIds, record.teamId ?? "") === false) {
            return false
        }

        if (this.matchesList(criteria?.severities, record.severity ?? "") === false) {
            return false
        }

        return true
    }

    private matchesList(values: readonly string[] | undefined, value: string): boolean {
        if (values === undefined || values.length === 0) {
            return true
        }

        return values.includes(value)
    }

    public countByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(this.records.filter((record): boolean => {
            return record.ruleId === ruleId
        }).length)
    }

    public countFalsePositiveByRuleId(ruleId: string): Promise<number> {
        return Promise.resolve(this.records.filter((record): boolean => {
            return record.ruleId === ruleId && record.type === FEEDBACK_TYPE.FALSE_POSITIVE
        }).length)
    }
}

const userId = UniqueId.create("user-1")

const records: IFeedbackRecord[] = [
    {
        issueId: "issue-1",
        reviewId: "review-1",
        ruleId: "rule-b",
        teamId: "team-1",
        severity: SEVERITY_LEVEL.INFO,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: new Date(),
    },
    {
        issueId: "issue-2",
        reviewId: "review-1",
        ruleId: "rule-b",
        teamId: "team-1",
        severity: SEVERITY_LEVEL.LOW,
        type: FEEDBACK_TYPE.FALSE_POSITIVE,
        userId,
        createdAt: new Date(),
    },
    {
        issueId: "issue-3",
        reviewId: "review-1",
        ruleId: "rule-a",
        teamId: "team-2",
        severity: SEVERITY_LEVEL.HIGH,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: new Date(),
    },
    {
        issueId: "issue-4",
        reviewId: "review-1",
        ruleId: "rule-a",
        teamId: "team-1",
        severity: SEVERITY_LEVEL.HIGH,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: new Date(),
    },
    {
        issueId: "issue-5",
        reviewId: "review-1",
        ruleId: "rule-a",
        teamId: "team-3",
        severity: SEVERITY_LEVEL.HIGH,
        type: FEEDBACK_TYPE.REJECTED,
        userId,
        createdAt: new Date(),
    },
    {
        issueId: "issue-6",
        reviewId: "review-1",
        ruleId: "   ",
        teamId: "team-1",
        severity: SEVERITY_LEVEL.INFO,
        type: FEEDBACK_TYPE.ACCEPTED,
        userId,
        createdAt: new Date(),
    },
]

describe("AnalyzeFeedbackUseCase", () => {
    test("calculates helpful and false-positive rates by rule", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)

        const result = await useCase.execute({})

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                falsePositiveRate: 0,
                helpfulRate: 2 / 3,
                ruleId: "rule-a",
                total: 3,
            },
            {
                falsePositiveRate: 1 / 2,
                helpfulRate: 1 / 2,
                ruleId: "rule-b",
                total: 2,
            },
        ])
    })

    test("applies rule and team filters", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)
        const result = await useCase.execute({
            ruleIds: ["rule-a"],
            teamIds: ["team-2", "team-1"],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                falsePositiveRate: 0,
                helpfulRate: 1,
                ruleId: "rule-a",
                total: 2,
            },
        ])
    })

    test("applies severity filter and deduplicates normalized values", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)
        const result = await useCase.execute({
            severities: ["high", "HIGH", "High"],
        })

        if (result.isFail) {
            throw new Error("Expected success")
        }

        expect(result.value).toEqual([
            {
                falsePositiveRate: 0,
                helpfulRate: 2 / 3,
                ruleId: "rule-a",
                total: 3,
            },
        ])
    })

    test("returns validation error for invalid array filters", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)
        const result = await useCase.execute({
            ruleIds: [""],
        })

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

    test("returns validation error for invalid severity values", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)
        const result = await useCase.execute({
            severities: ["invalid"],
        })

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "severities",
                message: "severities must contain known Severity values",
            },
        ])
    })

    test("returns validation error for non-object input", async () => {
        const repository = new InMemoryFeedbackRepository(records)
        const useCase = new AnalyzeFeedbackUseCase(repository)
        const result = await useCase.execute(null as unknown as IAnalyzeFeedbackInput)

        if (result.isOk) {
            throw new Error("Expected validation error")
        }

        expect(result.error.code).toBe("VALIDATION_ERROR")
        expect(result.error.fields).toEqual([
            {
                field: "input",
                message: "must be an object",
            },
        ])
    })
})
