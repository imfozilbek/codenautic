/**
 * CLI migration: загружает seed данные через Admin API.
 *
 * Использование: bun run migrate:seed
 *
 * Env:
 *   MIGRATION_API_URL         — базовый URL API (default: http://localhost:3000)
 *   MIGRATION_ADMIN_TOKEN     — admin API key (default: "" — dev mode)
 *   MIGRATION_RETRY_ATTEMPTS  — количество retry попыток (default: 3)
 *   MIGRATION_RETRY_DELAY_MS  — базовая задержка retry (default: 2000)
 *   MIGRATION_BACKOFF_FACTOR  — множитель экспоненциального backoff (default: 2)
 *   MIGRATION_BACKOFF_JITTER  — максимум jitter ratio [0..1] (default: 0.2)
 *   MIGRATION_HEALTH_TIMEOUT_MS — timeout health check (default: 5000)
 *   MIGRATION_IMPORT_TIMEOUT_MS — timeout import request (default: 120000)
 */
import {resolve} from "path"

interface IMigrationConfig {
    apiUrl: string
    adminToken: string
    retryAttempts: number
    retryDelayMs: number
    backoffFactor: number
    backoffJitterRatio: number
    healthTimeoutMs: number
    importTimeoutMs: number
}

interface IImportResult {
    created: number
    updated: number
    skipped: number
}

interface IResourceResult {
    resource: string
    result: IImportResult
    durationMs: number
}

interface IMigrationFailure {
    resource: string
    reason: string
}

interface IMigrationExecutionResult {
    succeeded: readonly IResourceResult[]
    failed: readonly IMigrationFailure[]
}

interface IImportResourceConfig {
    resource: "categories" | "rules" | "prompts" | "expert-panels" | "settings"
    endpoint: string
    file: string
    dependsOn?: readonly IImportResourceConfig["resource"][]
}

interface IRuleImportPayloadItem {
    readonly uuid: string
    readonly severity?: string
    readonly heuristicsMetadata?: unknown
}

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

const DEFAULT_API_URL = "http://localhost:3000"
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 2000
const DEFAULT_BACKOFF_FACTOR = 2
const DEFAULT_BACKOFF_JITTER_RATIO = 0.2
const DEFAULT_HEALTH_TIMEOUT_MS = 5000
const DEFAULT_IMPORT_TIMEOUT_MS = 120000
const SUPPORTED_HEURISTICS_SCHEMA_VERSION = 1
const RULE_EVIDENCE_LEVEL = "RULE_TEXT_ONLY"
const RULE_VERIFICATION_COMMAND = "bun scripts/heuristics/validate-registry.ts --rules-only"

const HEURISTIC_RISK_LEVELS = new Set<HeuristicRiskLevel>(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
const HEURISTIC_RESOLUTION_MODES = new Set<HeuristicResolutionMode>([
    "ELIMINATE",
    "HARDEN",
    "KEEP_CODE_FIRST",
])

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

const IMPORT_ORDER: readonly IImportResourceConfig[] = [
    {
        resource: "categories",
        endpoint: "/admin/import/categories",
        file: "categories.json",
    },
    {
        resource: "rules",
        endpoint: "/admin/import/rules",
        file: "rules.json",
        dependsOn: ["categories"],
    },
    {
        resource: "prompts",
        endpoint: "/admin/import/prompts",
        file: "prompts.json",
    },
    {
        resource: "expert-panels",
        endpoint: "/admin/import/expert-panels",
        file: "expert-panels.json",
    },
    {
        resource: "settings",
        endpoint: "/admin/import/settings",
        file: "settings.json",
    },
]

/**
 * Error type used for HTTP import failures.
 */
class HttpImportError extends Error {
    public readonly status: number

    public constructor(status: number, message: string) {
        super(message)
        this.status = status
        this.name = "HttpImportError"
    }
}

/**
 * Parses migration configuration from environment variables.
 *
 * @returns Parsed and validated migration configuration.
 */
function parseConfig(): IMigrationConfig {
    return {
        apiUrl: process.env["MIGRATION_API_URL"] ?? DEFAULT_API_URL,
        adminToken: process.env["MIGRATION_ADMIN_TOKEN"] ?? "",
        retryAttempts: parsePositiveIntegerEnv("MIGRATION_RETRY_ATTEMPTS", DEFAULT_RETRY_ATTEMPTS),
        retryDelayMs: parsePositiveIntegerEnv("MIGRATION_RETRY_DELAY_MS", DEFAULT_RETRY_DELAY_MS),
        backoffFactor: parsePositiveNumberEnv("MIGRATION_BACKOFF_FACTOR", DEFAULT_BACKOFF_FACTOR),
        backoffJitterRatio: parseRatioEnv("MIGRATION_BACKOFF_JITTER", DEFAULT_BACKOFF_JITTER_RATIO),
        healthTimeoutMs: parsePositiveIntegerEnv("MIGRATION_HEALTH_TIMEOUT_MS", DEFAULT_HEALTH_TIMEOUT_MS),
        importTimeoutMs: parsePositiveIntegerEnv("MIGRATION_IMPORT_TIMEOUT_MS", DEFAULT_IMPORT_TIMEOUT_MS),
    }
}

/**
 * Parses positive integer from env.
 *
 * @param key Env variable key.
 * @param fallback Fallback value.
 * @returns Positive integer value.
 */
function parsePositiveIntegerEnv(key: string, fallback: number): number {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    const parsed = Number.parseInt(rawValue, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`${key} must be a positive integer`)
    }
    return parsed
}

/**
 * Parses positive number from env.
 *
 * @param key Env variable key.
 * @param fallback Fallback value.
 * @returns Positive number value.
 */
function parsePositiveNumberEnv(key: string, fallback: number): number {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${key} must be a positive number`)
    }
    return parsed
}

/**
 * Parses ratio in range [0, 1] from env.
 *
 * @param key Env variable key.
 * @param fallback Fallback value.
 * @returns Ratio value.
 */
function parseRatioEnv(key: string, fallback: number): number {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new Error(`${key} must be a ratio in range [0, 1]`)
    }
    return parsed
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === "string") {
        return error
    }
    return "Unknown error"
}

/**
 * Validates import order using declared dependencies.
 *
 * @param resources Ordered resources to be imported.
 * @throws Error When dependency appears after dependent resource.
 */
function validateImportOrder(resources: readonly IImportResourceConfig[]): void {
    const importPosition = new Map<IImportResourceConfig["resource"], number>()

    resources.forEach((resource, index) => {
        importPosition.set(resource.resource, index)
    })

    for (const resource of resources) {
        const currentPosition = importPosition.get(resource.resource)
        if (currentPosition === undefined || resource.dependsOn === undefined) {
            continue
        }

        for (const dependency of resource.dependsOn) {
            const dependencyPosition = importPosition.get(dependency)
            if (dependencyPosition === undefined) {
                throw new Error(`Import dependency '${dependency}' is not declared in IMPORT_ORDER`)
            }
            if (dependencyPosition > currentPosition) {
                throw new Error(
                    `Import order is invalid: '${resource.resource}' depends on '${dependency}', but dependency is imported later`,
                )
            }
        }
    }
}

/**
 * Validates API availability with retry policy.
 *
 * @param config Migration configuration.
 * @throws Error When API remains unavailable after all attempts.
 */
async function waitForApi(config: IMigrationConfig): Promise<void> {
    let lastErrorMessage = "API health check failed"

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
            const response = await fetch(`${config.apiUrl}/health`, {
                signal: AbortSignal.timeout(config.healthTimeoutMs),
            })
            if (response.ok) {
                return
            }
            lastErrorMessage = `Health endpoint returned HTTP ${response.status}`
        } catch (error) {
            lastErrorMessage = toErrorMessage(error)
        }

        if (attempt < config.retryAttempts) {
            console.error(
                `  API not ready, retrying in ${config.retryDelayMs}ms... (${attempt}/${config.retryAttempts})`,
            )
            await sleep(config.retryDelayMs)
        }
    }

    throw new Error(
        `API is not available after ${config.retryAttempts} attempts: ${lastErrorMessage}`,
    )
}

/**
 * Calculates retry delay with exponential backoff and bounded jitter.
 *
 * @param attempt Attempt number (1-based).
 * @param baseDelayMs Base delay in milliseconds.
 * @param backoffFactor Exponential factor.
 * @param jitterRatio Additional jitter ratio in range [0, 1].
 * @param randomValue Random value in range [0, 1].
 * @returns Delay in milliseconds.
 */
function calculateBackoffDelayMs(
    attempt: number,
    baseDelayMs: number,
    backoffFactor: number,
    jitterRatio: number,
    randomValue: number,
): number {
    const exponent = Math.max(attempt - 1, 0)
    const baseDelay = baseDelayMs * backoffFactor ** exponent
    const boundedRandom = Math.min(Math.max(randomValue, 0), 1)
    const jitter = baseDelay * jitterRatio * boundedRandom
    return Math.round(baseDelay + jitter)
}

/**
 * Detects whether status is retryable by migration policy.
 *
 * @param status HTTP status code.
 * @returns True when retry is allowed.
 */
function isRetryableHttpStatus(status: number): boolean {
    return RETRYABLE_HTTP_STATUS.has(status)
}

/**
 * Detects whether error is retryable by migration policy.
 *
 * @param error Import error.
 * @returns True when retry is allowed.
 */
function isRetryableImportError(error: unknown): boolean {
    if (error instanceof HttpImportError) {
        return isRetryableHttpStatus(error.status)
    }
    return error instanceof Error
}

/**
 * Imports a single resource with retry/backoff policy.
 *
 * @param config Migration configuration.
 * @param endpoint Import endpoint.
 * @param data JSON payload for import endpoint.
 * @returns Import operation result.
 */
async function importResource(
    config: IMigrationConfig,
    endpoint: string,
    data: unknown,
): Promise<IImportResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
            const response = await fetch(`${config.apiUrl}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-api-key": config.adminToken,
                },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(config.importTimeoutMs),
            })

            if (!response.ok) {
                const body = await response.text()
                throw new HttpImportError(response.status, `HTTP ${response.status}: ${body}`)
            }

            return (await response.json()) as IImportResult
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            const retryable = isRetryableImportError(error)

            if (!retryable || attempt >= config.retryAttempts) {
                break
            }

            const delay = calculateBackoffDelayMs(
                attempt,
                config.retryDelayMs,
                config.backoffFactor,
                config.backoffJitterRatio,
                Math.random(),
            )

            console.error(`  Retry ${attempt}/${config.retryAttempts} for ${endpoint} in ${delay}ms...`)
            await sleep(delay)
        }
    }

    throw lastError ?? new Error(`Failed to import ${endpoint}`)
}

/**
 * Validates rules payload metadata compatibility.
 *
 * @param data Parsed import payload.
 */
function validateRulesMetadataCompatibility(data: unknown): void {
    if (!Array.isArray(data)) {
        return
    }

    for (const item of data) {
        if (!isRuleImportPayloadItem(item)) {
            continue
        }

        const metadata = item.heuristicsMetadata
        if (metadata === undefined) {
            throw new Error(`Rule metadata is required for rule '${item.uuid}'`)
        }

        if (!isRuleHeuristicsMetadata(metadata)) {
            throw new Error(`Unsupported heuristics metadata shape for rule '${item.uuid}'`)
        }

        if (metadata.heuristicsSchemaVersion !== SUPPORTED_HEURISTICS_SCHEMA_VERSION) {
            throw new Error(
                `Unsupported heuristics schema version '${metadata.heuristicsSchemaVersion}' for rule '${item.uuid}'`,
            )
        }

        if (metadata.ruleUuid !== item.uuid) {
            throw new Error(`Rule metadata mismatch: metadata.ruleUuid must equal uuid for '${item.uuid}'`)
        }
    }
}

/**
 * Type guard for rule import payload item.
 *
 * @param value Unknown item.
 * @returns True when item has rule UUID.
 */
function isRuleImportPayloadItem(value: unknown): value is IRuleImportPayloadItem {
    if (!isRecord(value)) {
        return false
    }

    if (!isNonEmptyString(value["uuid"])) {
        return false
    }

    return value["severity"] === undefined || typeof value["severity"] === "string"
}

/**
 * Type guard for heuristics metadata transported with imported rule.
 *
 * @param value Unknown metadata value.
 * @returns True when metadata has expected shape.
 */
function isRuleHeuristicsMetadata(value: unknown): value is IImportedRuleHeuristicsMetadata {
    if (!isRecord(value)) {
        return false
    }

    return (
        typeof value["heuristicsSchemaVersion"] === "number" &&
        Number.isFinite(value["heuristicsSchemaVersion"]) &&
        isNonEmptyString(value["ruleUuid"]) &&
        isHeuristicResolutionMode(value["resolutionMode"]) &&
        isHeuristicRiskLevel(value["falsePositiveRisk"]) &&
        isNonEmptyString(value["evidenceLevel"]) &&
        isVerificationRule(value["verificationRule"])
    )
}

/**
 * Builds imported-rule heuristics metadata for a single UUID.
 *
 * @param item Rule payload item.
 * @returns Metadata attached to imported rule.
 */
function buildRuleHeuristicsMetadata(item: IRuleImportPayloadItem): IImportedRuleHeuristicsMetadata {
    const falsePositiveRisk = severityToRiskLevel(item.severity)
    const resolutionMode = riskLevelToResolutionMode(falsePositiveRisk)

    return {
        heuristicsSchemaVersion: SUPPORTED_HEURISTICS_SCHEMA_VERSION,
        ruleUuid: item.uuid,
        resolutionMode,
        verificationRule: {
            name: `rule-${item.uuid.slice(0, 8)}-schema`,
            description: `Validate heuristics metadata for rule ${item.uuid}`,
            testCommand: RULE_VERIFICATION_COMMAND,
        },
        falsePositiveRisk,
        evidenceLevel: RULE_EVIDENCE_LEVEL,
    }
}

/**
 * Maps rule severity label to heuristic false-positive risk.
 *
 * @param severity Rule severity label.
 * @returns Normalized risk level.
 */
function severityToRiskLevel(severity: string | undefined): HeuristicRiskLevel {
    const normalized = severity?.toLowerCase()

    if (normalized === "critical") {
        return "CRITICAL"
    }
    if (normalized === "high") {
        return "HIGH"
    }
    if (normalized === "medium") {
        return "MEDIUM"
    }
    return "LOW"
}

/**
 * Maps heuristic risk level to rule resolution mode.
 *
 * @param riskLevel Heuristic risk level.
 * @returns Resolution mode selected for rule metadata.
 */
function riskLevelToResolutionMode(riskLevel: HeuristicRiskLevel): HeuristicResolutionMode {
    if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
        return "HARDEN"
    }
    return "KEEP_CODE_FIRST"
}

/**
 * Detects whether unknown value is object-like record.
 *
 * @param value Unknown value.
 * @returns True when value is record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

/**
 * Detects whether unknown value is non-empty string.
 *
 * @param value Unknown value.
 * @returns True when value is non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0
}

/**
 * Validates heuristic risk level literal.
 *
 * @param value Unknown value.
 * @returns True when value is supported risk level.
 */
function isHeuristicRiskLevel(value: unknown): value is HeuristicRiskLevel {
    return typeof value === "string" && HEURISTIC_RISK_LEVELS.has(value as HeuristicRiskLevel)
}

/**
 * Validates heuristic resolution mode literal.
 *
 * @param value Unknown value.
 * @returns True when value is supported resolution mode.
 */
function isHeuristicResolutionMode(value: unknown): value is HeuristicResolutionMode {
    return typeof value === "string" && HEURISTIC_RESOLUTION_MODES.has(value as HeuristicResolutionMode)
}

/**
 * Validates heuristics verification rule object.
 *
 * @param value Unknown value.
 * @returns True when verification rule has required fields.
 */
function isVerificationRule(value: unknown): value is IRuleHeuristicsVerificationRule {
    if (!isRecord(value)) {
        return false
    }

    return (
        isNonEmptyString(value["name"]) &&
        isNonEmptyString(value["description"]) &&
        isNonEmptyString(value["testCommand"])
    )
}

/**
 * Normalizes payload prior to import call.
 *
 * @param resource Resource descriptor.
 * @param payload Parsed resource payload.
 * @returns Normalized payload that can be imported.
 */
function normalizePayloadForImport(resource: IImportResourceConfig, payload: unknown): unknown {
    if (resource.resource !== "rules") {
        return payload
    }

    if (!Array.isArray(payload)) {
        return payload
    }

    const payloadItems = payload as unknown[]

    return payloadItems.map((item: unknown) => {
        if (!isRuleImportPayloadItem(item)) {
            return item
        }

        if (item.heuristicsMetadata !== undefined) {
            return item
        }

        return {
            ...item,
            heuristicsMetadata: buildRuleHeuristicsMetadata(item),
        }
    })
}

/**
 * Validates payload compatibility before import.
 *
 * @param resource Resource descriptor.
 * @param payload Parsed payload.
 */
function validatePayloadCompatibility(resource: IImportResourceConfig, payload: unknown): void {
    if (resource.resource === "rules") {
        validateRulesMetadataCompatibility(payload)
    }
}

/**
 * Executes migration for all resources and accumulates failures.
 *
 * @param config Migration configuration.
 * @param defaultsDir Absolute path to defaults directory.
 * @returns Summary of succeeded and failed imports.
 */
async function runMigration(
    config: IMigrationConfig,
    defaultsDir: string,
): Promise<IMigrationExecutionResult> {
    const succeeded: IResourceResult[] = []
    const failed: IMigrationFailure[] = []

    for (const resourceConfig of IMPORT_ORDER) {
        const {resource, endpoint, file} = resourceConfig
        console.error(`Importing ${resource}...`)

        const startedAt = performance.now()

        try {
            const filePath = `${defaultsDir}/${file}`
            const payloadFile = Bun.file(filePath)
            const fileExists = await payloadFile.exists()

            if (!fileExists) {
                throw new Error(`File not found: ${filePath}`)
            }

            const payload: unknown = await payloadFile.json()
            const normalizedPayload = normalizePayloadForImport(resourceConfig, payload)
            validatePayloadCompatibility(resourceConfig, normalizedPayload)

            const importResult = await importResource(config, endpoint, normalizedPayload)
            const durationMs = Math.round(performance.now() - startedAt)

            succeeded.push({
                resource,
                result: importResult,
                durationMs,
            })

            console.error(
                `  Done: created=${importResult.created}, updated=${importResult.updated}, skipped=${importResult.skipped} (${durationMs}ms)`,
            )
        } catch (error) {
            const reason = toErrorMessage(error)
            failed.push({resource, reason})
            console.error(`  ERROR: ${reason}`)
        }
    }

    return {succeeded, failed}
}

/**
 * Builds migration report from successful and failed resources.
 *
 * @param executionResult Execution summary.
 * @returns Human-readable report.
 */
function buildReport(executionResult: IMigrationExecutionResult): string {
    const lines: string[] = ["", "=== Migration Report ===", ""]

    let totalCreated = 0
    let totalUpdated = 0
    let totalSkipped = 0

    for (const resourceResult of executionResult.succeeded) {
        const {created, updated, skipped} = resourceResult.result
        totalCreated += created
        totalUpdated += updated
        totalSkipped += skipped

        lines.push(
            `  ${resourceResult.resource.padEnd(12)} created: ${created}, updated: ${updated}, skipped: ${skipped} (${resourceResult.durationMs}ms)`,
        )
    }

    lines.push("")
    lines.push(
        `  Total success: created: ${totalCreated}, updated: ${totalUpdated}, skipped: ${totalSkipped}`,
    )

    if (executionResult.failed.length > 0) {
        lines.push("")
        lines.push("  Failed resources:")
        for (const failure of executionResult.failed) {
            lines.push(`    - ${failure.resource}: ${failure.reason}`)
        }
    }

    lines.push("")
    return lines.join("\n")
}

async function main(): Promise<void> {
    const config = parseConfig()
    const defaultsDir = resolve(import.meta.dir, "defaults")

    validateImportOrder(IMPORT_ORDER)

    console.error("Migration: seed default data via Admin API")
    console.error(`  API URL: ${config.apiUrl}`)
    console.error("")

    console.error("Checking API availability...")
    await waitForApi(config)
    console.error("  API is ready.")
    console.error("")

    const executionResult = await runMigration(config, defaultsDir)
    console.error(buildReport(executionResult))

    if (executionResult.failed.length > 0) {
        throw new Error(`Migration finished with ${executionResult.failed.length} failed resource(s)`)
    }
}

/**
 * Runs migration main flow and reports fatal errors using provided callback.
 *
 * @param runMain Main migration routine.
 * @param onFatal Fatal error callback.
 */
function runMainWithFatalHandler(
    runMain: () => Promise<void>,
    onFatal: (message: string) => void,
): void {
    void runMain().catch((error: unknown) => {
        const message = toErrorMessage(error)
        onFatal(message)
    })
}

/**
 * Reports fatal migration error and exits process with non-zero code.
 *
 * @param message Fatal error message.
 */
function reportFatalAndExit(message: string): void {
    console.error(`FATAL: ${message}`)
    process.exit(1)
}

/**
 * Автозапуск только при прямом вызове (не при импорте из тестов).
 */
const isDirectRun = import.meta.path === Bun.main

if (isDirectRun) {
    runMainWithFatalHandler(main, reportFatalAndExit)
}

export {
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
}
export type {
    IImportResult,
    IImportResourceConfig,
    IMigrationConfig,
    IMigrationExecutionResult,
    IMigrationFailure,
    IResourceResult,
}
