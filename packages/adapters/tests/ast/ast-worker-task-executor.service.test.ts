import {threadId} from "node:worker_threads"

import {describe, expect, test} from "bun:test"

import {AST_LANGUAGE, type IParsedSourceFileDTO} from "@codenautic/core"

import {
    AST_WORKER_TASK_EXECUTOR_ERROR_CODE,
    AstWorkerTaskExecutorError,
    AstWorkerTaskExecutorService,
} from "../../src/ast"

interface IDeferred<TValue> {
    readonly promise: Promise<TValue>
    resolve(value: TValue): void
    reject(reason?: unknown): void
}

/**
 * Creates deferred promise fixture.
 *
 * @returns Deferred fixture.
 */
function createDeferred<TValue>(): IDeferred<TValue> {
    let resolve: ((value: TValue) => void) | undefined
    let reject: ((reason?: unknown) => void) | undefined

    const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
    })

    return {
        promise,
        resolve(value: TValue): void {
            if (resolve !== undefined) {
                resolve(value)
            }
        },
        reject(reason?: unknown): void {
            if (reject !== undefined) {
                reject(reason)
            }
        },
    }
}

/**
 * Creates deterministic parsed-file fixture.
 *
 * @param filePath Parsed file path.
 * @returns Parsed-file DTO fixture.
 */
function createParsedSourceFile(filePath: string): IParsedSourceFileDTO {
    return {
        filePath,
        language: AST_LANGUAGE.TYPESCRIPT,
        hasSyntaxErrors: false,
        imports: [],
        typeAliases: [],
        interfaces: [],
        enums: [],
        classes: [],
        functions: [],
        calls: [],
    }
}

/**
 * Asserts typed worker-task-executor error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstWorkerTaskExecutorError(
    callback: () => unknown,
    code:
        (typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE)[keyof typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstWorkerTaskExecutorError)

        if (error instanceof AstWorkerTaskExecutorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstWorkerTaskExecutorError to be thrown")
}

/**
 * Asserts typed worker-task-executor error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstWorkerTaskExecutorErrorAsync(
    callback: () => Promise<unknown>,
    code:
        (typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE)[keyof typeof AST_WORKER_TASK_EXECUTOR_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstWorkerTaskExecutorError)

        if (error instanceof AstWorkerTaskExecutorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstWorkerTaskExecutorError to be thrown")
}

describe("AstWorkerTaskExecutorService", () => {
    test("executes parse task in worker thread and returns parsed file analysis", async () => {
        const executor = new AstWorkerTaskExecutorService({
            defaultTimeoutMs: 5_000,
        })

        const result = await executor.execute({
            filePath: "src/worker-task.ts",
            content: [
                "export interface IWorkerTask {",
                "    readonly id: string",
                "}",
                "",
                "export class WorkerTask {",
                "    public run(): void {}",
                "}",
                "",
                "export function executeTask(): void {}",
            ].join("\n"),
            language: AST_LANGUAGE.TYPESCRIPT,
        })

        expect(result.workerThreadId).toBeGreaterThan(0)
        expect(result.workerThreadId).not.toBe(threadId)
        expect(result.attempts).toBe(1)
        expect(result.parsedFile.filePath).toBe("src/worker-task.ts")
        expect(result.parsedFile.language).toBe(AST_LANGUAGE.TYPESCRIPT)
    })

    test("deduplicates in-flight tasks by idempotency key", async () => {
        const gate = createDeferred<void>()
        let runnerCallCount = 0
        const executor = new AstWorkerTaskExecutorService({
            runner: async (task) => {
                runnerCallCount += 1
                await gate.promise
                return {
                    parsedFile: createParsedSourceFile(task.filePath),
                    workerThreadId: 42,
                }
            },
        })

        const firstTask = executor.execute({
            filePath: "src/a.ts",
            content: "export const a = 1",
            language: AST_LANGUAGE.TYPESCRIPT,
            idempotencyKey: "same-key",
        })
        const secondTask = executor.execute({
            filePath: "src/ignored.ts",
            content: "export const b = 2",
            language: AST_LANGUAGE.TYPESCRIPT,
            idempotencyKey: "same-key",
        })

        expect(firstTask).toBe(secondTask)

        gate.resolve(undefined)

        const result = await firstTask
        expect(runnerCallCount).toBe(1)
        expect(result.workerThreadId).toBe(42)
        expect(result.parsedFile.filePath).toBe("src/a.ts")
    })

    test("retries failed runner calls with exponential backoff", async () => {
        const backoffDurations: number[] = []
        let attempt = 0
        const executor = new AstWorkerTaskExecutorService({
            runner: (task) => {
                attempt += 1

                if (attempt < 3) {
                    return Promise.reject(new Error("temporary runner failure"))
                }

                return Promise.resolve({
                    parsedFile: createParsedSourceFile(task.filePath),
                    workerThreadId: 7,
                })
            },
            sleep: (durationMs) => {
                backoffDurations.push(durationMs)
                return Promise.resolve()
            },
        })

        const result = await executor.execute({
            filePath: "src/retry.ts",
            content: "export const retry = true",
            language: AST_LANGUAGE.TYPESCRIPT,
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 10,
                maxBackoffMs: 20,
            },
        })

        expect(result.attempts).toBe(3)
        expect(backoffDurations).toEqual([10, 20])
    })

    test("returns typed error for unknown parser language", async () => {
        const executor = new AstWorkerTaskExecutorService({
            defaultTimeoutMs: 5_000,
        })

        await expectAstWorkerTaskExecutorErrorAsync(
            async () =>
                executor.execute({
                    filePath: "src/invalid.lang",
                    content: "noop",
                    language: "unknown-language",
                    retryPolicy: {
                        maxAttempts: 1,
                    },
                }),
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.WORKER_EXECUTION_FAILED,
        )
    })

    test("throws typed errors for invalid configuration and input", async () => {
        expectAstWorkerTaskExecutorError(
            () => {
                void new AstWorkerTaskExecutorService({
                    defaultTimeoutMs: 0,
                })
            },
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_TIMEOUT_MS,
        )

        expectAstWorkerTaskExecutorError(
            () => {
                void new AstWorkerTaskExecutorService({
                    runner: "bad-runner" as never,
                })
            },
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_RUNNER,
        )

        const executor = new AstWorkerTaskExecutorService()

        await expectAstWorkerTaskExecutorErrorAsync(
            async () =>
                executor.execute({
                    filePath: "   ",
                    content: "export {}",
                    language: AST_LANGUAGE.TYPESCRIPT,
                }),
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstWorkerTaskExecutorErrorAsync(
            async () =>
                executor.execute({
                    filePath: "src/file.ts",
                    content: "export {}",
                    language: "   ",
                }),
            AST_WORKER_TASK_EXECUTOR_ERROR_CODE.INVALID_LANGUAGE,
        )
    })
})
