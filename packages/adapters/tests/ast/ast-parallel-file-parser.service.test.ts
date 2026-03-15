import {describe, expect, test} from "bun:test"

import {
    AST_LANGUAGE,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_PARALLEL_FILE_PARSER_ERROR_CODE,
    AstParallelFileParserError,
    AstParallelFileParserService,
    type AstParallelFileParserErrorCode,
    type IAstWorkerTaskExecutorService,
} from "../../src/ast"

/**
 * Asserts typed AST parallel file parser error for sync callback.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 */
function expectAstParallelFileParserError(
    callback: () => unknown,
    code: AstParallelFileParserErrorCode,
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstParallelFileParserError)

        if (error instanceof AstParallelFileParserError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstParallelFileParserError to be thrown")
}

/**
 * Asserts typed AST parallel file parser error for async callback.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstParallelFileParserErrorAsync(
    callback: () => Promise<unknown>,
    code: AstParallelFileParserErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstParallelFileParserError)

        if (error instanceof AstParallelFileParserError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstParallelFileParserError to be thrown")
}

/**
 * Creates minimal parsed-file fixture.
 *
 * @param filePath Repository-relative file path.
 * @returns Parsed-file fixture.
 */
function createParsedFileFixture(filePath: string): IParsedSourceFileDTO {
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

describe("AstParallelFileParserService", () => {
    test("parses files in parallel with concurrency cap and per-file error isolation", async () => {
        let inFlight = 0
        let maxInFlight = 0
        const workerTaskExecutor: IAstWorkerTaskExecutorService = {
            execute: (input) => {
                inFlight += 1
                maxInFlight = Math.max(maxInFlight, inFlight)

                const timeoutMs = input.filePath.endsWith("a.ts") ? 20 : 5
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        inFlight -= 1

                        if (input.filePath.endsWith("fail.ts")) {
                            reject(new Error("Worker parse failed"))
                            return
                        }

                        resolve({
                            parsedFile: createParsedFileFixture(input.filePath),
                            workerThreadId: 7,
                            attempts: 1,
                            durationMs: timeoutMs,
                        })
                    }, timeoutMs)
                })
            },
        }

        const parser = new AstParallelFileParserService({
            workerTaskExecutor,
            defaultConcurrency: 2,
        })
        const result = await parser.parseInParallel({
            files: [
                {
                    filePath: "src/a.ts",
                    language: "typescript",
                    content: "export const a = 1\n",
                },
                {
                    filePath: "src/fail.ts",
                    language: "typescript",
                    content: "broken\n",
                },
                {
                    filePath: "src/b.ts",
                    language: "typescript",
                    content: "export const b = 1\n",
                },
            ],
            concurrency: 2,
        })

        expect(maxInFlight).toBe(2)
        expect(result.summary).toEqual({
            totalFiles: 3,
            parsedFileCount: 2,
            failedFileCount: 1,
            concurrency: 2,
            totalDurationMs: 25,
            maxDurationMs: 20,
        })
        expect(result.successes.map((item) => item.filePath)).toEqual([
            "src/a.ts",
            "src/b.ts",
        ])
        expect(result.failures).toEqual([
            {
                filePath: "src/fail.ts",
                language: "typescript",
                errorCode: "PARSE_FAILED",
                message: "Worker parse failed",
            },
        ])
        expect(result.parsedFiles.map((parsedFile) => parsedFile.filePath)).toEqual([
            "src/a.ts",
            "src/b.ts",
        ])
    })

    test("supports empty file collection", async () => {
        const parser = new AstParallelFileParserService({
            workerTaskExecutor: {
                execute: () =>
                    Promise.resolve({
                        parsedFile: createParsedFileFixture("unused.ts"),
                        workerThreadId: 1,
                        attempts: 1,
                        durationMs: 1,
                    }),
            },
        })

        const result = await parser.parseInParallel({
            files: [],
            concurrency: 3,
        })

        expect(result.summary).toEqual({
            totalFiles: 0,
            parsedFileCount: 0,
            failedFileCount: 0,
            concurrency: 0,
            totalDurationMs: 0,
            maxDurationMs: 0,
        })
    })

    test("throws typed errors for invalid configuration and input", async () => {
        expectAstParallelFileParserError(
            () =>
                new AstParallelFileParserService({
                    defaultConcurrency: 0,
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_DEFAULT_CONCURRENCY,
        )

        expectAstParallelFileParserError(
            () =>
                new AstParallelFileParserService({
                    workerTaskExecutor: {} as unknown as IAstWorkerTaskExecutorService,
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_WORKER_TASK_EXECUTOR,
        )

        const parser = new AstParallelFileParserService({
            workerTaskExecutor: {
                execute: () =>
                    Promise.resolve({
                        parsedFile: createParsedFileFixture("unused.ts"),
                        workerThreadId: 1,
                        attempts: 1,
                        durationMs: 1,
                    }),
            },
        })

        await expectAstParallelFileParserErrorAsync(
            () =>
                parser.parseInParallel({
                    files: [],
                    concurrency: 0,
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_CONCURRENCY,
        )

        await expectAstParallelFileParserErrorAsync(
            () =>
                parser.parseInParallel({
                    files: [
                        {
                            filePath: " ",
                            language: "typescript",
                            content: "x",
                        },
                    ],
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_FILE_PATH,
        )

        await expectAstParallelFileParserErrorAsync(
            () =>
                parser.parseInParallel({
                    files: [
                        {
                            filePath: "src/a.ts",
                            language: " ",
                            content: "x",
                        },
                    ],
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_LANGUAGE,
        )

        await expectAstParallelFileParserErrorAsync(
            () =>
                parser.parseInParallel({
                    files: [
                        {
                            filePath: "src/a.ts",
                            language: "typescript",
                            content: 1 as unknown as string,
                        },
                    ],
                }),
            AST_PARALLEL_FILE_PARSER_ERROR_CODE.INVALID_CONTENT,
        )
    })
})
