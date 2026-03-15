import {describe, expect, test} from "bun:test"

import {
    LANGSMITH_TRACER_ERROR_CODE,
    LangSmithTracer,
    LangSmithTracerError,
    type ILangSmithClient,
    type ILangSmithCreateRunPayload,
    type ILangSmithUpdateRunPayload,
} from "../../src/llm"

interface ILangSmithClientMock extends ILangSmithClient {
    readonly createdRuns: ILangSmithCreateRunPayload[]
    readonly updatedRuns: Array<{
        readonly runId: string
        readonly payload: ILangSmithUpdateRunPayload
    }>
}

/**
 * Creates LangSmith client mock with optional failure hooks.
 *
 * @param options Failure hooks.
 * @returns LangSmith client mock.
 */
function createLangSmithClientMock(options: {
    readonly failCreate?: boolean
    readonly failUpdate?: boolean
} = {}): ILangSmithClientMock {
    const createdRuns: ILangSmithCreateRunPayload[] = []
    const updatedRuns: Array<{
        readonly runId: string
        readonly payload: ILangSmithUpdateRunPayload
    }> = []

    return {
        createRun(payload: ILangSmithCreateRunPayload): Promise<void> {
            if (options.failCreate === true) {
                return Promise.reject(new Error("create failed"))
            }
            createdRuns.push(payload)
            return Promise.resolve()
        },
        updateRun(runId: string, payload: ILangSmithUpdateRunPayload): Promise<void> {
            if (options.failUpdate === true) {
                return Promise.reject(new Error("update failed"))
            }
            updatedRuns.push({
                runId,
                payload,
            })
            return Promise.resolve()
        },
        createdRuns,
        updatedRuns,
    }
}

/**
 * Captures rejected error for assertion-friendly checks.
 *
 * @param execute Async action expected to fail.
 * @returns Rejected error instance.
 */
async function captureRejectedError(execute: () => Promise<unknown>): Promise<Error> {
    try {
        await execute()
    } catch (error) {
        if (error instanceof Error) {
            return error
        }

        throw new Error("Expected error object to be thrown")
    }

    throw new Error("Expected promise to reject")
}

describe("LangSmithTracer", () => {
    test("starts runs with generated id and normalized payload", async () => {
        const client = createLangSmithClientMock()
        const tracer = new LangSmithTracer({
            client,
            projectName: "codenautic-project",
            now: () => new Date("2026-03-15T10:00:00.000Z"),
        })

        const runId = await tracer.startRun({
            runName: "review.chat",
            inputs: {
                model: "gpt-4o",
            },
            metadata: {
                provider: "openai",
            },
        })

        expect(runId.length).toBeGreaterThan(0)
        expect(client.createdRuns).toHaveLength(1)
        expect(client.createdRuns[0]).toMatchObject({
            id: runId,
            name: "review.chat",
            run_type: "llm",
            project_name: "codenautic-project",
            start_time: "2026-03-15T10:00:00.000Z",
            inputs: {
                model: "gpt-4o",
            },
            extra: {
                provider: "openai",
            },
        })
    })

    test("completes run with outputs and end timestamp", async () => {
        const client = createLangSmithClientMock()
        const tracer = new LangSmithTracer({
            client,
            now: () => new Date("2026-03-15T10:10:00.000Z"),
        })

        await tracer.completeRun("run-1", {
            outputs: {
                content: "done",
            },
        })

        expect(client.updatedRuns).toEqual([
            {
                runId: "run-1",
                payload: {
                    outputs: {
                        content: "done",
                    },
                    end_time: "2026-03-15T10:10:00.000Z",
                    extra: undefined,
                },
            },
        ])
    })

    test("fails run with normalized error payload", async () => {
        const client = createLangSmithClientMock()
        const tracer = new LangSmithTracer({
            client,
            now: () => new Date("2026-03-15T10:20:00.000Z"),
        })

        await tracer.failRun("run-2", new Error("boom"), {
            stage: "chat",
        })

        expect(client.updatedRuns).toEqual([
            {
                runId: "run-2",
                payload: {
                    error: "boom",
                    end_time: "2026-03-15T10:20:00.000Z",
                    extra: {
                        stage: "chat",
                    },
                },
            },
        ])
    })

    test("trace wraps operation lifecycle on success", async () => {
        const client = createLangSmithClientMock()
        const tracer = new LangSmithTracer({
            client,
            now: () => new Date("2026-03-15T10:30:00.000Z"),
        })

        const result = await tracer.trace(
            {
                runName: "review.generate",
                inputs: {
                    prompt: "x",
                },
            },
            () =>
                Promise.resolve({
                    text: "ok",
                }),
            (value): Readonly<Record<string, unknown>> => {
                return {
                    responseText: value.text,
                }
            },
        )

        expect(result).toEqual({
            text: "ok",
        })
        expect(client.createdRuns).toHaveLength(1)
        expect(client.updatedRuns).toHaveLength(1)
        expect(client.updatedRuns[0]?.payload.outputs).toEqual({
            responseText: "ok",
        })
    })

    test("trace updates run failure and rethrows operation error", async () => {
        const client = createLangSmithClientMock()
        const tracer = new LangSmithTracer({
            client,
            now: () => new Date("2026-03-15T10:40:00.000Z"),
        })

        const error = await captureRejectedError(() =>
            tracer.trace(
                {
                    runName: "review.fail",
                    inputs: {
                        prompt: "x",
                    },
                },
                () => Promise.reject(new Error("operation failed")),
            ),
        )

        expect(error.message).toBe("operation failed")
        expect(client.createdRuns).toHaveLength(1)
        expect(client.updatedRuns).toHaveLength(1)
        expect(client.updatedRuns[0]?.payload.error).toBe("operation failed")
    })

    test("validates constructor and run identifiers", async () => {
        expect(() => {
            return new LangSmithTracer({
                client: {
                    createRun: undefined as unknown as ILangSmithClient["createRun"],
                    updateRun: undefined as unknown as ILangSmithClient["updateRun"],
                },
            })
        }).toThrow("LangSmith tracer requires client with createRun and updateRun methods")

        expect(() => {
            return new LangSmithTracer({
                client: createLangSmithClientMock(),
                projectName: " ",
            })
        }).toThrow("LangSmith tracer project name cannot be empty")

        const tracer = new LangSmithTracer({
            client: createLangSmithClientMock(),
        })
        const runNameError = await captureRejectedError(() =>
            tracer.startRun({
                runName: " ",
                inputs: {},
            }),
        )
        const runIdError = await captureRejectedError(() =>
            tracer.completeRun(" ", {
                outputs: {},
            }),
        )

        expect(runNameError).toBeInstanceOf(LangSmithTracerError)
        expect(runIdError).toBeInstanceOf(LangSmithTracerError)
        if (runNameError instanceof LangSmithTracerError) {
            expect(runNameError.code).toBe(LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_NAME)
        }
        if (runIdError instanceof LangSmithTracerError) {
            expect(runIdError.code).toBe(LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_ID)
        }
    })

    test("wraps client create and update failures with typed errors", async () => {
        const createFailTracer = new LangSmithTracer({
            client: createLangSmithClientMock({
                failCreate: true,
            }),
        })
        const createError = await captureRejectedError(() =>
            createFailTracer.startRun({
                runName: "review.create.fail",
                inputs: {},
            }),
        )

        expect(createError).toBeInstanceOf(LangSmithTracerError)
        if (createError instanceof LangSmithTracerError) {
            expect(createError.code).toBe(LANGSMITH_TRACER_ERROR_CODE.CREATE_RUN_FAILED)
            expect(createError.causeMessage).toBe("create failed")
        }

        const updateFailTracer = new LangSmithTracer({
            client: createLangSmithClientMock({
                failUpdate: true,
            }),
        })
        const updateError = await captureRejectedError(() =>
            updateFailTracer.completeRun("run-3", {
                outputs: {},
            }),
        )

        expect(updateError).toBeInstanceOf(LangSmithTracerError)
        if (updateError instanceof LangSmithTracerError) {
            expect(updateError.code).toBe(LANGSMITH_TRACER_ERROR_CODE.UPDATE_RUN_FAILED)
            expect(updateError.causeMessage).toBe("update failed")
        }
    })
})
