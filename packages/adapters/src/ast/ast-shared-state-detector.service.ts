import {
    AST_FUNCTION_KIND,
    FilePath,
    type IAstFunctionDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_SHARED_STATE_DETECTOR_ERROR_CODE,
    AstSharedStateDetectorError,
} from "./ast-shared-state-detector.error"
import {
    AstImportExportGraphBuilder,
    type IAstImportExportGraphBuilder,
    type IAstImportExportGraphResult,
} from "./ast-import-export-graph-builder"

const DEFAULT_MINIMUM_CONSUMER_COUNT = 2
const DEFAULT_MAX_ISSUES = 100
const HIGH_SEVERITY_CONSUMER_COUNT = 5

const DEFAULT_MUTATOR_PREFIXES = [
    "set",
    "update",
    "add",
    "remove",
    "delete",
    "clear",
    "reset",
    "mutate",
    "write",
    "push",
    "pop",
    "increment",
    "decrement",
] as const

const ISSUE_TYPE_ORDER = [
    "SHARED_MUTABLE_CLASS",
    "SHARED_MUTABLE_FUNCTION_API",
] as const

/**
 * Shared-state issue type.
 */
export const AST_SHARED_STATE_ISSUE_TYPE = {
    SHARED_MUTABLE_CLASS: "SHARED_MUTABLE_CLASS",
    SHARED_MUTABLE_FUNCTION_API: "SHARED_MUTABLE_FUNCTION_API",
} as const

/**
 * Shared-state issue type literal.
 */
export type AstSharedStateIssueType =
    (typeof AST_SHARED_STATE_ISSUE_TYPE)[keyof typeof AST_SHARED_STATE_ISSUE_TYPE]

/**
 * Shared-state issue severity.
 */
export const AST_SHARED_STATE_SEVERITY = {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
} as const

/**
 * Shared-state issue severity literal.
 */
export type AstSharedStateSeverity =
    (typeof AST_SHARED_STATE_SEVERITY)[keyof typeof AST_SHARED_STATE_SEVERITY]

/**
 * One shared mutable state issue.
 */
export interface IAstSharedStateIssue {
    /**
     * Stable deterministic issue identifier.
     */
    readonly id: string

    /**
     * Issue category.
     */
    readonly type: AstSharedStateIssueType

    /**
     * Severity derived from consumer footprint.
     */
    readonly severity: AstSharedStateSeverity

    /**
     * Provider file path where mutable API is exported.
     */
    readonly filePath: string

    /**
     * Exported class or function symbol.
     */
    readonly exportedSymbol: string

    /**
     * Number of consumer files.
     */
    readonly consumerCount: number

    /**
     * Sorted consumer file paths.
     */
    readonly consumerFilePaths: readonly string[]

    /**
     * Stable human-readable reason.
     */
    readonly reason: string
}

/**
 * Shared-state detector summary.
 */
export interface IAstSharedStateDetectorSummary {
    /**
     * Number of analyzed source files.
     */
    readonly scannedFileCount: number

    /**
     * Number of returned issues.
     */
    readonly issueCount: number

    /**
     * Number of high-severity issues.
     */
    readonly highSeverityCount: number

    /**
     * Number of omitted issues after truncation.
     */
    readonly truncatedIssueCount: number

    /**
     * Whether issue output was truncated by max issue cap.
     */
    readonly truncated: boolean

    /**
     * Issue counts by type.
     */
    readonly byType: Record<AstSharedStateIssueType, number>
}

/**
 * Shared-state detector result payload.
 */
export interface IAstSharedStateDetectorResult {
    /**
     * Deterministic sorted issues.
     */
    readonly issues: readonly IAstSharedStateIssue[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstSharedStateDetectorSummary
}

/**
 * Shared-state detector input.
 */
export interface IAstSharedStateDetectorInput {
    /**
     * Parsed source files.
     */
    readonly files: readonly IParsedSourceFileDTO[]

    /**
     * Optional provider file-path filter.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional minimum number of consumer files.
     */
    readonly minimumConsumerCount?: number

    /**
     * Optional max number of returned issues.
     */
    readonly maxIssues?: number
}

/**
 * Shared-state detector options.
 */
export interface IAstSharedStateDetectorServiceOptions {
    /**
     * Optional graph builder override.
     */
    readonly graphBuilder?: IAstImportExportGraphBuilder

    /**
     * Optional default minimum consumer threshold.
     */
    readonly defaultMinimumConsumerCount?: number

    /**
     * Optional default max issue cap.
     */
    readonly defaultMaxIssues?: number

    /**
     * Optional mutator method/function prefixes.
     */
    readonly mutatorPrefixes?: readonly string[]
}

/**
 * Shared-state detector contract.
 */
export interface IAstSharedStateDetectorService {
    /**
     * Detects potential shared mutable state exports.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic shared-state findings.
     */
    detect(input: IAstSharedStateDetectorInput): Promise<IAstSharedStateDetectorResult>
}

interface IResolvedSharedStateConfig {
    readonly filePaths?: readonly string[]
    readonly minimumConsumerCount: number
    readonly maxIssues: number
}

/**
 * Detects potential shared mutable state patterns via API fan-in heuristics.
 */
export class AstSharedStateDetectorService implements IAstSharedStateDetectorService {
    private readonly graphBuilder: IAstImportExportGraphBuilder
    private readonly defaultMinimumConsumerCount: number
    private readonly defaultMaxIssues: number
    private readonly mutatorPrefixes: readonly string[]

    /**
     * Creates shared-state detector service.
     *
     * @param options Optional detector configuration.
     */
    public constructor(options: IAstSharedStateDetectorServiceOptions = {}) {
        this.graphBuilder = options.graphBuilder ?? new AstImportExportGraphBuilder()
        this.defaultMinimumConsumerCount = validateMinimumConsumerCount(
            options.defaultMinimumConsumerCount ?? DEFAULT_MINIMUM_CONSUMER_COUNT,
        )
        this.defaultMaxIssues = validateMaxIssues(options.defaultMaxIssues ?? DEFAULT_MAX_ISSUES)
        this.mutatorPrefixes = resolveMutatorPrefixes(options.mutatorPrefixes)
    }

    /**
     * Detects potential shared mutable state exports.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic shared-state findings.
     */
    public async detect(
        input: IAstSharedStateDetectorInput,
    ): Promise<IAstSharedStateDetectorResult> {
        const config = this.resolveConfig(input)
        const graph = await this.graphBuilder.build(input.files)
        const providerFiles = resolveProviderFiles(input.files, config.filePaths)
        const issues = detectIssues(
            providerFiles,
            graph,
            config.minimumConsumerCount,
            this.mutatorPrefixes,
        )
        const sortedIssues = deduplicateAndSortIssues(issues)
        const limitedIssues = sortedIssues.slice(0, config.maxIssues)
        const truncatedIssueCount = Math.max(0, sortedIssues.length - limitedIssues.length)

        return {
            issues: limitedIssues,
            summary: createSummary(providerFiles.length, limitedIssues, truncatedIssueCount),
        }
    }

    /**
     * Resolves runtime config with validated defaults.
     *
     * @param input Runtime input.
     * @returns Validated runtime config.
     */
    private resolveConfig(input: IAstSharedStateDetectorInput): IResolvedSharedStateConfig {
        return {
            filePaths: normalizeFilePathFilter(input.filePaths),
            minimumConsumerCount: validateMinimumConsumerCount(
                input.minimumConsumerCount ?? this.defaultMinimumConsumerCount,
            ),
            maxIssues: validateMaxIssues(input.maxIssues ?? this.defaultMaxIssues),
        }
    }
}

/**
 * Validates minimum consumer threshold.
 *
 * @param minimumConsumerCount Raw threshold.
 * @returns Validated threshold.
 */
function validateMinimumConsumerCount(minimumConsumerCount: number): number {
    if (
        Number.isSafeInteger(minimumConsumerCount) === false ||
        minimumConsumerCount < 1
    ) {
        throw new AstSharedStateDetectorError(
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MINIMUM_CONSUMER_COUNT,
            {minimumConsumerCount},
        )
    }

    return minimumConsumerCount
}

/**
 * Validates max issue cap.
 *
 * @param maxIssues Raw cap.
 * @returns Validated cap.
 */
function validateMaxIssues(maxIssues: number): number {
    if (Number.isSafeInteger(maxIssues) === false || maxIssues < 1) {
        throw new AstSharedStateDetectorError(
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_MAX_ISSUES,
            {maxIssues},
        )
    }

    return maxIssues
}

/**
 * Normalizes optional mutator prefix list.
 *
 * @param mutatorPrefixes Optional custom prefixes.
 * @returns Stable normalized prefix list.
 */
function resolveMutatorPrefixes(mutatorPrefixes: readonly string[] | undefined): readonly string[] {
    if (mutatorPrefixes === undefined || mutatorPrefixes.length === 0) {
        return [...DEFAULT_MUTATOR_PREFIXES]
    }

    const normalizedPrefixSet = new Set<string>()

    for (const prefix of mutatorPrefixes) {
        const normalizedPrefix = prefix.trim().toLowerCase()
        if (normalizedPrefix.length > 0) {
            normalizedPrefixSet.add(normalizedPrefix)
        }
    }

    if (normalizedPrefixSet.size === 0) {
        return [...DEFAULT_MUTATOR_PREFIXES]
    }

    return [...normalizedPrefixSet].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw file-path filter.
 * @returns Sorted unique normalized paths or undefined.
 */
function normalizeFilePathFilter(
    filePaths: readonly string[] | undefined,
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstSharedStateDetectorError(
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalizedPathSet = new Set<string>()

    for (const filePath of filePaths) {
        normalizedPathSet.add(normalizeFilePath(filePath))
    }

    return [...normalizedPathSet].sort((left, right) => left.localeCompare(right))
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
        throw new AstSharedStateDetectorError(
            AST_SHARED_STATE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Resolves provider files to evaluate.
 *
 * @param files Parsed source files.
 * @param filePaths Optional provider file-path filter.
 * @returns Deterministic provider files.
 */
function resolveProviderFiles(
    files: readonly IParsedSourceFileDTO[],
    filePaths: readonly string[] | undefined,
): readonly IParsedSourceFileDTO[] {
    const fileByPath = new Map<string, IParsedSourceFileDTO>()

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)
        fileByPath.set(filePath, file)
    }

    if (filePaths === undefined) {
        return [...fileByPath.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map((entry) => entry[1])
    }

    const providerFiles: IParsedSourceFileDTO[] = []

    for (const filePath of filePaths) {
        const providerFile = fileByPath.get(filePath)
        if (providerFile !== undefined) {
            providerFiles.push(providerFile)
        }
    }

    return providerFiles
}

/**
 * Detects shared mutable state issues for provider files.
 *
 * @param providerFiles Provider files.
 * @param graph Import/export graph.
 * @param minimumConsumerCount Minimum consumer threshold.
 * @param mutatorPrefixes Mutator prefixes.
 * @returns Mutable issue list.
 */
function detectIssues(
    providerFiles: readonly IParsedSourceFileDTO[],
    graph: IAstImportExportGraphResult,
    minimumConsumerCount: number,
    mutatorPrefixes: readonly string[],
): readonly IAstSharedStateIssue[] {
    const issues: IAstSharedStateIssue[] = []

    for (const providerFile of providerFiles) {
        const filePath = normalizeFilePath(providerFile.filePath)
        const classIssues = detectClassIssues(
            providerFile,
            filePath,
            graph,
            minimumConsumerCount,
            mutatorPrefixes,
        )
        const functionIssues = detectFunctionIssues(
            providerFile,
            filePath,
            graph,
            minimumConsumerCount,
            mutatorPrefixes,
        )

        issues.push(...classIssues)
        issues.push(...functionIssues)
    }

    return issues
}

/**
 * Detects shared mutable class issues for one provider file.
 *
 * @param providerFile Provider file.
 * @param filePath Normalized provider file path.
 * @param graph Import/export graph.
 * @param minimumConsumerCount Minimum consumer threshold.
 * @param mutatorPrefixes Mutator prefixes.
 * @returns Shared mutable class issues.
 */
function detectClassIssues(
    providerFile: IParsedSourceFileDTO,
    filePath: string,
    graph: IAstImportExportGraphResult,
    minimumConsumerCount: number,
    mutatorPrefixes: readonly string[],
): readonly IAstSharedStateIssue[] {
    const issues: IAstSharedStateIssue[] = []

    for (const classDeclaration of providerFile.classes) {
        if (classDeclaration.exported === false) {
            continue
        }

        const mutatorMethods = collectClassMutatorMethods(
            providerFile.functions,
            classDeclaration.name,
            mutatorPrefixes,
        )
        if (mutatorMethods.length === 0) {
            continue
        }

        const consumers = collectConsumerFilePaths(graph, filePath, classDeclaration.name)
        if (consumers.length < minimumConsumerCount) {
            continue
        }

        issues.push(
            createIssue({
                type: AST_SHARED_STATE_ISSUE_TYPE.SHARED_MUTABLE_CLASS,
                filePath,
                exportedSymbol: classDeclaration.name,
                consumerFilePaths: consumers,
                reason: `Exported class ${classDeclaration.name} has mutator methods (${mutatorMethods.join(
                    ", ",
                )}) and is consumed by multiple files`,
            }),
        )
    }

    return issues
}

/**
 * Detects shared mutable function API issues for one provider file.
 *
 * @param providerFile Provider file.
 * @param filePath Normalized provider file path.
 * @param graph Import/export graph.
 * @param minimumConsumerCount Minimum consumer threshold.
 * @param mutatorPrefixes Mutator prefixes.
 * @returns Shared mutable function issues.
 */
function detectFunctionIssues(
    providerFile: IParsedSourceFileDTO,
    filePath: string,
    graph: IAstImportExportGraphResult,
    minimumConsumerCount: number,
    mutatorPrefixes: readonly string[],
): readonly IAstSharedStateIssue[] {
    const issues: IAstSharedStateIssue[] = []

    for (const fn of providerFile.functions) {
        if (fn.exported === false || fn.kind !== AST_FUNCTION_KIND.FUNCTION) {
            continue
        }

        if (isMutatorName(fn.name, mutatorPrefixes) === false) {
            continue
        }

        const consumers = collectConsumerFilePaths(graph, filePath, fn.name)
        if (consumers.length < minimumConsumerCount) {
            continue
        }

        issues.push(
            createIssue({
                type: AST_SHARED_STATE_ISSUE_TYPE.SHARED_MUTABLE_FUNCTION_API,
                filePath,
                exportedSymbol: fn.name,
                consumerFilePaths: consumers,
                reason: `Exported mutator function ${fn.name} is consumed by multiple files`,
            }),
        )
    }

    return issues
}

/**
 * Collects mutator method names for one class.
 *
 * @param functions File functions and methods.
 * @param className Class name.
 * @param mutatorPrefixes Mutator prefixes.
 * @returns Sorted mutator method names.
 */
function collectClassMutatorMethods(
    functions: readonly IAstFunctionDTO[],
    className: string,
    mutatorPrefixes: readonly string[],
): readonly string[] {
    const methodNames = new Set<string>()

    for (const fn of functions) {
        if (fn.kind !== AST_FUNCTION_KIND.METHOD) {
            continue
        }

        if (fn.parentClassName !== className) {
            continue
        }

        if (isMutatorName(fn.name, mutatorPrefixes) === false) {
            continue
        }

        methodNames.add(fn.name)
    }

    return [...methodNames].sort((left, right) => left.localeCompare(right))
}

/**
 * Resolves whether one function or method name is mutator-like.
 *
 * @param name Function or method name.
 * @param mutatorPrefixes Mutator prefixes.
 * @returns True when name looks mutator-like.
 */
function isMutatorName(name: string, mutatorPrefixes: readonly string[]): boolean {
    const normalizedName = name.trim().toLowerCase()

    for (const prefix of mutatorPrefixes) {
        if (normalizedName.startsWith(prefix)) {
            return true
        }
    }

    return false
}

/**
 * Collects consumer file paths for one provider symbol.
 *
 * @param graph Import/export graph.
 * @param providerFilePath Provider file path.
 * @param symbol Exported symbol.
 * @returns Sorted unique consumer file paths.
 */
function collectConsumerFilePaths(
    graph: IAstImportExportGraphResult,
    providerFilePath: string,
    symbol: string,
): readonly string[] {
    const incomingEdges = graph.edgesByTarget.get(providerFilePath) ?? []
    const consumerPathSet = new Set<string>()

    for (const edge of incomingEdges) {
        if (edge.specifiers.length === 0 || edge.specifiers.includes(symbol)) {
            consumerPathSet.add(edge.sourceFilePath)
        }
    }

    return [...consumerPathSet].sort((left, right) => left.localeCompare(right))
}

interface ICreateSharedStateIssueInput {
    readonly type: AstSharedStateIssueType
    readonly filePath: string
    readonly exportedSymbol: string
    readonly consumerFilePaths: readonly string[]
    readonly reason: string
}

/**
 * Creates one deterministic shared-state issue.
 *
 * @param input Issue input.
 * @returns Shared-state issue.
 */
function createIssue(input: ICreateSharedStateIssueInput): IAstSharedStateIssue {
    const consumerCount = input.consumerFilePaths.length
    const severity =
        consumerCount >= HIGH_SEVERITY_CONSUMER_COUNT
            ? AST_SHARED_STATE_SEVERITY.HIGH
            : AST_SHARED_STATE_SEVERITY.MEDIUM

    return {
        id: createIssueId(input.type, input.filePath, input.exportedSymbol, input.consumerFilePaths),
        type: input.type,
        severity,
        filePath: input.filePath,
        exportedSymbol: input.exportedSymbol,
        consumerCount,
        consumerFilePaths: input.consumerFilePaths,
        reason: input.reason,
    }
}

/**
 * Creates stable issue identifier.
 *
 * @param type Issue type.
 * @param filePath Provider file path.
 * @param exportedSymbol Exported symbol.
 * @param consumerFilePaths Consumer file paths.
 * @returns Stable issue identifier.
 */
function createIssueId(
    type: AstSharedStateIssueType,
    filePath: string,
    exportedSymbol: string,
    consumerFilePaths: readonly string[],
): string {
    return [type, filePath, exportedSymbol, consumerFilePaths.join(",")].join("|")
}

/**
 * Deduplicates and sorts issues deterministically.
 *
 * @param issues Mutable issue list.
 * @returns Sorted unique issues.
 */
function deduplicateAndSortIssues(
    issues: readonly IAstSharedStateIssue[],
): readonly IAstSharedStateIssue[] {
    const uniqueById = new Map<string, IAstSharedStateIssue>()

    for (const issue of issues) {
        uniqueById.set(issue.id, issue)
    }

    return [...uniqueById.values()].sort(compareIssues)
}

/**
 * Compares shared-state issues deterministically.
 *
 * @param left Left issue.
 * @param right Right issue.
 * @returns Sort result.
 */
function compareIssues(left: IAstSharedStateIssue, right: IAstSharedStateIssue): number {
    if (left.severity !== right.severity) {
        return left.severity === AST_SHARED_STATE_SEVERITY.HIGH ? -1 : 1
    }

    const leftTypeIndex = ISSUE_TYPE_ORDER.indexOf(left.type)
    const rightTypeIndex = ISSUE_TYPE_ORDER.indexOf(right.type)
    if (leftTypeIndex !== rightTypeIndex) {
        return leftTypeIndex - rightTypeIndex
    }

    const filePathCompare = left.filePath.localeCompare(right.filePath)
    if (filePathCompare !== 0) {
        return filePathCompare
    }

    return left.exportedSymbol.localeCompare(right.exportedSymbol)
}

/**
 * Builds aggregated summary from issues.
 *
 * @param scannedFileCount Number of analyzed source files.
 * @param issues Returned issues.
 * @param truncatedIssueCount Number of omitted issues.
 * @returns Aggregated summary.
 */
function createSummary(
    scannedFileCount: number,
    issues: readonly IAstSharedStateIssue[],
    truncatedIssueCount: number,
): IAstSharedStateDetectorSummary {
    const byType: Record<AstSharedStateIssueType, number> = {
        SHARED_MUTABLE_CLASS: 0,
        SHARED_MUTABLE_FUNCTION_API: 0,
    }
    let highSeverityCount = 0

    for (const issue of issues) {
        byType[issue.type] += 1

        if (issue.severity === AST_SHARED_STATE_SEVERITY.HIGH) {
            highSeverityCount += 1
        }
    }

    return {
        scannedFileCount,
        issueCount: issues.length,
        highSeverityCount,
        truncatedIssueCount,
        truncated: truncatedIssueCount > 0,
        byType,
    }
}
