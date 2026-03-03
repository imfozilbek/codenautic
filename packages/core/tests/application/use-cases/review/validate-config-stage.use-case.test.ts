import {describe, expect, test} from "bun:test"

import type {IUseCase} from "../../../../src/application/ports/inbound/use-case.port"
import type {ValidatedConfig} from "../../../../src/application/dto/review/review-config.dto"
import {ValidationError} from "../../../../src/domain/errors/validation.error"
import {Result} from "../../../../src/shared/result"
import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"
import {
    ValidateConfigStageUseCase,
} from "../../../../src/application/use-cases/review/validate-config-stage.use-case"

/**
 * Creates baseline state for validate-config stage tests.
 *
 * @param config Config payload.
 * @returns Pipeline state.
 */
function createState(config: Readonly<Record<string, unknown>>): ReviewPipelineState {
    return ReviewPipelineState.create({
        runId: "run-validate-config",
        definitionVersion: "v1",
        mergeRequest: {},
        config,
    })
}

describe("ValidateConfigStageUseCase", () => {
    test("normalizes valid config payload", async () => {
        const useCase = new ValidateConfigStageUseCase()
        const state = createState({
            severityThreshold: "high",
            ignorePaths: [" src/generated/** ", "dist/**"],
            maxSuggestionsPerFile: 7,
            maxSuggestionsPerCCR: 25,
            cadence: " balanced ",
            customRuleIds: [" rule-1 ", "rule-2"],
            promptOverrides: {
                systemPrompt: " system ",
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isOk).toBe(true)
        expect(result.value.metadata?.checkpointHint).toBe("config:validated")
        expect(result.value.state.config).toEqual({
            severityThreshold: "HIGH",
            ignorePaths: ["src/generated/**", "dist/**"],
            maxSuggestionsPerFile: 7,
            maxSuggestionsPerCCR: 25,
            cadence: "balanced",
            customRuleIds: ["rule-1", "rule-2"],
            reviewDepthStrategy: "auto",
            directories: [],
            promptOverrides: {
                systemPrompt: "system",
            },
        })
    })

    test("fails with validation error when required fields are invalid", async () => {
        const useCase = new ValidateConfigStageUseCase()
        const state = createState({
            severityThreshold: "warning",
            ignorePaths: "dist/**",
            maxSuggestionsPerFile: 0,
            maxSuggestionsPerCCR: -1,
            cadence: "",
            customRuleIds: [""],
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.originalError?.name).toBe("ValidationError")
        expect(result.error.message).toContain("invalid")
    })

    test("fails when prompt overrides shape is invalid", async () => {
        const useCase = new ValidateConfigStageUseCase()
        const state = createState({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 2,
            maxSuggestionsPerCCR: 10,
            cadence: "standard",
            customRuleIds: [],
            promptOverrides: {
                summaryPrompt: "",
            },
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.originalError?.name).toBe("ValidationError")
    })

    test("uses injected validator result as error source", async () => {
        const validator: IUseCase<unknown, ValidatedConfig, ValidationError> = {
            execute: () => {
                return Promise.resolve(
                    Result.fail<ValidatedConfig, ValidationError>(
                        new ValidationError("custom invalid config", [
                            {
                                field: "severityThreshold",
                                message: "must be one of LOW | MEDIUM | HIGH | CRITICAL",
                            },
                        ]),
                    ),
                )
            },
        }

        const useCase = new ValidateConfigStageUseCase(validator)
        const state = createState({
            severityThreshold: "LOW",
            ignorePaths: [],
            maxSuggestionsPerFile: 2,
            maxSuggestionsPerCCR: 10,
            cadence: "standard",
            customRuleIds: [],
        })

        const result = await useCase.execute({
            state,
        })

        expect(result.isFail).toBe(true)
        expect(result.error.message).toBe("Resolved review config is invalid")
        expect(result.error.originalError?.message).toBe("custom invalid config")
    })
})
