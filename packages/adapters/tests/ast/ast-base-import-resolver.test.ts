import {describe, expect, test} from "bun:test"

import {
    AST_BASE_IMPORT_RESOLVER_ERROR_CODE,
    AstBaseImportResolver,
    AstBaseImportResolverError,
    type IAstBaseImportResolverOptions,
    type IAstBaseNonRelativeImportResolutionInput,
} from "../../src/ast"

interface IDeferred<TValue> {
    readonly promise: Promise<TValue>
    resolve(value: TValue): void
    reject(reason?: unknown): void
}

/**
 * Test resolver implementation for abstract base class tests.
 */
class TestImportResolver extends AstBaseImportResolver {
    private readonly nonRelativeCandidatesProvider: (
        input: IAstBaseNonRelativeImportResolutionInput,
    ) => Promise<readonly string[]>

    /**
     * Creates resolver instance.
     *
     * @param options Resolver options.
     * @param nonRelativeCandidatesProvider Candidate provider.
     */
    public constructor(
        options: IAstBaseImportResolverOptions = {},
        nonRelativeCandidatesProvider?: (
            input: IAstBaseNonRelativeImportResolutionInput,
        ) => Promise<readonly string[]>,
    ) {
        super(options)
        this.nonRelativeCandidatesProvider =
            nonRelativeCandidatesProvider ?? (() => Promise.resolve([]))
    }

    /**
     * Resolves non-relative import candidates for tests.
     *
     * @param input Normalized non-relative input.
     * @returns Candidate target paths.
     */
    protected resolveNonRelativeCandidates(
        input: IAstBaseNonRelativeImportResolutionInput,
    ): Promise<readonly string[]> {
        return this.nonRelativeCandidatesProvider(input)
    }
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
 * Asserts typed base-import-resolver error for sync action.
 *
 * @param callback Action expected to throw.
 * @param code Expected error code.
 */
function expectAstBaseImportResolverError(
    callback: () => unknown,
    code: (typeof AST_BASE_IMPORT_RESOLVER_ERROR_CODE)[keyof typeof AST_BASE_IMPORT_RESOLVER_ERROR_CODE],
): void {
    try {
        callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBaseImportResolverError)

        if (error instanceof AstBaseImportResolverError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBaseImportResolverError to be thrown")
}

/**
 * Asserts typed base-import-resolver error for async action.
 *
 * @param callback Async action expected to reject.
 * @param code Expected error code.
 * @returns Promise resolved when assertion passes.
 */
async function expectAstBaseImportResolverErrorAsync(
    callback: () => Promise<unknown>,
    code: (typeof AST_BASE_IMPORT_RESOLVER_ERROR_CODE)[keyof typeof AST_BASE_IMPORT_RESOLVER_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(AstBaseImportResolverError)

        if (error instanceof AstBaseImportResolverError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected AstBaseImportResolverError to be thrown")
}

describe("AstBaseImportResolver", () => {
    test("resolves relative imports using extension candidates", async () => {
        const resolver = new TestImportResolver({
            pathExists: (filePath) =>
                Promise.resolve(filePath === "src/app/shared/util.ts"),
        })

        const result = await resolver.resolveImport({
            sourceFilePath: "src/app/main.ts",
            importSource: "./shared/util",
        })

        expect(result.isRelativeImport).toBe(true)
        expect(result.resolvedFilePath).toBe("src/app/shared/util.ts")
        expect(result.candidateFilePaths[0]).toBe("src/app/shared/util.ts")
    })

    test("delegates non-relative imports to subclass candidate provider", async () => {
        let providerInput: IAstBaseNonRelativeImportResolutionInput | undefined
        const resolver = new TestImportResolver(
            {
                pathExists: (filePath) =>
                    Promise.resolve(filePath === "node_modules/library/index.ts"),
            },
            (input) => {
                providerInput = input
                return Promise.resolve([
                    "node_modules/library/index.ts",
                    "node_modules/library/index.js",
                ])
            },
        )

        const result = await resolver.resolveImport({
            sourceFilePath: "src/feature/service.ts",
            importSource: "@scope/library",
        })

        expect(result.isRelativeImport).toBe(false)
        expect(result.resolvedFilePath).toBe("node_modules/library/index.ts")
        expect(providerInput?.sourceDirectoryPath).toBe("src/feature")
        expect(providerInput?.importSource).toBe("@scope/library")
    })

    test("retries transient resolution failures with exponential backoff", async () => {
        const backoffDurations: number[] = []
        let pathExistsCallCount = 0
        const resolver = new TestImportResolver({
            pathExists: (filePath) => {
                pathExistsCallCount += 1

                if (pathExistsCallCount === 1) {
                    return Promise.reject(new Error("temporary io failure"))
                }

                return Promise.resolve(filePath === "src/retry/target.ts")
            },
            sleep: (durationMs) => {
                backoffDurations.push(durationMs)
                return Promise.resolve()
            },
        })

        const result = await resolver.resolveImport({
            sourceFilePath: "src/retry/source.ts",
            importSource: "./target",
            retryPolicy: {
                maxAttempts: 3,
                initialBackoffMs: 5,
                maxBackoffMs: 10,
            },
        })

        expect(result.attempts).toBe(2)
        expect(result.resolvedFilePath).toBe("src/retry/target.ts")
        expect(backoffDurations).toEqual([5])
    })

    test("deduplicates in-flight and cached resolution by idempotency key", async () => {
        const gate = createDeferred<void>()
        let pathExistsCallCount = 0
        const resolver = new TestImportResolver({
            pathExists: async (filePath) => {
                pathExistsCallCount += 1
                await gate.promise
                return filePath === "src/idem/target.ts"
            },
        })

        const firstResolution = resolver.resolveImport({
            sourceFilePath: "src/idem/source.ts",
            importSource: "./target",
            idempotencyKey: "same-key",
        })
        const duplicatedInFlightResolution = resolver.resolveImport({
            sourceFilePath: "src/idem/ignored.ts",
            importSource: "./ignored",
            idempotencyKey: "same-key",
        })

        expect(firstResolution).toBe(duplicatedInFlightResolution)

        gate.resolve(undefined)
        const firstResult = await firstResolution
        expect(firstResult.resolvedFilePath).toBe("src/idem/target.ts")

        const cachedResult = await resolver.resolveImport({
            sourceFilePath: "src/idem/other.ts",
            importSource: "./other",
            idempotencyKey: "same-key",
        })

        expect(cachedResult).toEqual(firstResult)
        expect(pathExistsCallCount).toBe(1)
    })

    test("caches resolved import paths by normalized source and import when idempotency key is absent", async () => {
        let pathExistsCallCount = 0
        const resolver = new TestImportResolver({
            pathExists: (filePath) => {
                pathExistsCallCount += 1
                return Promise.resolve(filePath === "src/cache/target.ts")
            },
        })

        const firstResult = await resolver.resolveImport({
            sourceFilePath: "src/cache/source.ts",
            importSource: "./target",
        })
        const callCountAfterFirstResolution = pathExistsCallCount
        const cachedResult = await resolver.resolveImport({
            sourceFilePath: "src/cache/source.ts",
            importSource: "   ./target   ",
        })
        expect(pathExistsCallCount).toBe(callCountAfterFirstResolution)

        const differentImportResult = await resolver.resolveImport({
            sourceFilePath: "src/cache/source.ts",
            importSource: "./other-target",
        })

        expect(firstResult).toEqual(cachedResult)
        expect(cachedResult.resolvedFilePath).toBe("src/cache/target.ts")
        expect(pathExistsCallCount).toBeGreaterThan(callCountAfterFirstResolution)
        expect(callCountAfterFirstResolution).toBe(1)
        expect(differentImportResult.resolvedFilePath).toBeNull()
    })

    test("throws typed errors for invalid options input candidates and terminal failures", async () => {
        expectAstBaseImportResolverError(
            () => {
                void new TestImportResolver({
                    fileExtensionCandidates: ["ts"],
                })
            },
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_FILE_EXTENSION_CANDIDATE,
        )

        const resolver = new TestImportResolver({
            pathExists: () => Promise.resolve(false),
        })

        await expectAstBaseImportResolverErrorAsync(
            async () =>
                resolver.resolveImport({
                    sourceFilePath: "   ",
                    importSource: "./target",
                }),
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_SOURCE_FILE_PATH,
        )

        const invalidCandidateResolver = new TestImportResolver(
            {
                pathExists: () => Promise.resolve(false),
            },
            () => Promise.resolve(["   "]),
        )

        await expectAstBaseImportResolverErrorAsync(
            async () =>
                invalidCandidateResolver.resolveImport({
                    sourceFilePath: "src/feature/file.ts",
                    importSource: "@alias/internal",
                }),
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.INVALID_RESOLVER_CANDIDATE,
        )

        const failingResolver = new TestImportResolver({
            pathExists: () => Promise.reject(new Error("hard failure")),
            retryPolicy: {
                maxAttempts: 2,
                initialBackoffMs: 1,
                maxBackoffMs: 1,
            },
            sleep: () => Promise.resolve(),
        })

        await expectAstBaseImportResolverErrorAsync(
            async () =>
                failingResolver.resolveImport({
                    sourceFilePath: "src/fail/source.ts",
                    importSource: "./target",
                }),
            AST_BASE_IMPORT_RESOLVER_ERROR_CODE.IMPORT_RESOLUTION_FAILED,
        )
    })
})
