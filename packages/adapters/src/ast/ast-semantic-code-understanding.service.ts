import {FilePath, type IParsedSourceFileDTO} from "@codenautic/core"

import {
    AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE,
    AstSemanticCodeUnderstandingError,
} from "./ast-semantic-code-understanding.error"

const DEFAULT_MINIMUM_CONFIDENCE = 0.4

const INFRA_IMPORT_KEYWORDS = [
    "@nestjs/",
    "express",
    "fastify",
    "axios",
    "mongodb",
    "redis",
    "bullmq",
    "qdrant",
    "octokit",
] as const

const INFRA_NAME_KEYWORDS = [
    "provider",
    "repository",
    "client",
    "gateway",
    "controller",
] as const

const APPLICATION_NAME_KEYWORDS = [
    "service",
    "usecase",
    "handler",
    "orchestrator",
] as const

/**
 * Semantic module roles inferred from AST and file-path signals.
 */
export const AST_SEMANTIC_MODULE_ROLE = {
    APPLICATION_SERVICE: "APPLICATION_SERVICE",
    API_SURFACE: "API_SURFACE",
    DOMAIN_MODEL: "DOMAIN_MODEL",
    INFRASTRUCTURE_ADAPTER: "INFRASTRUCTURE_ADAPTER",
    TEST_MODULE: "TEST_MODULE",
    UNKNOWN: "UNKNOWN",
    UTILITY_MODULE: "UTILITY_MODULE",
} as const

/**
 * Semantic module role literal.
 */
export type AstSemanticModuleRole =
    (typeof AST_SEMANTIC_MODULE_ROLE)[keyof typeof AST_SEMANTIC_MODULE_ROLE]

/**
 * One module-level semantic insight.
 */
export interface IAstSemanticModuleInsight {
    /**
     * Repository-relative module file path.
     */
    readonly filePath: string

    /**
     * Primary semantic role inferred for module.
     */
    readonly primaryRole: AstSemanticModuleRole

    /**
     * Confidence score in `[0, 1]` range.
     */
    readonly confidence: number

    /**
     * Signals that influenced semantic classification.
     */
    readonly signals: readonly string[]

    /**
     * Structural metrics used by classifier.
     */
    readonly metrics: IAstSemanticModuleMetrics
}

/**
 * Structural metrics used during semantic classification.
 */
export interface IAstSemanticModuleMetrics {
    /**
     * Number of imports.
     */
    readonly importCount: number

    /**
     * Number of classes.
     */
    readonly classCount: number

    /**
     * Number of functions.
     */
    readonly functionCount: number

    /**
     * Number of call expressions.
     */
    readonly callCount: number

    /**
     * Number of exported declarations.
     */
    readonly exportedDeclarationCount: number
}

/**
 * Semantic understanding summary payload.
 */
export interface IAstSemanticCodeUnderstandingSummary {
    /**
     * Number of analyzed modules.
     */
    readonly scannedFileCount: number

    /**
     * Count of modules by inferred role.
     */
    readonly roleCounts: Readonly<Record<AstSemanticModuleRole, number>>
}

/**
 * Semantic understanding output payload.
 */
export interface IAstSemanticCodeUnderstandingResult {
    /**
     * Deterministic module insights.
     */
    readonly modules: readonly IAstSemanticModuleInsight[]

    /**
     * Aggregated summary for diagnostics.
     */
    readonly summary: IAstSemanticCodeUnderstandingSummary
}

/**
 * Runtime options for semantic understanding.
 */
export interface IAstSemanticCodeUnderstandingInput {
    /**
     * Optional subset of repository-relative files included in analysis.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional minimum confidence threshold for non-unknown roles.
     */
    readonly minimumConfidence?: number
}

/**
 * Construction options for semantic understanding service.
 */
export interface IAstSemanticCodeUnderstandingServiceOptions {
    /**
     * Optional default minimum confidence threshold for non-unknown roles.
     */
    readonly defaultMinimumConfidence?: number
}

/**
 * AST semantic understanding service contract.
 */
export interface IAstSemanticCodeUnderstandingService {
    /**
     * Infers module-level semantic roles from AST snapshots.
     *
     * @param files Parsed source files.
     * @param input Optional runtime configuration.
     * @returns Deterministic semantic role report.
     */
    understand(
        files: readonly IParsedSourceFileDTO[],
        input?: IAstSemanticCodeUnderstandingInput,
    ): Promise<IAstSemanticCodeUnderstandingResult>
}

interface IResolvedSemanticConfig {
    readonly filePaths?: readonly string[]
    readonly minimumConfidence: number
}

interface INormalizedSemanticFile {
    readonly filePath: string
    readonly parsedFile: IParsedSourceFileDTO
}

type RoleScoreCard = Record<Exclude<AstSemanticModuleRole, "UNKNOWN">, number>

const ROLE_PRIORITY: readonly Exclude<AstSemanticModuleRole, "UNKNOWN">[] = [
    AST_SEMANTIC_MODULE_ROLE.TEST_MODULE,
    AST_SEMANTIC_MODULE_ROLE.INFRASTRUCTURE_ADAPTER,
    AST_SEMANTIC_MODULE_ROLE.DOMAIN_MODEL,
    AST_SEMANTIC_MODULE_ROLE.APPLICATION_SERVICE,
    AST_SEMANTIC_MODULE_ROLE.UTILITY_MODULE,
    AST_SEMANTIC_MODULE_ROLE.API_SURFACE,
]

/**
 * Semantic understanding from AST snapshots using deterministic heuristics.
 */
export class AstSemanticCodeUnderstandingService
    implements IAstSemanticCodeUnderstandingService
{
    private readonly defaultMinimumConfidence: number

    /**
     * Creates semantic understanding service.
     *
     * @param options Optional defaults.
     */
    public constructor(options: IAstSemanticCodeUnderstandingServiceOptions = {}) {
        this.defaultMinimumConfidence = validateMinimumConfidence(
            options.defaultMinimumConfidence ?? DEFAULT_MINIMUM_CONFIDENCE,
        )
    }

    /**
     * Infers semantic roles for parsed files.
     *
     * @param files Parsed source files.
     * @param input Optional runtime options.
     * @returns Deterministic semantic report.
     */
    public understand(
        files: readonly IParsedSourceFileDTO[],
        input: IAstSemanticCodeUnderstandingInput = {},
    ): Promise<IAstSemanticCodeUnderstandingResult> {
        const config = this.resolveConfig(input)
        const normalizedFiles = normalizeSemanticFiles(files)
        const filteredFiles = filterSemanticFiles(normalizedFiles, config.filePaths)
        const modules = filteredFiles.map((normalizedFile): IAstSemanticModuleInsight => {
            return classifySemanticModule(normalizedFile, config.minimumConfidence)
        })
        const summary = createSemanticSummary(modules)

        return Promise.resolve({
            modules,
            summary,
        })
    }

    /**
     * Resolves runtime configuration with validated defaults.
     *
     * @param input Runtime semantic-understanding options.
     * @returns Validated configuration.
     */
    private resolveConfig(input: IAstSemanticCodeUnderstandingInput): IResolvedSemanticConfig {
        return {
            filePaths: normalizeFilePaths(input.filePaths),
            minimumConfidence: validateMinimumConfidence(
                input.minimumConfidence ?? this.defaultMinimumConfidence,
            ),
        }
    }
}

/**
 * Validates confidence threshold in `[0, 1]` range.
 *
 * @param minimumConfidence Raw confidence threshold.
 * @returns Validated threshold.
 */
function validateMinimumConfidence(minimumConfidence: number): number {
    if (Number.isFinite(minimumConfidence) === false) {
        throw new AstSemanticCodeUnderstandingError(
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.INVALID_MINIMUM_CONFIDENCE,
            {minimumConfidence},
        )
    }

    if (minimumConfidence < 0 || minimumConfidence > 1) {
        throw new AstSemanticCodeUnderstandingError(
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.INVALID_MINIMUM_CONFIDENCE,
            {minimumConfidence},
        )
    }

    return minimumConfidence
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw file paths.
 * @returns Normalized sorted file paths or undefined.
 */
function normalizeFilePaths(filePaths?: readonly string[]): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstSemanticCodeUnderstandingError(
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalizedPaths = new Set<string>()

    for (const filePath of filePaths) {
        normalizedPaths.add(normalizeFilePath(filePath))
    }

    return [...normalizedPaths].sort()
}

/**
 * Normalizes semantic analysis input files.
 *
 * @param files Parsed source files.
 * @returns Sorted normalized files.
 */
function normalizeSemanticFiles(
    files: readonly IParsedSourceFileDTO[],
): readonly INormalizedSemanticFile[] {
    if (files.length === 0) {
        throw new AstSemanticCodeUnderstandingError(
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.EMPTY_FILES,
        )
    }

    const seenPaths = new Set<string>()
    const normalizedFiles: INormalizedSemanticFile[] = []

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)

        if (seenPaths.has(filePath)) {
            throw new AstSemanticCodeUnderstandingError(
                AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath},
            )
        }

        seenPaths.add(filePath)
        normalizedFiles.push({
            filePath,
            parsedFile: file,
        })
    }

    return normalizedFiles.sort((left, right) => left.filePath.localeCompare(right.filePath))
}

/**
 * Applies optional file-path filter.
 *
 * @param files Normalized files.
 * @param filePaths Optional file-path filter.
 * @returns Filtered normalized files.
 */
function filterSemanticFiles(
    files: readonly INormalizedSemanticFile[],
    filePaths?: readonly string[],
): readonly INormalizedSemanticFile[] {
    if (filePaths === undefined) {
        return files
    }

    const filePathSet = new Set<string>(filePaths)
    return files.filter((file) => filePathSet.has(file.filePath))
}

/**
 * Classifies one module into semantic role with confidence.
 *
 * @param normalizedFile Normalized semantic file.
 * @param minimumConfidence Threshold for non-unknown role classification.
 * @returns Semantic insight.
 */
function classifySemanticModule(
    normalizedFile: INormalizedSemanticFile,
    minimumConfidence: number,
): IAstSemanticModuleInsight {
    const scores = createRoleScoreCard()
    const signals: string[] = []
    const metrics = collectModuleMetrics(normalizedFile.parsedFile)

    applyTestSignals(normalizedFile, scores, signals)
    applyInfrastructureSignals(normalizedFile, scores, signals)
    applyDomainSignals(normalizedFile, scores, signals)
    applyApplicationSignals(normalizedFile, scores, signals)
    applyUtilitySignals(normalizedFile, scores, signals)
    applyApiSurfaceSignals(normalizedFile, scores, signals, metrics)

    const winner = resolveWinningRole(scores)
    const confidence = resolveConfidence(winner.score)
    const role =
        confidence >= minimumConfidence ? winner.role : AST_SEMANTIC_MODULE_ROLE.UNKNOWN

    if (role === AST_SEMANTIC_MODULE_ROLE.UNKNOWN) {
        signals.push("confidence:below-threshold")
    }

    return {
        filePath: normalizedFile.filePath,
        primaryRole: role,
        confidence,
        signals: [...new Set(signals)].sort(),
        metrics,
    }
}

/**
 * Creates initial role score card.
 *
 * @returns Empty role score card.
 */
function createRoleScoreCard(): RoleScoreCard {
    return {
        APPLICATION_SERVICE: 0,
        API_SURFACE: 0,
        DOMAIN_MODEL: 0,
        INFRASTRUCTURE_ADAPTER: 0,
        TEST_MODULE: 0,
        UTILITY_MODULE: 0,
    }
}

/**
 * Collects structural metrics for one module.
 *
 * @param file Parsed source file.
 * @returns Structural metrics.
 */
function collectModuleMetrics(file: IParsedSourceFileDTO): IAstSemanticModuleMetrics {
    return {
        importCount: file.imports.length,
        classCount: file.classes.length,
        functionCount: file.functions.length,
        callCount: file.calls.length,
        exportedDeclarationCount: collectExportedDeclarationCount(file),
    }
}

/**
 * Counts exported declarations in one parsed file.
 *
 * @param file Parsed source file.
 * @returns Number of exported declarations.
 */
function collectExportedDeclarationCount(file: IParsedSourceFileDTO): number {
    const exportedClasses = file.classes.filter((item) => item.exported).length
    const exportedFunctions = file.functions.filter((item) => item.exported).length
    const exportedInterfaces = file.interfaces.filter((item) => item.exported).length
    const exportedTypeAliases = file.typeAliases.filter((item) => item.exported).length
    const exportedEnums = file.enums.filter((item) => item.exported).length

    return (
        exportedClasses +
        exportedFunctions +
        exportedInterfaces +
        exportedTypeAliases +
        exportedEnums
    )
}

/**
 * Applies semantic signals for test-module role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 */
function applyTestSignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
): void {
    if (isTestFilePath(normalizedFile.filePath)) {
        scores.TEST_MODULE += 5
        signals.push("path:test")
    }
}

/**
 * Applies semantic signals for infrastructure-adapter role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 */
function applyInfrastructureSignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
): void {
    if (containsPathFragment(normalizedFile.filePath, "adapters")) {
        scores.INFRASTRUCTURE_ADAPTER += 3
        signals.push("path:adapters")
    }

    if (containsPathFragment(normalizedFile.filePath, "infrastructure")) {
        scores.INFRASTRUCTURE_ADAPTER += 2
        signals.push("path:infrastructure")
    }

    if (hasImportKeyword(normalizedFile.parsedFile, INFRA_IMPORT_KEYWORDS)) {
        scores.INFRASTRUCTURE_ADAPTER += 3
        signals.push("imports:infra-sdk")
    }

    if (hasNamedDeclarationKeyword(normalizedFile.parsedFile, INFRA_NAME_KEYWORDS)) {
        scores.INFRASTRUCTURE_ADAPTER += 2
        signals.push("declarations:infra-naming")
    }
}

/**
 * Applies semantic signals for domain-model role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 */
function applyDomainSignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
): void {
    if (containsPathFragment(normalizedFile.filePath, "domain")) {
        scores.DOMAIN_MODEL += 3
        signals.push("path:domain")
    }

    if (containsPathFragment(normalizedFile.filePath, "entity")) {
        scores.DOMAIN_MODEL += 2
        signals.push("path:entity")
    }

    const hasDomainShape =
        normalizedFile.parsedFile.classes.length > 0 &&
        normalizedFile.parsedFile.functions.length > 0

    if (hasDomainShape) {
        scores.DOMAIN_MODEL += 2
        signals.push("shape:class-function")
    }
}

/**
 * Applies semantic signals for application-service role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 */
function applyApplicationSignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
): void {
    if (containsPathFragment(normalizedFile.filePath, "application")) {
        scores.APPLICATION_SERVICE += 3
        signals.push("path:application")
    }

    if (containsPathFragment(normalizedFile.filePath, "use-cases")) {
        scores.APPLICATION_SERVICE += 3
        signals.push("path:use-cases")
    }

    if (hasNamedDeclarationKeyword(normalizedFile.parsedFile, APPLICATION_NAME_KEYWORDS)) {
        scores.APPLICATION_SERVICE += 2
        signals.push("declarations:application-naming")
    }

    if (
        normalizedFile.parsedFile.imports.length > 0 &&
        normalizedFile.parsedFile.calls.length > 0
    ) {
        scores.APPLICATION_SERVICE += 1
        signals.push("shape:orchestration")
    }
}

/**
 * Applies semantic signals for utility-module role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 */
function applyUtilitySignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
): void {
    if (containsPathFragment(normalizedFile.filePath, "utils")) {
        scores.UTILITY_MODULE += 3
        signals.push("path:utils")
    }

    if (normalizedFile.parsedFile.functions.length >= 3 && normalizedFile.parsedFile.classes.length === 0) {
        scores.UTILITY_MODULE += 3
        signals.push("shape:function-heavy")
    }
}

/**
 * Applies semantic signals for api-surface role.
 *
 * @param normalizedFile Normalized file.
 * @param scores Role score card.
 * @param signals Mutable signal list.
 * @param metrics Structural metrics.
 */
function applyApiSurfaceSignals(
    normalizedFile: INormalizedSemanticFile,
    scores: RoleScoreCard,
    signals: string[],
    metrics: IAstSemanticModuleMetrics,
): void {
    if (metrics.exportedDeclarationCount >= 3) {
        scores.API_SURFACE += 2
        signals.push("exports:rich-surface")
    }

    const contractCount =
        normalizedFile.parsedFile.interfaces.length +
        normalizedFile.parsedFile.typeAliases.length +
        normalizedFile.parsedFile.enums.length

    if (contractCount >= 2) {
        scores.API_SURFACE += 2
        signals.push("contracts:rich")
    }

    if (normalizedFile.parsedFile.calls.length === 0 && metrics.exportedDeclarationCount > 0) {
        scores.API_SURFACE += 1
        signals.push("shape:declarative")
    }
}

/**
 * Resolves winning role from role score card.
 *
 * @param scores Role score card.
 * @returns Winning role and score.
 */
function resolveWinningRole(scores: RoleScoreCard): {
    readonly role: Exclude<AstSemanticModuleRole, "UNKNOWN">
    readonly score: number
} {
    let winnerRole = ROLE_PRIORITY[0]
    let winnerScore = winnerRole === undefined ? 0 : scores[winnerRole]

    for (const role of ROLE_PRIORITY) {
        const score = scores[role]
        if (score <= winnerScore) {
            continue
        }

        winnerRole = role
        winnerScore = score
    }

    if (winnerRole === undefined) {
        return {
            role: AST_SEMANTIC_MODULE_ROLE.API_SURFACE,
            score: 0,
        }
    }

    return {
        role: winnerRole,
        score: winnerScore,
    }
}

/**
 * Resolves rounded confidence from heuristic score.
 *
 * @param score Heuristic score.
 * @returns Rounded confidence in `[0, 1]` range.
 */
function resolveConfidence(score: number): number {
    if (score <= 0) {
        return 0
    }

    return Math.min(1, Math.round((score / 8) * 100) / 100)
}

/**
 * Builds summary from module insights.
 *
 * @param modules Module semantic insights.
 * @returns Semantic understanding summary.
 */
function createSemanticSummary(
    modules: readonly IAstSemanticModuleInsight[],
): IAstSemanticCodeUnderstandingSummary {
    const roleCounts: Record<AstSemanticModuleRole, number> = {
        APPLICATION_SERVICE: 0,
        API_SURFACE: 0,
        DOMAIN_MODEL: 0,
        INFRASTRUCTURE_ADAPTER: 0,
        TEST_MODULE: 0,
        UNKNOWN: 0,
        UTILITY_MODULE: 0,
    }

    for (const module of modules) {
        roleCounts[module.primaryRole] += 1
    }

    return {
        scannedFileCount: modules.length,
        roleCounts,
    }
}

/**
 * Checks whether one file path belongs to tests.
 *
 * @param filePath Normalized file path.
 * @returns True when file path belongs to test suite.
 */
function isTestFilePath(filePath: string): boolean {
    return (
        filePath.includes("/tests/") ||
        filePath.includes("/__tests__/") ||
        filePath.includes(".test.") ||
        filePath.includes(".spec.")
    )
}

/**
 * Checks whether file path includes fragment as one segment.
 *
 * @param filePath Normalized file path.
 * @param fragment Path fragment.
 * @returns True when fragment is present.
 */
function containsPathFragment(filePath: string, fragment: string): boolean {
    return filePath.split("/").includes(fragment)
}

/**
 * Checks whether imports contain at least one configured keyword.
 *
 * @param file Parsed source file.
 * @param keywords Keyword list.
 * @returns True when import keyword is detected.
 */
function hasImportKeyword(
    file: IParsedSourceFileDTO,
    keywords: readonly string[],
): boolean {
    return file.imports.some((item) => {
        const source = item.source.toLowerCase()
        return keywords.some((keyword) => source.includes(keyword))
    })
}

/**
 * Checks whether declarations contain at least one configured keyword.
 *
 * @param file Parsed source file.
 * @param keywords Keyword list.
 * @returns True when declaration keyword is detected.
 */
function hasNamedDeclarationKeyword(
    file: IParsedSourceFileDTO,
    keywords: readonly string[],
): boolean {
    const names = [
        ...file.classes.map((item) => item.name.toLowerCase()),
        ...file.functions.map((item) => item.name.toLowerCase()),
    ]

    return names.some((name) => keywords.some((keyword) => name.includes(keyword)))
}

/**
 * Normalizes one repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstSemanticCodeUnderstandingError(
            AST_SEMANTIC_CODE_UNDERSTANDING_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}
