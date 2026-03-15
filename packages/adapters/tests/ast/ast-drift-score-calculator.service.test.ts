import {describe, expect, test} from "bun:test"

import {
    AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE,
    AST_DRIFT_TREND_DIRECTION,
    AstDriftScoreCalculatorError,
    AstDriftScoreCalculatorService,
    type IAstDriftHistoryPointInput,
    type IAstDriftImportInput,
    type IAstDriftScoreCalculatorInput,
    type IAstDriftScoreCalculatorResult,
    type IAstDriftViolationInput,
} from "../../src/ast"

type AstDriftScoreCalculatorErrorCode =
    (typeof AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE)[keyof typeof AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE]

/**
 * Asserts typed drift score calculator error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstDriftScoreCalculatorError(
    callback: () => Promise<unknown>,
    code: AstDriftScoreCalculatorErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstDriftScoreCalculatorError)

        if (error instanceof AstDriftScoreCalculatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstDriftScoreCalculatorError to be thrown")
}

describe("AstDriftScoreCalculatorService", () => {
    test("calculates drift score with module breakdown and trend timeline", async () => {
        const service = new AstDriftScoreCalculatorService({
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const result = await service.calculate({
            imports: createImports(),
            violations: createViolations(),
            history: createHistory(),
            commit: {
                sha: "c3",
                committedAt: "2026-03-15T12:00:00.000Z",
            },
        })

        expect(result.modules).toEqual([
            {
                moduleName: "application.review",
                importCount: 2,
                violationCount: 1,
                driftScore: 0.5,
            },
            {
                moduleName: "domain.review",
                importCount: 2,
                violationCount: 1,
                driftScore: 0.5,
            },
        ])
        expect(result.trend).toEqual([
            {
                commitSha: "a1",
                committedAt: "2026-03-13T12:00:00.000Z",
                driftScore: 0.4,
            },
            {
                commitSha: "b2",
                committedAt: "2026-03-14T12:00:00.000Z",
                driftScore: 0.45,
            },
            {
                commitSha: "c3",
                committedAt: "2026-03-15T12:00:00.000Z",
                driftScore: 0.5,
            },
        ])
        expect(result.summary).toEqual({
            totalImportCount: 4,
            violationCount: 2,
            driftScore: 0.5,
            driftPercent: 50,
            moduleCount: 2,
            trendPointCount: 3,
            trendDirection: AST_DRIFT_TREND_DIRECTION.UP,
            trendDelta: 0.05,
            generatedAt: "2026-03-15T12:00:00.000Z",
        })
    })

    test("loads history with retry and serves cached idempotent result", async () => {
        let loadCalls = 0
        const sleepCalls: number[] = []
        const service = new AstDriftScoreCalculatorService({
            loadHistory: () => {
                loadCalls += 1
                if (loadCalls === 1) {
                    return Promise.reject(new Error("temporary history timeout"))
                }

                return Promise.resolve(createHistory())
            },
            maxLoadAttempts: 2,
            retryBackoffMs: 13,
            cacheTtlMs: 10000,
            sleep: (milliseconds) => {
                sleepCalls.push(milliseconds)
                return Promise.resolve()
            },
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const input: IAstDriftScoreCalculatorInput = {
            imports: createImports(),
            violations: createViolations(),
        }

        const firstResult = await service.calculate(input)
        const secondResult = await service.calculate(input)

        expect(loadCalls).toBe(2)
        expect(sleepCalls).toEqual([13])
        expect(secondResult).toEqual(firstResult)
    })

    test("deduplicates in-flight history loading for identical request", async () => {
        let loadCalls = 0
        const gate = createDeferred()
        const service = new AstDriftScoreCalculatorService({
            loadHistory: async () => {
                loadCalls += 1
                await gate.promise
                return createHistory()
            },
        })

        const pendingFirst = service.calculate({
            imports: createImports(),
            violations: createViolations(),
        })
        const pendingSecond = service.calculate({
            imports: createImports(),
            violations: createViolations(),
        })
        gate.resolve()

        const [firstResult, secondResult] = await Promise.all([pendingFirst, pendingSecond])
        expect(loadCalls).toBe(1)
        expect(secondResult).toEqual(firstResult)
    })

    test("throws typed validation errors for invalid inputs", async () => {
        const service = new AstDriftScoreCalculatorService()

        await expectAstDriftScoreCalculatorError(
            () =>
                service.calculate({
                    imports: [],
                    violations: [],
                }),
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.EMPTY_IMPORTS,
        )

        await expectAstDriftScoreCalculatorError(
            () =>
                service.calculate({
                    imports: createImports(),
                    violations: [
                        {
                            sourcePath: "src/unknown/source.ts",
                            sourceModule: "application.review",
                            targetPath: "src/unknown/target.ts",
                            targetModule: "domain.review",
                        },
                    ],
                }),
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.VIOLATION_IMPORT_MISMATCH,
        )

        await expectAstDriftScoreCalculatorError(
            () =>
                service.calculate({
                    imports: createImports(),
                    violations: createViolations(),
                    history: [
                        {
                            commitSha: "x1",
                            committedAt: "2026-03-15T12:00:00.000Z",
                            driftScore: 1.5,
                        },
                    ],
                }),
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.INVALID_HISTORY_DRIFT_SCORE,
        )
    })

    test("throws retry exhausted when history loading fails across all attempts", async () => {
        const service = new AstDriftScoreCalculatorService({
            loadHistory: () => Promise.reject(new Error("persistent history outage")),
            maxLoadAttempts: 3,
            retryBackoffMs: 0,
        })

        await expectAstDriftScoreCalculatorError(
            () =>
                service.calculate({
                    imports: createImports(),
                    violations: createViolations(),
                }),
            AST_DRIFT_SCORE_CALCULATOR_ERROR_CODE.RETRY_EXHAUSTED,
        )
    })

    test("returns cloned cached result to protect internal cache state", async () => {
        const service = new AstDriftScoreCalculatorService({
            cacheTtlMs: 10000,
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const input: IAstDriftScoreCalculatorInput = {
            imports: createImports(),
            violations: createViolations(),
            history: createHistory(),
        }

        const firstResult = await service.calculate(input)
        mutateResult(firstResult)
        const secondResult = await service.calculate(input)

        expect(secondResult.modules[0]?.moduleName).toBe("application.review")
        expect(secondResult.summary.driftScore).toBe(0.5)
    })
})

/**
 * Creates deterministic imports for drift score tests.
 *
 * @returns Import list.
 */
function createImports(): readonly IAstDriftImportInput[] {
    return [
        {
            sourcePath: "src/application/review/use-case.ts",
            sourceLayer: "application",
            sourceModule: "application.review",
            targetPath: "src/domain/review/aggregate.ts",
            targetLayer: "domain",
            targetModule: "domain.review",
        },
        {
            sourcePath: "src/application/review/use-case.ts",
            sourceLayer: "application",
            sourceModule: "application.review",
            targetPath: "src/domain/review/value-object.ts",
            targetLayer: "domain",
            targetModule: "domain.review",
        },
        {
            sourcePath: "src/domain/review/aggregate.ts",
            sourceLayer: "domain",
            sourceModule: "domain.review",
            targetPath: "src/domain/review/value-object.ts",
            targetLayer: "domain",
            targetModule: "domain.review",
        },
        {
            sourcePath: "src/domain/review/aggregate.ts",
            sourceLayer: "domain",
            sourceModule: "domain.review",
            targetPath: "src/application/review/use-case.ts",
            targetLayer: "application",
            targetModule: "application.review",
        },
    ]
}

/**
 * Creates deterministic violation edges for drift score tests.
 *
 * @returns Violation list.
 */
function createViolations(): readonly IAstDriftViolationInput[] {
    return [
        {
            sourcePath: "src/application/review/use-case.ts",
            sourceModule: "application.review",
            targetPath: "src/domain/review/aggregate.ts",
            targetModule: "domain.review",
        },
        {
            sourcePath: "src/domain/review/aggregate.ts",
            sourceModule: "domain.review",
            targetPath: "src/application/review/use-case.ts",
            targetModule: "application.review",
        },
    ]
}

/**
 * Creates deterministic history points for trend tests.
 *
 * @returns History list.
 */
function createHistory(): readonly IAstDriftHistoryPointInput[] {
    return [
        {
            commitSha: "a1",
            committedAt: "2026-03-13T12:00:00.000Z",
            driftScore: 0.4,
        },
        {
            commitSha: "b2",
            committedAt: "2026-03-14T12:00:00.000Z",
            driftScore: 0.45,
        },
    ]
}

/**
 * Mutates result payload to verify clone guarantees.
 *
 * @param result Drift score result payload.
 */
function mutateResult(result: IAstDriftScoreCalculatorResult): void {
    const firstModule = result.modules[0]
    if (firstModule !== undefined) {
        ;(firstModule as {moduleName: string}).moduleName = "mutated.module"
    }

    ;(result.summary as {driftScore: number}).driftScore = 0
}

/**
 * Creates deferred primitive for deterministic async orchestration.
 *
 * @returns Deferred promise and resolve callback.
 */
function createDeferred(): {
    readonly promise: Promise<void>
    readonly resolve: () => void
} {
    let resolver: (() => void) | undefined = undefined
    const promise = new Promise<void>((resolve) => {
        resolver = resolve
    })

    return {
        promise,
        resolve: () => {
            if (resolver !== undefined) {
                resolver()
            }
        },
    }
}
