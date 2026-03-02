import {afterEach, beforeEach, describe, expect, test} from "bun:test"
import {mkdtempSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {resolve} from "node:path"

import {
    buildReport,
    calculateBackoffDelayMs,
    importResource,
    main,
    parseConfig,
    reportFatalAndExit,
    runMigration,
    runMainWithFatalHandler,
    validateImportOrder,
    waitForApi,
    type IImportResourceConfig,
    type IMigrationConfig,
} from "../../../src/api/migrations/seed"

type HeuristicRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
type HeuristicResolutionMode = "ELIMINATE" | "HARDEN" | "KEEP_CODE_FIRST"

interface IRuleHeuristicsVerificationRule {
    readonly name: string
    readonly description: string
    readonly testCommand: string
}

interface IImportedRuleHeuristicsMetadata {
    readonly heuristicsSchemaVersion: number
    readonly ruleUuid: string
    readonly resolutionMode: HeuristicResolutionMode
    readonly verificationRule: IRuleHeuristicsVerificationRule
    readonly falsePositiveRisk: HeuristicRiskLevel
    readonly evidenceLevel: string
}

const BASE_CONFIG: IMigrationConfig = {
    apiUrl: "http://localhost:3000",
    adminToken: "",
    retryAttempts: 3,
    retryDelayMs: 0,
    backoffFactor: 2,
    backoffJitterRatio: 0,
    healthTimeoutMs: 50,
    importTimeoutMs: 1000,
}

const MANAGED_ENV_KEYS = [
    "MIGRATION_API_URL",
    "MIGRATION_ADMIN_TOKEN",
    "MIGRATION_RETRY_ATTEMPTS",
    "MIGRATION_RETRY_DELAY_MS",
    "MIGRATION_BACKOFF_FACTOR",
    "MIGRATION_BACKOFF_JITTER",
    "MIGRATION_HEALTH_TIMEOUT_MS",
    "MIGRATION_IMPORT_TIMEOUT_MS",
] as const

const originalFetch = globalThis.fetch
const originalEnv = new Map<string, string | undefined>()

beforeEach((): void => {
    for (const key of MANAGED_ENV_KEYS) {
        originalEnv.set(key, process.env[key])
        delete process.env[key]
    }
})

afterEach((): void => {
    globalThis.fetch = originalFetch

    for (const key of MANAGED_ENV_KEYS) {
        const originalValue = originalEnv.get(key)
        if (originalValue === undefined) {
            delete process.env[key]
            continue
        }
        process.env[key] = originalValue
    }

    originalEnv.clear()
})

/**
 * Awaits promise rejection and returns thrown error.
 *
 * @param operation Operation expected to reject.
 * @returns Rejected error instance.
 */
async function expectReject(operation: Promise<unknown>): Promise<Error> {
    try {
        await operation
    } catch (error) {
        if (error instanceof Error) {
            return error
        }
        return new Error(String(error))
    }

    throw new Error("Operation was expected to reject")
}

/**
 * Creates temporary defaults directory compatible with migration import order.
 *
 * @param options Optional overrides.
 * @returns Absolute temporary directory path.
 */
function createDefaultsDirectory(options?: {
    readonly rulesPayload?: unknown
    readonly includeSettings?: boolean
}): string {
    const defaultsDir = mkdtempSync(resolve(tmpdir(), "codenautic-migrations-"))
    const rulesPayload = options?.rulesPayload ?? []
    const includeSettings = options?.includeSettings ?? true

    writeFileSync(resolve(defaultsDir, "categories.json"), JSON.stringify([]), "utf8")
    writeFileSync(resolve(defaultsDir, "rules.json"), JSON.stringify(rulesPayload), "utf8")
    writeFileSync(resolve(defaultsDir, "prompts.json"), JSON.stringify([]), "utf8")
    writeFileSync(resolve(defaultsDir, "expert-panels.json"), JSON.stringify([]), "utf8")

    if (includeSettings) {
        writeFileSync(resolve(defaultsDir, "settings.json"), JSON.stringify([]), "utf8")
    }

    return defaultsDir
}

/**
 * Resolves request URL from fetch input variants.
 *
 * @param input Fetch input.
 * @returns Request URL string.
 */
function resolveRequestUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input
    }
    if (input instanceof URL) {
        return input.toString()
    }
    return input.url
}

/**
 * Builds rule heuristics metadata payload for tests.
 *
 * @param ruleUuid Rule UUID.
 * @param overrides Optional metadata overrides.
 * @returns Complete rule heuristics metadata object.
 */
function createRuleHeuristicsMetadata(
    ruleUuid: string,
    overrides?: Partial<IImportedRuleHeuristicsMetadata>,
): IImportedRuleHeuristicsMetadata {
    const defaults: IImportedRuleHeuristicsMetadata = {
        heuristicsSchemaVersion: 1,
        ruleUuid,
        resolutionMode: "KEEP_CODE_FIRST",
        verificationRule: {
            name: `rule-${ruleUuid.slice(0, 8)}-schema`,
            description: `Validate heuristics metadata for rule ${ruleUuid}`,
            testCommand: "bun scripts/heuristics/validate-registry.ts --rules-only",
        },
        falsePositiveRisk: "MEDIUM",
        evidenceLevel: "RULE_TEXT_ONLY",
    }

    return {
        ...defaults,
        ...overrides,
        verificationRule: {
            ...defaults.verificationRule,
            ...(overrides?.verificationRule ?? {}),
        },
    }
}

/**
 * Parses JSON request body from fetch init.
 *
 * @param body Request body value.
 * @returns Parsed JSON payload.
 */
function parseJsonBody(body: BodyInit | null | undefined): unknown {
    if (typeof body !== "string") {
        throw new Error("Expected JSON string body in mocked fetch")
    }
    return JSON.parse(body) as unknown
}

describe("migration seed helpers", () => {
    test("calculates deterministic exponential backoff delay", () => {
        const attemptOneDelay = calculateBackoffDelayMs(1, 2000, 2, 0, 0.5)
        const attemptThreeDelay = calculateBackoffDelayMs(3, 2000, 2, 0, 0.5)

        expect(attemptOneDelay).toBe(2000)
        expect(attemptThreeDelay).toBe(8000)
    })

    test("applies bounded jitter to backoff delay", () => {
        const delay = calculateBackoffDelayMs(2, 1000, 2, 0.2, 1)

        expect(delay).toBe(2400)
    })

    test("parses default migration config from env", () => {
        const config = parseConfig()

        expect(config.apiUrl).toBe("http://localhost:3000")
        expect(config.retryAttempts).toBe(3)
        expect(config.backoffFactor).toBe(2)
        expect(config.backoffJitterRatio).toBe(0.2)
    })

    test("throws for invalid positive integer env", () => {
        process.env["MIGRATION_RETRY_ATTEMPTS"] = "0"

        expect((): void => {
            parseConfig()
        }).toThrow("MIGRATION_RETRY_ATTEMPTS")
    })

    test("throws for invalid ratio env", () => {
        process.env["MIGRATION_BACKOFF_JITTER"] = "1.5"

        expect((): void => {
            parseConfig()
        }).toThrow("MIGRATION_BACKOFF_JITTER")
    })

    test("fails import immediately on non-retryable status", async () => {
        let attemptCount = 0
        globalThis.fetch = (() => {
            attemptCount += 1
            return Promise.resolve(new Response("bad request", {status: 400}))
        }) as unknown as typeof fetch

        const rejectedError = await expectReject(importResource(BASE_CONFIG, "/admin/import/rules", []))

        expect(rejectedError.message.includes("HTTP 400")).toBe(true)
        expect(attemptCount).toBe(1)
    })

    test("retries import for retryable status and then succeeds", async () => {
        let attemptCount = 0
        globalThis.fetch = (() => {
            attemptCount += 1
            if (attemptCount === 1) {
                return Promise.resolve(new Response("temporary", {status: 503}))
            }
            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        const result = await importResource(BASE_CONFIG, "/admin/import/categories", [])

        expect(result.created).toBe(1)
        expect(result.updated).toBe(0)
        expect(result.skipped).toBe(0)
        expect(attemptCount).toBe(2)
    })

    test("returns fallback error when retry attempts are zero", async () => {
        const invalidConfig: IMigrationConfig = {
            ...BASE_CONFIG,
            retryAttempts: 0,
        }

        const rejectedError = await expectReject(importResource(invalidConfig, "/admin/import/rules", []))

        expect(rejectedError.message.includes("Failed to import")).toBe(true)
    })

    test("validates import dependencies order", () => {
        const resources: readonly IImportResourceConfig[] = [
            {
                resource: "rules",
                endpoint: "/admin/import/rules",
                file: "rules.json",
                dependsOn: ["categories"],
            },
            {
                resource: "categories",
                endpoint: "/admin/import/categories",
                file: "categories.json",
            },
        ]

        expect((): void => {
            validateImportOrder(resources)
        }).toThrow("depends on")
    })

    test("fails when dependency is missing from import order", () => {
        const resources: readonly IImportResourceConfig[] = [
            {
                resource: "rules",
                endpoint: "/admin/import/rules",
                file: "rules.json",
                dependsOn: ["categories"],
            },
        ]

        expect((): void => {
            validateImportOrder(resources)
        }).toThrow("not declared")
    })

    test("waits for API readiness with retry", async () => {
        let attemptCount = 0
        globalThis.fetch = (() => {
            attemptCount += 1
            if (attemptCount === 1) {
                return Promise.reject(new Error("temporary network error"))
            }
            return Promise.resolve(new Response("ok", {status: 200}))
        }) as unknown as typeof fetch

        await waitForApi(BASE_CONFIG)

        expect(attemptCount).toBe(2)
    })

    test("throws when API is unavailable after all attempts", async () => {
        const config: IMigrationConfig = {
            ...BASE_CONFIG,
            retryAttempts: 2,
        }

        globalThis.fetch = (() => {
            return Promise.resolve(new Response("down", {status: 503}))
        }) as unknown as typeof fetch

        const rejectedError = await expectReject(waitForApi(config))

        expect(rejectedError.message.includes("API is not available")).toBe(true)
    })

    test("runs migration and imports all resources", async () => {
        const defaultsDir = createDefaultsDirectory()
        const importedEndpoints: string[] = []

        globalThis.fetch = ((input: RequestInfo | URL): Promise<Response> => {
            const url = resolveRequestUrl(input)
            importedEndpoints.push(url)
            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        try {
            const result = await runMigration(BASE_CONFIG, defaultsDir)

            expect(result.succeeded.length).toBe(5)
            expect(result.failed.length).toBe(0)
            expect(importedEndpoints.length).toBe(5)
        } finally {
            rmSync(defaultsDir, {recursive: true, force: true})
        }
    })

    test("injects heuristics metadata for rules when metadata is missing", async () => {
        const ruleUuid = "10000000-0000-0000-0000-000000000000"
        const defaultsDir = createDefaultsDirectory({
            rulesPayload: [
                {
                    uuid: ruleUuid,
                    severity: "high",
                },
            ],
        })

        let importedRulesPayload: unknown = null

        globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = resolveRequestUrl(input)
            if (url.endsWith("/admin/import/rules")) {
                importedRulesPayload = parseJsonBody(init?.body)
            }

            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        try {
            const result = await runMigration(BASE_CONFIG, defaultsDir)

            expect(result.failed.length).toBe(0)
            expect(Array.isArray(importedRulesPayload)).toBe(true)

            const importedRules = importedRulesPayload as Array<{
                uuid?: string
                heuristicsMetadata?: IImportedRuleHeuristicsMetadata
            }>
            const firstRule = importedRules[0]

            expect(firstRule?.uuid).toBe(ruleUuid)
            expect(firstRule?.heuristicsMetadata?.ruleUuid).toBe(ruleUuid)
            expect(firstRule?.heuristicsMetadata?.heuristicsSchemaVersion).toBe(1)
            expect(firstRule?.heuristicsMetadata?.resolutionMode).toBe("HARDEN")
            expect(firstRule?.heuristicsMetadata?.falsePositiveRisk).toBe("HIGH")
        } finally {
            rmSync(defaultsDir, {recursive: true, force: true})
        }
    })

    test("preserves existing rule heuristics metadata when provided", async () => {
        const ruleUuid = "20000000-0000-0000-0000-000000000000"
        const providedMetadata = createRuleHeuristicsMetadata(ruleUuid, {
            resolutionMode: "ELIMINATE",
            falsePositiveRisk: "LOW",
        })

        const defaultsDir = createDefaultsDirectory({
            rulesPayload: [
                {
                    uuid: ruleUuid,
                    severity: "critical",
                    heuristicsMetadata: providedMetadata,
                },
            ],
        })

        let importedRulesPayload: unknown = null

        globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const url = resolveRequestUrl(input)
            if (url.endsWith("/admin/import/rules")) {
                importedRulesPayload = parseJsonBody(init?.body)
            }

            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        try {
            const result = await runMigration(BASE_CONFIG, defaultsDir)

            expect(result.failed.length).toBe(0)
            expect(Array.isArray(importedRulesPayload)).toBe(true)

            const importedRules = importedRulesPayload as Array<{
                heuristicsMetadata?: IImportedRuleHeuristicsMetadata
            }>
            const importedMetadata = importedRules[0]?.heuristicsMetadata

            expect(importedMetadata?.resolutionMode).toBe("ELIMINATE")
            expect(importedMetadata?.falsePositiveRisk).toBe("LOW")
        } finally {
            rmSync(defaultsDir, {recursive: true, force: true})
        }
    })

    test("collects migration failure when settings file is missing", async () => {
        const defaultsDir = createDefaultsDirectory({includeSettings: false})

        globalThis.fetch = (() => {
            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        try {
            const result = await runMigration(BASE_CONFIG, defaultsDir)

            expect(result.succeeded.length).toBe(4)
            expect(result.failed.length).toBe(1)
            expect(result.failed[0]?.resource).toBe("settings")
        } finally {
            rmSync(defaultsDir, {recursive: true, force: true})
        }
    })

    test("collects migration failure for incompatible rule metadata", async () => {
        const ruleUuid = "00000000-0000-0000-0000-000000000000"
        const defaultsDir = createDefaultsDirectory({
            rulesPayload: [
                {
                    uuid: ruleUuid,
                    heuristicsMetadata: createRuleHeuristicsMetadata(ruleUuid, {
                        heuristicsSchemaVersion: 999,
                    }),
                },
            ],
        })

        globalThis.fetch = (() => {
            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        try {
            const result = await runMigration(BASE_CONFIG, defaultsDir)

            expect(result.failed.some((failure) => failure.resource === "rules")).toBe(true)
        } finally {
            rmSync(defaultsDir, {recursive: true, force: true})
        }
    })

    test("executes main workflow successfully with mocked API", async () => {
        globalThis.fetch = ((input: RequestInfo | URL): Promise<Response> => {
            const url = resolveRequestUrl(input)
            if (url.endsWith("/health")) {
                return Promise.resolve(new Response("ok", {status: 200}))
            }

            return Promise.resolve(
                new Response(JSON.stringify({created: 1, updated: 0, skipped: 0}), {
                    status: 200,
                }),
            )
        }) as unknown as typeof fetch

        await main()
    })

    test("throws from main when API health check never succeeds", async () => {
        process.env["MIGRATION_RETRY_ATTEMPTS"] = "1"

        globalThis.fetch = (() => {
            return Promise.resolve(new Response("down", {status: 503}))
        }) as unknown as typeof fetch

        const rejectedError = await expectReject(main())

        expect(rejectedError.message.includes("API is not available")).toBe(true)
    })

    test("reports fatal message when runMainWithFatalHandler receives rejection", async () => {
        let receivedMessage = ""

        runMainWithFatalHandler(
            (): Promise<void> => Promise.reject(new Error("string-rejection")),
            (message: string): void => {
                receivedMessage = message
            },
        )

        await Promise.resolve()

        expect(receivedMessage).toBe("string-rejection")
    })

    test("does not call fatal callback when runMainWithFatalHandler succeeds", async () => {
        let fatalCalled = false

        runMainWithFatalHandler(
            (): Promise<void> => Promise.resolve(),
            (): void => {
                fatalCalled = true
            },
        )

        await Promise.resolve()

        expect(fatalCalled).toBe(false)
    })

    test("logs fatal message and exits process", () => {
        const consoleRef = globalThis["console"]
        const originalConsoleErrorDescriptor = Object.getOwnPropertyDescriptor(consoleRef, "error")
        const originalProcessExitDescriptor = Object.getOwnPropertyDescriptor(process, "exit")

        let loggedMessage = ""
        let exitCode = 0

        Object.defineProperty(consoleRef, "error", {
            configurable: true,
            writable: true,
            value: (message?: unknown): void => {
                loggedMessage = String(message)
            },
        })
        Object.defineProperty(process, "exit", {
            configurable: true,
            writable: true,
            value: (code?: number): never => {
                exitCode = code ?? 0
                throw new Error("forced-exit")
            },
        })

        try {
            expect((): void => {
                reportFatalAndExit("boom")
            }).toThrow("forced-exit")
            expect(loggedMessage).toBe("FATAL: boom")
            expect(exitCode).toBe(1)
        } finally {
            if (originalConsoleErrorDescriptor !== undefined) {
                Object.defineProperty(consoleRef, "error", originalConsoleErrorDescriptor)
            }
            if (originalProcessExitDescriptor !== undefined) {
                Object.defineProperty(process, "exit", originalProcessExitDescriptor)
            }
        }
    })

    test("builds report with both success and failure sections", () => {
        const report = buildReport({
            succeeded: [
                {
                    resource: "categories",
                    durationMs: 100,
                    result: {
                        created: 3,
                        updated: 2,
                        skipped: 1,
                    },
                },
            ],
            failed: [
                {
                    resource: "rules",
                    reason: "HTTP 503",
                },
            ],
        })

        expect(report.includes("categories")).toBe(true)
        expect(report.includes("Failed resources")).toBe(true)
        expect(report.includes("rules")).toBe(true)
    })
})
