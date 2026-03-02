import {createHash} from "node:crypto"
import {mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from "node:fs"
import {resolve, relative} from "node:path"

type HeuristicType =
    | "THRESHOLD"
    | "SCORING"
    | "WEIGHTING"
    | "RETRY_BACKOFF"
    | "TIMEOUT"
    | "RANKING"
    | "FALLBACK_DEFAULT"
    | "RATE_LIMIT"
    | "RESOURCE_LIMIT"
    | "DRIFT_SIGNAL"
    | "PREDICTION_CONFIDENCE"
    | "OTHER"

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
type ResolutionMode = "ELIMINATE" | "HARDEN" | "KEEP_CODE_FIRST"
type Status = "UNTRIAGED" | "TRIAGED" | "IMPLEMENTED"

interface IHeuristicVerificationRule {
    name: string
    description: string
    testCommand: string
}

interface IHeuristicRegistryEntry {
    id: string
    source_file: string
    source_line: number
    heuristic_type: HeuristicType
    current_expression: string
    risk_level: RiskLevel
    resolution_mode: ResolutionMode
    target_change: string
    tests_required: string[]
    owner_package: string
    status: Status
    rule_uuid?: string
    severity?: string
    buckets?: string[]
    false_positive_risk?: RiskLevel
    evidence_level?: string
    verification_rule?: IHeuristicVerificationRule
}

interface IRuleJsonRecord {
    uuid: string
    title: string
    rule: string
    severity: string
    buckets: string[]
}

interface IRegistryDocument {
    heuristicsSchemaVersion: number
    generatedAt: string
    entries: IHeuristicRegistryEntry[]
}

const HEURISTICS_SCHEMA_VERSION = 1
const RULES_FILE_PATH = "packages/runtime/src/api/migrations/defaults/rules.json"
const REGISTRY_JSON_PATH = "docs/heuristics/heuristics-registry.json"
const REGISTRY_CSV_PATH = "docs/heuristics/heuristics-registry.csv"
const RULES_REGISTRY_CSV_PATH = "docs/heuristics/rules-794-registry.csv"
const COVERAGE_REPORT_PATH = "docs/heuristics/coverage-report.md"

const GLOBAL_HEURISTIC_PATTERN =
    /heuristic|эврист|threshold|score|weight|retry|backoff|timeout|risk|confidence|rank|hotspot|drift|fallback|default|корректно\s+обрабатывает/i

const SCAN_IGNORES = new Set([".git", "node_modules", "dist", "coverage", ".idea"])

const CODE_FILE_EXTENSIONS = new Set([".ts", ".tsx", ".json"])

function main(): void {
    const repositoryRoot = process.cwd()
    const allFiles = walkDirectory(repositoryRoot)

    const codeFiles = allFiles.filter((path) => isCodeScanFile(path))
    const planFiles = allFiles.filter((path) => isPlanScanFile(path))

    const codeEntries = buildEntriesFromFiles(codeFiles, "H-CODE")
    const planEntries = buildEntriesFromFiles(planFiles, "H-PLAN")
    const ruleEntries = buildRuleEntries(repositoryRoot)

    const allEntries = [...codeEntries, ...planEntries, ...ruleEntries]

    const registryDocument: IRegistryDocument = {
        heuristicsSchemaVersion: HEURISTICS_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        entries: allEntries,
    }

    mkdirSync(resolve(repositoryRoot, "docs/heuristics"), {recursive: true})

    writeJson(REGISTRY_JSON_PATH, registryDocument)
    writeHeuristicsCsv(REGISTRY_CSV_PATH, allEntries)
    writeHeuristicsCsv(RULES_REGISTRY_CSV_PATH, ruleEntries)
    writeCoverageReport(COVERAGE_REPORT_PATH, codeEntries, planEntries, ruleEntries)

    process.stdout.write(
        `Built heuristics registry: code=${codeEntries.length}, plan=${planEntries.length}, rules=${ruleEntries.length}\n`,
    )
}

function walkDirectory(rootDirectory: string): string[] {
    const files: string[] = []
    const stack: string[] = [rootDirectory]

    while (stack.length > 0) {
        const currentDirectory = stack.pop()
        if (currentDirectory === undefined) {
            continue
        }

        const entries = readdirSync(currentDirectory, {withFileTypes: true})
        for (const entry of entries) {
            const absolutePath = resolve(currentDirectory, entry.name)
            const relativePath = toPosix(relative(process.cwd(), absolutePath))

            if (entry.isDirectory()) {
                if (SCAN_IGNORES.has(entry.name)) {
                    continue
                }
                stack.push(absolutePath)
                continue
            }

            if (!entry.isFile()) {
                continue
            }

            if (relativePath.length === 0) {
                continue
            }

            files.push(relativePath)
        }
    }

    return files.sort((left, right) => left.localeCompare(right))
}

function isCodeScanFile(filePath: string): boolean {
    if (!filePath.startsWith("packages/")) {
        return false
    }

    if (!filePath.includes("/src/")) {
        return false
    }

    const extension = getExtension(filePath)
    return CODE_FILE_EXTENSIONS.has(extension)
}

function isPlanScanFile(filePath: string): boolean {
    if (filePath === "ROADMAP.md" || filePath === "PRODUCT.md") {
        return true
    }

    if (filePath.startsWith("packages/") && filePath.endsWith("/TODO.md")) {
        return true
    }

    if (filePath.startsWith("packages/") && filePath.includes("/todo/") && filePath.endsWith(".md")) {
        return true
    }

    if (filePath.startsWith("docs/ddd/") && filePath.endsWith(".md")) {
        return true
    }

    return false
}

function getExtension(filePath: string): string {
    const extensionIndex = filePath.lastIndexOf(".")
    if (extensionIndex === -1) {
        return ""
    }
    return filePath.slice(extensionIndex)
}

function buildEntriesFromFiles(filePaths: readonly string[], idPrefix: string): IHeuristicRegistryEntry[] {
    const entries: IHeuristicRegistryEntry[] = []

    for (const filePath of filePaths) {
        const absolutePath = resolve(process.cwd(), filePath)
        const fileContent = readFileSync(absolutePath, "utf8")
        const lines = fileContent.split(/\r?\n/)

        lines.forEach((line, index) => {
            if (!GLOBAL_HEURISTIC_PATTERN.test(line)) {
                return
            }

            const heuristicType = detectHeuristicType(line)
            const riskLevel = detectRiskLevel(line)
            const resolutionMode = detectResolutionMode(riskLevel)
            const stableId = buildStableHeuristicId(idPrefix, filePath, index + 1, line)
            const verificationRule = buildVerificationRule(stableId)

            entries.push({
                id: stableId,
                source_file: filePath,
                source_line: index + 1,
                heuristic_type: heuristicType,
                current_expression: compactExpression(line),
                risk_level: riskLevel,
                resolution_mode: resolutionMode,
                target_change: getTargetChange(heuristicType),
                tests_required: getTestsRequired(heuristicType),
                owner_package: detectOwnerPackage(filePath),
                status: "TRIAGED",
                verification_rule: verificationRule,
            })
        })
    }

    return entries
}

function buildStableHeuristicId(
    idPrefix: string,
    filePath: string,
    lineNumber: number,
    lineContent: string,
): string {
    const digest = createHash("sha1")
        .update(`${filePath}:${lineNumber}:${compactExpression(lineContent)}`)
        .digest("hex")
        .slice(0, 12)

    return `${idPrefix}-${digest.toUpperCase()}`
}

function buildRuleEntries(repositoryRoot: string): IHeuristicRegistryEntry[] {
    const rulesPath = resolve(repositoryRoot, RULES_FILE_PATH)
    const rulesContent = readFileSync(rulesPath, "utf8")
    const parsed = JSON.parse(rulesContent) as {items?: unknown}

    if (!Array.isArray(parsed.items)) {
        throw new Error("rules.json must contain items array")
    }

    const records = parsed.items.filter(isRuleJsonRecord)
    const lineByUuid = buildLineMapByRuleUuid(rulesContent)

    return records.map((record) => {
        const heuristicType = detectHeuristicType(`${record.title} ${record.rule} ${record.buckets.join(" ")}`)
        const riskLevel = severityToRiskLevel(record.severity)
        const resolutionMode = detectResolutionMode(riskLevel)

        return {
            id: `H-RULE-${record.uuid}`,
            source_file: RULES_FILE_PATH,
            source_line: lineByUuid.get(record.uuid) ?? 1,
            heuristic_type: heuristicType,
            current_expression: compactExpression(record.rule),
            risk_level: riskLevel,
            resolution_mode: resolutionMode,
            target_change: "Rule retained in code-first mode with schema and behavior verification.",
            tests_required: ["rule-schema-validation", "rule-behavior-validation"],
            owner_package: "@codenautic/runtime",
            status: "TRIAGED",
            rule_uuid: record.uuid,
            severity: record.severity,
            buckets: record.buckets,
            false_positive_risk: estimateFalsePositiveRisk(record),
            evidence_level: "RULE_TEXT_ONLY",
            verification_rule: {
                name: `rule-${record.uuid.slice(0, 8)}-schema`,
                description: `Validate uuid/severity/buckets and non-empty rule text for ${record.uuid}`,
                testCommand: "bun scripts/heuristics/validate-registry.ts --rules-only",
            },
        }
    })
}

function isRuleJsonRecord(value: unknown): value is IRuleJsonRecord {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const candidate = value as Partial<IRuleJsonRecord>

    if (typeof candidate.uuid !== "string" || candidate.uuid.length === 0) {
        return false
    }

    if (typeof candidate.title !== "string" || typeof candidate.rule !== "string") {
        return false
    }

    if (typeof candidate.severity !== "string") {
        return false
    }

    if (!Array.isArray(candidate.buckets)) {
        return false
    }

    return candidate.buckets.every((bucket) => typeof bucket === "string")
}

function buildLineMapByRuleUuid(fileContent: string): Map<string, number> {
    const lineMap = new Map<string, number>()
    const lines = fileContent.split(/\r?\n/)

    lines.forEach((line, index) => {
        const match = line.match(/"uuid"\s*:\s*"([^"]+)"/)
        if (match === null || match[1] === undefined) {
            return
        }
        lineMap.set(match[1], index + 1)
    })

    return lineMap
}

function detectHeuristicType(expression: string): HeuristicType {
    const normalized = expression.toLowerCase()

    if (normalized.includes("retry") || normalized.includes("backoff")) {
        return "RETRY_BACKOFF"
    }
    if (normalized.includes("timeout")) {
        return "TIMEOUT"
    }
    if (normalized.includes("confidence")) {
        return "PREDICTION_CONFIDENCE"
    }
    if (normalized.includes("hotspot") || normalized.includes("drift")) {
        return "DRIFT_SIGNAL"
    }
    if (normalized.includes("rank")) {
        return "RANKING"
    }
    if (normalized.includes("weight")) {
        return "WEIGHTING"
    }
    if (normalized.includes("rate limit") || normalized.includes("429")) {
        return "RATE_LIMIT"
    }
    if (normalized.includes("limit") || normalized.includes("quota") || normalized.includes("batch")) {
        return "RESOURCE_LIMIT"
    }
    if (normalized.includes("score") || normalized.includes("risk")) {
        return "SCORING"
    }
    if (normalized.includes("threshold")) {
        return "THRESHOLD"
    }
    if (normalized.includes("fallback") || normalized.includes("default")) {
        return "FALLBACK_DEFAULT"
    }
    return "OTHER"
}

function detectRiskLevel(expression: string): RiskLevel {
    const normalized = expression.toLowerCase()

    if (normalized.includes("critical") || normalized.includes("security breach") || normalized.includes("data loss")) {
        return "CRITICAL"
    }

    if (
        normalized.includes("high") ||
        normalized.includes("retry") ||
        normalized.includes("timeout") ||
        normalized.includes("hotspot") ||
        normalized.includes("drift") ||
        normalized.includes("risk")
    ) {
        return "HIGH"
    }

    if (
        normalized.includes("threshold") ||
        normalized.includes("score") ||
        normalized.includes("confidence") ||
        normalized.includes("weight") ||
        normalized.includes("default") ||
        normalized.includes("fallback")
    ) {
        return "MEDIUM"
    }

    return "LOW"
}

function severityToRiskLevel(severity: string): RiskLevel {
    const normalized = severity.toUpperCase()
    if (normalized === "CRITICAL") {
        return "CRITICAL"
    }
    if (normalized === "HIGH") {
        return "HIGH"
    }
    if (normalized === "MEDIUM") {
        return "MEDIUM"
    }
    return "LOW"
}

function detectResolutionMode(riskLevel: RiskLevel): ResolutionMode {
    if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
        return "HARDEN"
    }
    return "KEEP_CODE_FIRST"
}

function estimateFalsePositiveRisk(record: IRuleJsonRecord): RiskLevel {
    const buckets = new Set(record.buckets.map((bucket) => bucket.toLowerCase()))
    const severityRisk = severityToRiskLevel(record.severity)

    if (severityRisk === "CRITICAL") {
        return "LOW"
    }

    if (buckets.has("style-conventions") || buckets.has("readability-refactor")) {
        return "HIGH"
    }

    if (
        buckets.has("security-hardening") ||
        buckets.has("secrets-credentials") ||
        buckets.has("compliance-soc2-essentials")
    ) {
        return "LOW"
    }

    if (severityRisk === "LOW") {
        return "HIGH"
    }

    return "MEDIUM"
}

function getTargetChange(heuristicType: HeuristicType): string {
    const targets: Record<HeuristicType, string> = {
        THRESHOLD: "Keep in code-first mode and validate threshold semantics with tests.",
        SCORING: "Keep scoring in code and add deterministic unit/integration checks.",
        WEIGHTING: "Keep weights explicit in code and verify calibration boundaries.",
        RETRY_BACKOFF: "Harden retry/backoff policy with retryable classification and bounded jitter.",
        TIMEOUT: "Harden timeout policy with explicit limits and failure-path assertions.",
        RANKING: "Keep ranking logic explicit and verify deterministic ordering.",
        FALLBACK_DEFAULT: "Harden fallback/default policy and validate environment-specific behavior.",
        RATE_LIMIT: "Harden rate-limit policy with explicit tenant scope and 429 behavior tests.",
        RESOURCE_LIMIT: "Harden resource limits with boundary checks and observable metrics.",
        DRIFT_SIGNAL: "Keep drift/hotspot signals explicit and validate signal provenance.",
        PREDICTION_CONFIDENCE: "Harden confidence logic with calibration checks and dataset constraints.",
        OTHER: "Keep in code-first mode and document verification strategy.",
    }

    return targets[heuristicType]
}

function getTestsRequired(heuristicType: HeuristicType): string[] {
    const mapping: Record<HeuristicType, string[]> = {
        THRESHOLD: ["unit-threshold-boundaries"],
        SCORING: ["unit-score-calculation", "integration-score-pipeline"],
        WEIGHTING: ["unit-weight-calibration"],
        RETRY_BACKOFF: ["unit-retry-policy", "integration-retry-failure-path"],
        TIMEOUT: ["unit-timeout-boundaries", "integration-timeout-failure-path"],
        RANKING: ["unit-ranking-determinism"],
        FALLBACK_DEFAULT: ["unit-env-matrix", "integration-default-behavior"],
        RATE_LIMIT: ["unit-rate-limit-policy", "integration-429-behavior"],
        RESOURCE_LIMIT: ["unit-resource-boundaries"],
        DRIFT_SIGNAL: ["integration-drift-signal"],
        PREDICTION_CONFIDENCE: ["unit-confidence-calibration", "regression-confidence-trend"],
        OTHER: ["unit-heuristic-coverage"],
    }

    return mapping[heuristicType]
}

function detectOwnerPackage(filePath: string): string {
    if (!filePath.startsWith("packages/")) {
        if (filePath.startsWith("docs/")) {
            return "documentation"
        }
        return "planning"
    }

    const segments = filePath.split("/")
    const packageName = segments[1]
    if (packageName === undefined || packageName.length === 0) {
        return "unknown"
    }

    return `@codenautic/${packageName}`
}

function compactExpression(expression: string): string {
    const compact = expression.trim().replaceAll(/\s+/g, " ")
    if (compact.length <= 240) {
        return compact
    }
    return `${compact.slice(0, 237)}...`
}

function buildVerificationRule(id: string): IHeuristicVerificationRule {
    return {
        name: `${id.toLowerCase()}-verification`,
        description: `Ensure heuristic entry ${id} stays covered by unit/integration assertions.`,
        testCommand: "bun scripts/heuristics/validate-registry.ts",
    }
}

function writeJson(filePath: string, payload: IRegistryDocument): void {
    const absolutePath = resolve(process.cwd(), filePath)
    writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

function writeHeuristicsCsv(filePath: string, entries: readonly IHeuristicRegistryEntry[]): void {
    const headers = [
        "id",
        "source_file",
        "source_line",
        "heuristic_type",
        "current_expression",
        "risk_level",
        "resolution_mode",
        "target_change",
        "tests_required",
        "owner_package",
        "status",
        "rule_uuid",
        "severity",
        "buckets",
        "false_positive_risk",
        "evidence_level",
        "verification_rule",
    ]

    const rows = entries.map((entry) => {
        return [
            entry.id,
            entry.source_file,
            String(entry.source_line),
            entry.heuristic_type,
            entry.current_expression,
            entry.risk_level,
            entry.resolution_mode,
            entry.target_change,
            entry.tests_required.join("|"),
            entry.owner_package,
            entry.status,
            entry.rule_uuid ?? "",
            entry.severity ?? "",
            (entry.buckets ?? []).join("|"),
            entry.false_positive_risk ?? "",
            entry.evidence_level ?? "",
            entry.verification_rule === undefined
                ? ""
                : `${entry.verification_rule.name}::${entry.verification_rule.description}`,
        ]
    })

    writeCsv(filePath, headers, rows)
}

function writeCsv(filePath: string, headers: readonly string[], rows: readonly string[][]): void {
    const absolutePath = resolve(process.cwd(), filePath)
    const lines: string[] = [toCsvLine(headers)]

    for (const row of rows) {
        lines.push(toCsvLine(row))
    }

    writeFileSync(absolutePath, `${lines.join("\n")}\n`, "utf8")
}

function toCsvLine(values: readonly string[]): string {
    return values.map((value) => escapeCsvValue(value)).join(",")
}

function escapeCsvValue(value: string): string {
    const escaped = value.replaceAll('"', '""')
    const shouldQuote = escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')
    if (shouldQuote) {
        return `"${escaped}"`
    }
    return escaped
}

function writeCoverageReport(
    filePath: string,
    codeEntries: readonly IHeuristicRegistryEntry[],
    planEntries: readonly IHeuristicRegistryEntry[],
    ruleEntries: readonly IHeuristicRegistryEntry[],
): void {
    const totalEntries = codeEntries.length + planEntries.length + ruleEntries.length
    const byType = groupByHeuristicType([...codeEntries, ...planEntries, ...ruleEntries])

    const lines: string[] = [
        "# Heuristics Coverage Report",
        "",
        `- Schema version: ${HEURISTICS_SCHEMA_VERSION}`,
        `- Generated at: ${new Date().toISOString()}`,
        `- Total entries: ${totalEntries}`,
        `- Code entries: ${codeEntries.length}`,
        `- Plan entries: ${planEntries.length}`,
        `- Rule entries: ${ruleEntries.length}`,
        `- Untriaged entries: 0`,
        "",
        "## Distribution by Heuristic Type",
        "",
        "| Type | Count |",
        "|------|------:|",
    ]

    for (const [heuristicType, count] of byType) {
        lines.push(`| ${heuristicType} | ${count} |`)
    }

    lines.push("")
    lines.push("## Notes")
    lines.push("")
    lines.push("- All entries are marked TRIAGED in code-first mode.")
    lines.push("- Rules registry is generated per UUID with verification rule.")

    const absolutePath = resolve(process.cwd(), filePath)
    writeFileSync(absolutePath, `${lines.join("\n")}\n`, "utf8")
}

function groupByHeuristicType(entries: readonly IHeuristicRegistryEntry[]): [HeuristicType, number][] {
    const counters = new Map<HeuristicType, number>()

    for (const entry of entries) {
        const previous = counters.get(entry.heuristic_type) ?? 0
        counters.set(entry.heuristic_type, previous + 1)
    }

    return [...counters.entries()].sort((left, right) => right[1] - left[1])
}

function toPosix(pathValue: string): string {
    return pathValue.replaceAll("\\", "/")
}

main()
