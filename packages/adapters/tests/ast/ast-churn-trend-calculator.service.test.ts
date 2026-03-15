import {describe, expect, test} from "bun:test"

import {
    AST_CHURN_TREND_CALCULATOR_ERROR_CODE,
    AST_CHURN_TREND_DIRECTION,
    AstChurnTrendCalculatorError,
    AstChurnTrendCalculatorService,
    type AstChurnTrendCalculatorLoadSamples,
    type IAstChurnTrendCalculatorInput,
    type IAstChurnTrendCalculatorResult,
    type IAstChurnTrendSample,
} from "../../src/ast"

type AstChurnTrendCalculatorErrorCode =
    (typeof AST_CHURN_TREND_CALCULATOR_ERROR_CODE)[keyof typeof AST_CHURN_TREND_CALCULATOR_ERROR_CODE]

/**
 * Asserts typed churn trend calculator error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstChurnTrendCalculatorError(
    callback: () => Promise<unknown>,
    code: AstChurnTrendCalculatorErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstChurnTrendCalculatorError)

        if (error instanceof AstChurnTrendCalculatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstChurnTrendCalculatorError to be thrown")
}

describe("AstChurnTrendCalculatorService", () => {
    test("calculates rolling churn trends and direction classification", async () => {
        const service = new AstChurnTrendCalculatorService({
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const result = await service.calculate({
            samples: createSampleTrendDataset(),
            windowSizes: [2, 4],
            accelerationThreshold: 0.2,
            decelerationThreshold: -0.2,
        })

        expect(result.items).toEqual([
            {
                filePath: "src/a.ts",
                sampleCount: 4,
                latestChurn: 8,
                shortWindowAverage: 7,
                longWindowAverage: 5,
                changeDelta: 2,
                changeRatio: 0.4,
                direction: AST_CHURN_TREND_DIRECTION.ACCELERATING,
                rollingAverages: [
                    {
                        windowSize: 2,
                        sampleCount: 2,
                        average: 7,
                    },
                    {
                        windowSize: 4,
                        sampleCount: 4,
                        average: 5,
                    },
                ],
            },
            {
                filePath: "src/b.ts",
                sampleCount: 4,
                latestChurn: 2,
                shortWindowAverage: 3,
                longWindowAverage: 5,
                changeDelta: -2,
                changeRatio: -0.4,
                direction: AST_CHURN_TREND_DIRECTION.DECELERATING,
                rollingAverages: [
                    {
                        windowSize: 2,
                        sampleCount: 2,
                        average: 3,
                    },
                    {
                        windowSize: 4,
                        sampleCount: 4,
                        average: 5,
                    },
                ],
            },
            {
                filePath: "src/c.ts",
                sampleCount: 4,
                latestChurn: 5,
                shortWindowAverage: 5,
                longWindowAverage: 5,
                changeDelta: 0,
                changeRatio: 0,
                direction: AST_CHURN_TREND_DIRECTION.STABLE,
                rollingAverages: [
                    {
                        windowSize: 2,
                        sampleCount: 2,
                        average: 5,
                    },
                    {
                        windowSize: 4,
                        sampleCount: 4,
                        average: 5,
                    },
                ],
            },
        ])
        expect(result.summary).toEqual({
            fileCount: 3,
            acceleratingCount: 1,
            deceleratingCount: 1,
            stableCount: 1,
            averageChangeDelta: 0,
            averageChangeRatio: 0,
            windowSizes: [2, 4],
            accelerationThreshold: 0.2,
            decelerationThreshold: -0.2,
            generatedAt: "2026-03-15T12:00:00.000Z",
        })
    })

    test("loads samples with retry backoff and serves idempotent cached result", async () => {
        let loadCalls = 0
        const sleepCalls: number[] = []
        const loadSamples: AstChurnTrendCalculatorLoadSamples = (
            _filePaths,
        ): Promise<readonly IAstChurnTrendSample[]> => {
            loadCalls += 1
            if (loadCalls === 1) {
                return Promise.reject(new Error("temporary backend timeout"))
            }

            return Promise.resolve([
                {
                    filePath: "src/a.ts",
                    churn: 2,
                    observedAt: "2026-03-13T00:00:00.000Z",
                },
                {
                    filePath: "src/a.ts",
                    churn: 4,
                    observedAt: "2026-03-14T00:00:00.000Z",
                },
                {
                    filePath: "src/a.ts",
                    churn: 6,
                    observedAt: "2026-03-15T00:00:00.000Z",
                },
                {
                    filePath: "src/a.ts",
                    churn: 8,
                    observedAt: "2026-03-16T00:00:00.000Z",
                },
            ])
        }
        const service = new AstChurnTrendCalculatorService({
            loadSamples,
            maxLoadAttempts: 2,
            retryBackoffMs: 11,
            cacheTtlMs: 10000,
            sleep: (milliseconds) => {
                sleepCalls.push(milliseconds)
                return Promise.resolve()
            },
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const input: IAstChurnTrendCalculatorInput = {
            filePaths: ["src/a.ts"],
            windowSizes: [2, 4],
        }

        const firstResult = await service.calculate(input)
        const secondResult = await service.calculate(input)

        expect(loadCalls).toBe(2)
        expect(sleepCalls).toEqual([11])
        expect(secondResult).toEqual(firstResult)
        expect(firstResult.items[0]?.direction).toBe(AST_CHURN_TREND_DIRECTION.ACCELERATING)
    })

    test("deduplicates in-flight requests for same normalized input", async () => {
        const gate = createDeferred()
        let loadCalls = 0

        const service = new AstChurnTrendCalculatorService({
            loadSamples: () => {
                loadCalls += 1
                return gate.promise.then(() => [
                    {
                        filePath: "src/a.ts",
                        churn: 3,
                        observedAt: "2026-03-15T00:00:00.000Z",
                    },
                    {
                        filePath: "src/a.ts",
                        churn: 6,
                        observedAt: "2026-03-16T00:00:00.000Z",
                    },
                ])
            },
        })

        const pendingFirst = service.calculate({filePaths: ["src/a.ts"]})
        const pendingSecond = service.calculate({filePaths: ["src/a.ts"]})
        gate.resolve()

        const [firstResult, secondResult] = await Promise.all([pendingFirst, pendingSecond])
        expect(loadCalls).toBe(1)
        expect(secondResult).toEqual(firstResult)
    })

    test("throws typed validation errors for invalid inputs", async () => {
        const service = new AstChurnTrendCalculatorService()

        await expectAstChurnTrendCalculatorError(
            () =>
                service.calculate({
                    samples: createSampleTrendDataset(),
                    windowSizes: [0],
                }),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_WINDOW_SIZE,
        )

        await expectAstChurnTrendCalculatorError(
            () =>
                service.calculate({
                    samples: createSampleTrendDataset(),
                    decelerationThreshold: 0.2,
                }),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_DECELERATION_THRESHOLD,
        )

        await expectAstChurnTrendCalculatorError(
            () =>
                service.calculate({
                    samples: [],
                }),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.EMPTY_SAMPLES,
        )

        await expectAstChurnTrendCalculatorError(
            () =>
                service.calculate({
                    samples: [
                        {
                            filePath: "src/a.ts",
                            churn: 2,
                            observedAt: "not-a-date",
                        },
                    ],
                }),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_OBSERVED_AT,
        )
    })

    test("throws retry exhausted when sample loading fails on all attempts", async () => {
        const service = new AstChurnTrendCalculatorService({
            loadSamples: () => Promise.reject(new Error("fatal source outage")),
            maxLoadAttempts: 3,
            retryBackoffMs: 0,
        })

        await expectAstChurnTrendCalculatorError(
            () => service.calculate({filePaths: ["src/a.ts"]}),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.RETRY_EXHAUSTED,
        )
    })

    test("throws invalid loader error when samples are omitted and loader is not configured", async () => {
        const service = new AstChurnTrendCalculatorService()

        await expectAstChurnTrendCalculatorError(
            () => service.calculate({filePaths: ["src/a.ts"]}),
            AST_CHURN_TREND_CALCULATOR_ERROR_CODE.INVALID_LOAD_SAMPLES,
        )
    })

    test("returns cloned cached results to protect idempotency cache from mutations", async () => {
        const service = new AstChurnTrendCalculatorService({
            cacheTtlMs: 10000,
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const input: IAstChurnTrendCalculatorInput = {
            samples: createSampleTrendDataset(),
            windowSizes: [2, 4],
        }

        const firstResult = await service.calculate(input)
        mutateTrendResult(firstResult)
        const secondResult = await service.calculate(input)

        expect(secondResult.items[0]?.filePath).toBe("src/a.ts")
        expect(secondResult.items[0]?.changeRatio).toBe(0.4)
    })
})

/**
 * Creates sample dataset with three churn direction classes.
 *
 * @returns Sample trend dataset.
 */
function createSampleTrendDataset(): readonly IAstChurnTrendSample[] {
    return [
        {
            filePath: "src/a.ts",
            churn: 2,
            observedAt: "2026-03-10T00:00:00.000Z",
        },
        {
            filePath: "src/a.ts",
            churn: 4,
            observedAt: "2026-03-11T00:00:00.000Z",
        },
        {
            filePath: "src/a.ts",
            churn: 6,
            observedAt: "2026-03-12T00:00:00.000Z",
        },
        {
            filePath: "src/a.ts",
            churn: 8,
            observedAt: "2026-03-13T00:00:00.000Z",
        },
        {
            filePath: "src/b.ts",
            churn: 8,
            observedAt: "2026-03-10T00:00:00.000Z",
        },
        {
            filePath: "src/b.ts",
            churn: 6,
            observedAt: "2026-03-11T00:00:00.000Z",
        },
        {
            filePath: "src/b.ts",
            churn: 4,
            observedAt: "2026-03-12T00:00:00.000Z",
        },
        {
            filePath: "src/b.ts",
            churn: 2,
            observedAt: "2026-03-13T00:00:00.000Z",
        },
        {
            filePath: "src/c.ts",
            churn: 5,
            observedAt: "2026-03-10T00:00:00.000Z",
        },
        {
            filePath: "src/c.ts",
            churn: 5,
            observedAt: "2026-03-11T00:00:00.000Z",
        },
        {
            filePath: "src/c.ts",
            churn: 5,
            observedAt: "2026-03-12T00:00:00.000Z",
        },
        {
            filePath: "src/c.ts",
            churn: 5,
            observedAt: "2026-03-13T00:00:00.000Z",
        },
    ]
}

/**
 * Mutates trend result to verify defensive cache cloning.
 *
 * @param result Trend result.
 */
function mutateTrendResult(result: IAstChurnTrendCalculatorResult): void {
    const firstItem = result.items[0]
    if (firstItem !== undefined) {
        ;(firstItem as {filePath: string}).filePath = "mutated.ts"
    }
}

/**
 * Creates deferred primitive for deterministic async orchestration.
 *
 * @returns Deferred promise with resolve callback.
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
