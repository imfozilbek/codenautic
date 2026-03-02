import {describe, expect, test} from "bun:test"

import {ReviewPipelineState} from "../../../../src/application/types/review/review-pipeline-state"

describe("ReviewPipelineState", () => {
    test("creates immutable state and applies with updates without mutation", () => {
        const initialState = ReviewPipelineState.create({
            runId: "run-1",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-1"},
            config: {severityThreshold: "high"},
            files: [{path: "a.ts"}],
            suggestions: [{id: "s-1"}],
        })

        const updatedState = initialState.with({
            currentStageId: "stage-1",
            suggestions: [{id: "s-1"}, {id: "s-2"}],
        })

        expect(initialState.currentStageId).toBeNull()
        expect(updatedState.currentStageId).toBe("stage-1")
        expect(initialState.suggestions).toHaveLength(1)
        expect(updatedState.suggestions).toHaveLength(2)
    })

    test("increments attempts and reports progress", () => {
        const state = ReviewPipelineState.create({
            runId: "run-2",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-2"},
            config: {},
        })

        const incremented = state.incrementStageAttempt("stage-a")

        expect(state.getStageAttempt("stage-a")).toBe(0)
        expect(incremented.getStageAttempt("stage-a")).toBe(1)
        expect(incremented.hasProgress).toBe(true)
    })

    test("throws when run id or definition version are invalid", () => {
        expect(() => {
            ReviewPipelineState.create({
                runId: " ",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
            })
        }).toThrow("runId must be a non-empty string")

        expect(() => {
            ReviewPipelineState.create({
                runId: "run-3",
                definitionVersion: "",
                mergeRequest: {},
                config: {},
            })
        }).toThrow("definitionVersion must be a non-empty string")
    })

    test("returns full snapshot and defensive copies for collections", () => {
        const state = ReviewPipelineState.create({
            runId: "run-4",
            definitionVersion: "v2",
            mergeRequest: {id: "mr-4"},
            config: {severityThreshold: "critical"},
            files: [{path: "src/a.ts"}],
            suggestions: [{id: "s-1"}],
            discardedSuggestions: [{id: "d-1"}],
            metrics: {durationMs: 12},
            checkId: "check-1",
            commentId: "comment-1",
            externalContext: {repositoryId: "repo-1"},
            currentStageId: "stage-b",
            lastCompletedStageId: "stage-a",
            stageAttempts: {"stage-a": 2},
        })

        expect(state.runId).toBe("run-4")
        expect(state.definitionVersion).toBe("v2")
        expect(state.mergeRequest).toEqual({id: "mr-4"})
        expect(state.config).toEqual({severityThreshold: "critical"})
        expect(state.metrics).toEqual({durationMs: 12})
        expect(state.checkId).toBe("check-1")
        expect(state.commentId).toBe("comment-1")
        expect(state.externalContext).toEqual({repositoryId: "repo-1"})
        expect(state.currentStageId).toBe("stage-b")
        expect(state.lastCompletedStageId).toBe("stage-a")
        expect(state.stageAttempts).toEqual({"stage-a": 2})

        const files = state.files as {path: string}[]
        const suggestions = state.suggestions as {id: string}[]
        const discardedSuggestions = state.discardedSuggestions as {id: string}[]
        const attempts = state.stageAttempts as Record<string, number>
        files.push({path: "src/b.ts"})
        suggestions.push({id: "s-2"})
        discardedSuggestions.push({id: "d-2"})
        attempts["stage-a"] = 10

        expect(state.files).toEqual([{path: "src/a.ts"}])
        expect(state.suggestions).toEqual([{id: "s-1"}])
        expect(state.discardedSuggestions).toEqual([{id: "d-1"}])
        expect(state.stageAttempts).toEqual({"stage-a": 2})

        expect(state.toSnapshot()).toEqual({
            runId: "run-4",
            definitionVersion: "v2",
            mergeRequest: {id: "mr-4"},
            config: {severityThreshold: "critical"},
            files: [{path: "src/a.ts"}],
            suggestions: [{id: "s-1"}],
            discardedSuggestions: [{id: "d-1"}],
            metrics: {durationMs: 12},
            checkId: "check-1",
            commentId: "comment-1",
            externalContext: {repositoryId: "repo-1"},
            currentStageId: "stage-b",
            lastCompletedStageId: "stage-a",
            stageAttempts: {"stage-a": 2},
        })
    })

    test("applies optional defaults and reports no progress for new run", () => {
        const state = ReviewPipelineState.create({
            runId: "run-5",
            definitionVersion: "v1",
            mergeRequest: {id: "mr-5"},
            config: {},
        })

        expect(state.files).toEqual([])
        expect(state.suggestions).toEqual([])
        expect(state.discardedSuggestions).toEqual([])
        expect(state.metrics).toBeNull()
        expect(state.checkId).toBeNull()
        expect(state.commentId).toBeNull()
        expect(state.externalContext).toBeNull()
        expect(state.currentStageId).toBeNull()
        expect(state.lastCompletedStageId).toBeNull()
        expect(state.stageAttempts).toEqual({})
        expect(state.hasProgress).toBe(false)
    })

    test("validates stage id and stage attempts map", () => {
        expect(() => {
            ReviewPipelineState.create({
                runId: "run-6",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
                stageAttempts: {" ": 1},
            })
        }).toThrow("stageId must be a non-empty string")

        expect(() => {
            ReviewPipelineState.create({
                runId: "run-7",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
                stageAttempts: {"stage-a": 1.1},
            })
        }).toThrow("stage attempt must be an integer")

        expect(() => {
            ReviewPipelineState.create({
                runId: "run-8",
                definitionVersion: "v1",
                mergeRequest: {},
                config: {},
                stageAttempts: {"stage-a": -1},
            })
        }).toThrow("stage attempt must be greater than or equal to zero")

        const state = ReviewPipelineState.create({
            runId: "run-9",
            definitionVersion: "v1",
            mergeRequest: {},
            config: {},
        })

        expect(() => state.getStageAttempt(" ")).toThrow("stageId must be a non-empty string")
        expect(() => state.incrementStageAttempt(" ")).toThrow("stageId must be a non-empty string")
    })

    test("isolates nested payload from external mutations", () => {
        const mergeRequest = {
            id: "mr-10",
            nested: {
                title: "Initial",
            },
        }
        const state = ReviewPipelineState.create({
            runId: "run-10",
            definitionVersion: "v1",
            mergeRequest,
            config: {
                flags: ["a"],
            },
            files: [
                {
                    path: "src/a.ts",
                    details: {kind: "ts"},
                },
            ],
        })

        mergeRequest.id = "mr-mutated"
        mergeRequest.nested.title = "Mutated"

        const readMergeRequest = state.mergeRequest as {
            id: string
            nested: {title: string}
        }
        readMergeRequest.id = "mr-read-mutated"
        readMergeRequest.nested.title = "Read Mutated"

        const readFiles = state.files as Array<{details: {kind: string}}>
        const firstFile = readFiles[0]
        if (firstFile === undefined) {
            throw new Error("Expected first file in state snapshot")
        }
        firstFile.details.kind = "js"

        expect((state.mergeRequest as {id: string}).id).toBe("mr-10")
        expect((state.mergeRequest as {nested: {title: string}}).nested.title).toBe("Initial")
        const stateFile = (state.files as Array<{details: {kind: string}}>)[0]
        if (stateFile === undefined) {
            throw new Error("Expected first file in immutable state")
        }
        expect(stateFile.details.kind).toBe("ts")
    })
})
