import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"

import {AST_LANGUAGE} from "@codenautic/core"

import {
    AST_FILE_METRICS_PROVIDER_ERROR_CODE,
    AstFileMetricsProvider,
    AstFileMetricsProviderError,
    type AstFileMetricsProviderReadFile,
    type AstFileMetricsProviderResolveRepositoryPath,
    type IAstChurnCalculatorInput,
    type IAstChurnCalculatorService,
    type IAstCyclomaticComplexityInput,
    type IAstCyclomaticComplexityService,
    type IAstFileMetricsProviderOptions,
    type IAstLanguageDetectionInput,
    type IAstLanguageDetectionService,
    type IAstLocCalculatorInput,
    type IAstLocCalculatorService,
} from "../../src/ast"

type AstFileMetricsProviderErrorCode =
    (typeof AST_FILE_METRICS_PROVIDER_ERROR_CODE)[keyof typeof AST_FILE_METRICS_PROVIDER_ERROR_CODE]

/**
 * Asserts typed AST file metrics provider error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstFileMetricsProviderError(
    callback: () => Promise<unknown>,
    code: AstFileMetricsProviderErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstFileMetricsProviderError)

        if (error instanceof AstFileMetricsProviderError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstFileMetricsProviderError to be thrown")
}

describe("AstFileMetricsProvider", () => {
    test("aggregates LOC complexity churn and preserves input order", async () => {
        const resolveRepositoryPathCalls: string[] = []
        const readFileCalls: string[] = []
        const languageDetectionCalls: IAstLanguageDetectionInput[] = []
        const locInputs: IAstLocCalculatorInput[] = []
        const complexityInputs: IAstCyclomaticComplexityInput[] = []
        const churnInputs: IAstChurnCalculatorInput[] = []

        const resolveRepositoryPath: AstFileMetricsProviderResolveRepositoryPath = (
            repositoryId,
        ): string => {
            resolveRepositoryPathCalls.push(repositoryId)
            return "/tmp/repo"
        }

        const readFile: AstFileMetricsProviderReadFile = (
            absoluteFilePath,
        ): Promise<string> => {
            readFileCalls.push(absoluteFilePath)
            return Promise.resolve("export const value = 1\n")
        }

        const languageDetectionService: IAstLanguageDetectionService = {
            detect(input): (typeof AST_LANGUAGE)[keyof typeof AST_LANGUAGE] {
                languageDetectionCalls.push(input)
                return AST_LANGUAGE.TYPESCRIPT
            },
        }

        const locCalculator: IAstLocCalculatorService = {
            calculate(input): Promise<{
                readonly items: readonly {
                    readonly filePath: string
                    readonly loc: number
                }[]
                readonly summary: {
                    readonly totalFiles: number
                    readonly processedFiles: number
                    readonly totalLoc: number
                }
            }> {
                locInputs.push(input)
                return Promise.resolve({
                    items: input.filePaths?.map((filePath) => ({
                        filePath,
                        loc: filePath === "src/a.ts" ? 11 : 22,
                    })) ?? [],
                    summary: {
                        totalFiles: input.files.length,
                        processedFiles: input.filePaths?.length ?? 0,
                        totalLoc: 33,
                    },
                })
            },
        }

        const cyclomaticComplexityCalculator: IAstCyclomaticComplexityService = {
            calculate(input): Promise<{
                readonly items: readonly {
                    readonly filePath: string
                    readonly complexity: number
                }[]
                readonly summary: {
                    readonly totalFiles: number
                    readonly processedFiles: number
                    readonly totalComplexity: number
                    readonly maxComplexity: number
                }
            }> {
                complexityInputs.push(input)
                return Promise.resolve({
                    items: input.filePaths?.map((filePath) => ({
                        filePath,
                        complexity: filePath === "src/a.ts" ? 3 : 5,
                    })) ?? [],
                    summary: {
                        totalFiles: input.files.length,
                        processedFiles: input.filePaths?.length ?? 0,
                        totalComplexity: 8,
                        maxComplexity: 5,
                    },
                })
            },
        }

        const churnCalculator: IAstChurnCalculatorService = {
            calculate(input): Promise<{
                readonly items: readonly {
                    readonly filePath: string
                    readonly churn: number
                }[]
                readonly summary: {
                    readonly fileCount: number
                    readonly totalChurn: number
                    readonly days: number
                    readonly sinceIso: string
                }
            }> {
                churnInputs.push(input)
                return Promise.resolve({
                    items: input.filePaths.map((filePath) => ({
                        filePath,
                        churn: filePath === "src/a.ts" ? 2 : 7,
                    })),
                    summary: {
                        fileCount: input.filePaths.length,
                        totalChurn: 9,
                        days: input.days ?? 30,
                        sinceIso: "2026-03-01T00:00:00.000Z",
                    },
                })
            },
        }

        const provider = new AstFileMetricsProvider({
            resolveRepositoryPath,
            readFile,
            languageDetectionService,
            locCalculator,
            cyclomaticComplexityCalculator,
            churnCalculator,
            defaultChurnDays: 14,
        })

        const result = await provider.getMetrics(" repo-1 ", [
            "src/b.ts",
            " src/a.ts ",
            "src/b.ts",
        ])

        expect(result).toEqual([
            {
                filePath: "src/b.ts",
                loc: 22,
                complexity: 5,
                churn: 7,
                issueCount: 0,
            },
            {
                filePath: "src/a.ts",
                loc: 11,
                complexity: 3,
                churn: 2,
                issueCount: 0,
            },
            {
                filePath: "src/b.ts",
                loc: 22,
                complexity: 5,
                churn: 7,
                issueCount: 0,
            },
        ])

        expect(resolveRepositoryPathCalls).toEqual(["repo-1"])
        expect(readFileCalls).toEqual([
            resolve("/tmp/repo", "src/b.ts"),
            resolve("/tmp/repo", "src/a.ts"),
        ])
        expect(languageDetectionCalls).toHaveLength(2)
        expect(locInputs).toHaveLength(1)
        expect(complexityInputs).toHaveLength(1)
        expect(churnInputs).toHaveLength(1)
        expect(locInputs[0]?.filePaths).toEqual(["src/b.ts", "src/a.ts"])
        expect(complexityInputs[0]?.filePaths).toEqual(["src/b.ts", "src/a.ts"])
        expect(churnInputs[0]).toEqual({
            repositoryPath: "/tmp/repo",
            filePaths: ["src/b.ts", "src/a.ts"],
            days: 14,
        })
    })

    test("returns empty list for empty file set without dependency calls", async () => {
        let resolveCalls = 0
        let readCalls = 0

        const provider = new AstFileMetricsProvider({
            resolveRepositoryPath: (): string => {
                resolveCalls += 1
                return "/tmp/repo"
            },
            readFile: (): Promise<string> => {
                readCalls += 1
                return Promise.resolve("")
            },
        })

        const result = await provider.getMetrics("repo-1", [])

        expect(result).toEqual([])
        expect(resolveCalls).toBe(0)
        expect(readCalls).toBe(0)
    })

    test("wraps repository path resolution failures into typed error", async () => {
        const provider = new AstFileMetricsProvider({
            resolveRepositoryPath: (): Promise<string> => {
                return Promise.reject(new Error("resolver offline"))
            },
        })

        await expectAstFileMetricsProviderError(
            () => provider.getMetrics("repo-1", ["src/a.ts"]),
            AST_FILE_METRICS_PROVIDER_ERROR_CODE.REPOSITORY_PATH_RESOLUTION_FAILED,
        )
    })

    test("wraps source file read failures into typed error", async () => {
        const providerOptions: IAstFileMetricsProviderOptions = {
            resolveRepositoryPath: (): string => "/tmp/repo",
            readFile: (): Promise<string> => {
                return Promise.reject(new Error("ENOENT"))
            },
        }
        const provider = new AstFileMetricsProvider(providerOptions)

        await expectAstFileMetricsProviderError(
            () => provider.getMetrics("repo-1", ["src/a.ts"]),
            AST_FILE_METRICS_PROVIDER_ERROR_CODE.FILE_READ_FAILED,
        )
    })
})
