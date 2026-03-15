import {describe, expect, test} from "bun:test"

import {
    AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH,
    AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE,
    AstComplexityChurnCorrelatorError,
    AstComplexityChurnCorrelatorService,
    type IAstComplexityChurnCorrelatorInput,
    type IAstComplexityChurnCorrelatorResult,
    type IAstComplexityChurnPointInput,
} from "../../src/ast"

type AstComplexityChurnCorrelatorErrorCode =
    (typeof AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE)[keyof typeof AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE]

/**
 * Asserts typed complexity-churn correlator error for async action.
 *
 * @param callback Action expected to fail.
 * @param code Expected typed error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstComplexityChurnCorrelatorError(
    callback: () => Promise<unknown>,
    code: AstComplexityChurnCorrelatorErrorCode,
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstComplexityChurnCorrelatorError)

        if (error instanceof AstComplexityChurnCorrelatorError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstComplexityChurnCorrelatorError to be thrown")
}

describe("AstComplexityChurnCorrelatorService", () => {
    test("builds scatter data, computes correlation, and identifies high-high hotspots", async () => {
        const service = new AstComplexityChurnCorrelatorService({
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const result = await service.calculate({
            points: createLinearPointDataset(),
            highComplexityPercentile: 0.75,
            highChurnPercentile: 0.75,
        })

        expect(result.points).toEqual([
            {
                filePath: "src/a.ts",
                complexity: 10,
                churn: 2,
                normalizedComplexity: 0,
                normalizedChurn: 0,
                isHighComplexity: false,
                isHighChurn: false,
                isHotSpot: false,
            },
            {
                filePath: "src/b.ts",
                complexity: 20,
                churn: 4,
                normalizedComplexity: 0.333333,
                normalizedChurn: 0.333333,
                isHighComplexity: false,
                isHighChurn: false,
                isHotSpot: false,
            },
            {
                filePath: "src/c.ts",
                complexity: 30,
                churn: 6,
                normalizedComplexity: 0.666667,
                normalizedChurn: 0.666667,
                isHighComplexity: false,
                isHighChurn: false,
                isHotSpot: false,
            },
            {
                filePath: "src/d.ts",
                complexity: 40,
                churn: 8,
                normalizedComplexity: 1,
                normalizedChurn: 1,
                isHighComplexity: true,
                isHighChurn: true,
                isHotSpot: true,
            },
        ])
        expect(result.hotSpots).toEqual([
            {
                filePath: "src/d.ts",
                complexity: 40,
                churn: 8,
                normalizedComplexity: 1,
                normalizedChurn: 1,
                isHighComplexity: true,
                isHighChurn: true,
                isHotSpot: true,
            },
        ])
        expect(result.summary).toEqual({
            pointCount: 4,
            hotSpotCount: 1,
            meanComplexity: 25,
            meanChurn: 5,
            correlationCoefficient: 1,
            correlationStrength:
                AST_COMPLEXITY_CHURN_CORRELATION_STRENGTH.STRONG_POSITIVE,
            highComplexityThreshold: 32.5,
            highChurnThreshold: 6.5,
            highComplexityPercentile: 0.75,
            highChurnPercentile: 0.75,
            generatedAt: "2026-03-15T12:00:00.000Z",
        })
    })

    test("loads points with retry backoff and serves cached idempotent result", async () => {
        let loadCalls = 0
        const sleepCalls: number[] = []
        const service = new AstComplexityChurnCorrelatorService({
            loadPoints: () => {
                loadCalls += 1
                if (loadCalls === 1) {
                    return Promise.reject(new Error("temporary provider timeout"))
                }

                return Promise.resolve(createLinearPointDataset())
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
        const input: IAstComplexityChurnCorrelatorInput = {
            filePaths: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"],
        }

        const firstResult = await service.calculate(input)
        const secondResult = await service.calculate(input)

        expect(loadCalls).toBe(2)
        expect(sleepCalls).toEqual([13])
        expect(secondResult).toEqual(firstResult)
    })

    test("deduplicates in-flight point loading for same file path key", async () => {
        let loadCalls = 0
        const gate = createDeferred()

        const service = new AstComplexityChurnCorrelatorService({
            loadPoints: () => {
                loadCalls += 1
                return gate.promise.then(() => createLinearPointDataset())
            },
        })

        const pendingFirst = service.calculate({filePaths: ["src/a.ts"]})
        const pendingSecond = service.calculate({filePaths: ["src/a.ts"]})
        gate.resolve()

        const [firstResult, secondResult] = await Promise.all([pendingFirst, pendingSecond])
        expect(loadCalls).toBe(1)
        expect(secondResult).toEqual(firstResult)
    })

    test("throws typed validation errors for invalid correlator input", async () => {
        const service = new AstComplexityChurnCorrelatorService()

        await expectAstComplexityChurnCorrelatorError(
            () =>
                service.calculate({
                    points: createLinearPointDataset(),
                    highComplexityPercentile: 1.5,
                }),
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_HIGH_COMPLEXITY_PERCENTILE,
        )

        await expectAstComplexityChurnCorrelatorError(
            () =>
                service.calculate({
                    points: [
                        {
                            filePath: "src/a.ts",
                            complexity: 10,
                            churn: -1,
                        },
                    ],
                }),
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_CHURN,
        )

        await expectAstComplexityChurnCorrelatorError(
            () =>
                service.calculate({
                    points: [],
                }),
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.EMPTY_POINTS,
        )
    })

    test("throws retry exhausted when all load attempts fail", async () => {
        const service = new AstComplexityChurnCorrelatorService({
            loadPoints: () => Promise.reject(new Error("persistent provider outage")),
            maxLoadAttempts: 3,
            retryBackoffMs: 0,
        })

        await expectAstComplexityChurnCorrelatorError(
            () => service.calculate({filePaths: ["src/a.ts"]}),
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.RETRY_EXHAUSTED,
        )
    })

    test("throws invalid loader error when points are omitted and no loader exists", async () => {
        const service = new AstComplexityChurnCorrelatorService()

        await expectAstComplexityChurnCorrelatorError(
            () => service.calculate({filePaths: ["src/a.ts"]}),
            AST_COMPLEXITY_CHURN_CORRELATOR_ERROR_CODE.INVALID_LOAD_POINTS,
        )
    })

    test("returns cloned cached result to protect internal idempotency cache", async () => {
        const service = new AstComplexityChurnCorrelatorService({
            cacheTtlMs: 10000,
            now: () => Date.parse("2026-03-15T12:00:00.000Z"),
        })
        const input: IAstComplexityChurnCorrelatorInput = {
            points: createLinearPointDataset(),
        }

        const firstResult = await service.calculate(input)
        mutateCorrelatorResult(firstResult)
        const secondResult = await service.calculate(input)

        expect(secondResult.points[0]?.filePath).toBe("src/a.ts")
        expect(secondResult.summary.correlationCoefficient).toBe(1)
    })
})

/**
 * Creates deterministic linear dataset with perfect positive correlation.
 *
 * @returns Complexity-churn point dataset.
 */
function createLinearPointDataset(): readonly IAstComplexityChurnPointInput[] {
    return [
        {
            filePath: "src/a.ts",
            complexity: 10,
            churn: 2,
        },
        {
            filePath: "src/b.ts",
            complexity: 20,
            churn: 4,
        },
        {
            filePath: "src/c.ts",
            complexity: 30,
            churn: 6,
        },
        {
            filePath: "src/d.ts",
            complexity: 40,
            churn: 8,
        },
    ]
}

/**
 * Mutates correlator result payload to verify clone guarantees.
 *
 * @param result Correlator result payload.
 */
function mutateCorrelatorResult(result: IAstComplexityChurnCorrelatorResult): void {
    const firstPoint = result.points[0]
    if (firstPoint !== undefined) {
        ;(firstPoint as {filePath: string}).filePath = "mutated.ts"
    }
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
