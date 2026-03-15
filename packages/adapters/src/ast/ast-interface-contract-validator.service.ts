import {
    FilePath,
    type IAstClassDTO,
    type IAstInterfaceDTO,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE,
    AstInterfaceContractValidatorError,
} from "./ast-interface-contract-validator.error"
import {
    AstImportExportGraphBuilder,
    type IAstImportExportGraphBuilder,
    type IAstImportExportGraphEdge,
} from "./ast-import-export-graph-builder"

const DEFAULT_MAX_ISSUES = 250

const ISSUE_TYPE_ORDER = [
    "MISSING_IMPLEMENTED_INTERFACE",
    "AMBIGUOUS_IMPLEMENTED_INTERFACE",
    "DUPLICATE_IMPLEMENTED_INTERFACE",
    "MISSING_EXTENDED_INTERFACE",
    "AMBIGUOUS_EXTENDED_INTERFACE",
    "DUPLICATE_EXTENDED_INTERFACE",
] as const

const ISSUE_SEVERITY_ORDER = ["HIGH", "MEDIUM", "LOW"] as const
const DECLARATION_KIND_ORDER = ["CLASS", "INTERFACE"] as const

/**
 * Interface contract issue type.
 */
export const AST_INTERFACE_CONTRACT_ISSUE_TYPE = {
    MISSING_IMPLEMENTED_INTERFACE: "MISSING_IMPLEMENTED_INTERFACE",
    AMBIGUOUS_IMPLEMENTED_INTERFACE: "AMBIGUOUS_IMPLEMENTED_INTERFACE",
    DUPLICATE_IMPLEMENTED_INTERFACE: "DUPLICATE_IMPLEMENTED_INTERFACE",
    MISSING_EXTENDED_INTERFACE: "MISSING_EXTENDED_INTERFACE",
    AMBIGUOUS_EXTENDED_INTERFACE: "AMBIGUOUS_EXTENDED_INTERFACE",
    DUPLICATE_EXTENDED_INTERFACE: "DUPLICATE_EXTENDED_INTERFACE",
} as const

/**
 * Interface contract issue type literal.
 */
export type AstInterfaceContractIssueType =
    (typeof AST_INTERFACE_CONTRACT_ISSUE_TYPE)[keyof typeof AST_INTERFACE_CONTRACT_ISSUE_TYPE]

/**
 * Interface contract issue severity.
 */
export const AST_INTERFACE_CONTRACT_ISSUE_SEVERITY = {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
} as const

/**
 * Interface contract issue severity literal.
 */
export type AstInterfaceContractIssueSeverity =
    (typeof AST_INTERFACE_CONTRACT_ISSUE_SEVERITY)[keyof typeof AST_INTERFACE_CONTRACT_ISSUE_SEVERITY]

/**
 * Source declaration kind for interface contract issue.
 */
export const AST_INTERFACE_CONTRACT_DECLARATION_KIND = {
    CLASS: "CLASS",
    INTERFACE: "INTERFACE",
} as const

/**
 * Source declaration kind literal for interface contract issue.
 */
export type AstInterfaceContractDeclarationKind =
    (typeof AST_INTERFACE_CONTRACT_DECLARATION_KIND)[keyof typeof AST_INTERFACE_CONTRACT_DECLARATION_KIND]

/**
 * One interface contract validation issue.
 */
export interface IAstInterfaceContractIssue {
    /**
     * Stable deterministic issue identifier.
     */
    readonly id: string

    /**
     * Typed issue category.
     */
    readonly type: AstInterfaceContractIssueType

    /**
     * Issue severity bucket.
     */
    readonly severity: AstInterfaceContractIssueSeverity

    /**
     * File path where issue was detected.
     */
    readonly filePath: string

    /**
     * Source declaration kind.
     */
    readonly declarationKind: AstInterfaceContractDeclarationKind

    /**
     * Source class or interface name.
     */
    readonly declarationName: string

    /**
     * Referenced contract name from implements or extends list.
     */
    readonly contractName: string

    /**
     * Candidate file paths when ambiguity exists.
     */
    readonly candidateFilePaths: readonly string[]

    /**
     * Stable human-readable reason.
     */
    readonly reason: string
}

/**
 * Interface contract validator summary payload.
 */
export interface IAstInterfaceContractValidatorSummary {
    /**
     * Number of source files scanned by graph builder.
     */
    readonly scannedFileCount: number

    /**
     * Number of analyzed class declarations.
     */
    readonly checkedClassCount: number

    /**
     * Number of analyzed interface declarations.
     */
    readonly checkedInterfaceCount: number

    /**
     * Number of returned issues.
     */
    readonly issueCount: number

    /**
     * Number of high-severity issues.
     */
    readonly highSeverityCount: number

    /**
     * Whether issues were truncated by max issue cap.
     */
    readonly truncated: boolean

    /**
     * Number of omitted issues.
     */
    readonly truncatedIssueCount: number

    /**
     * Issue count by type.
     */
    readonly byType: Record<AstInterfaceContractIssueType, number>
}

/**
 * Interface contract validator output payload.
 */
export interface IAstInterfaceContractValidatorResult {
    /**
     * Deterministic sorted issues.
     */
    readonly issues: readonly IAstInterfaceContractIssue[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstInterfaceContractValidatorSummary
}

/**
 * Interface contract validator input.
 */
export interface IAstInterfaceContractValidatorInput {
    /**
     * Parsed source files used for validation.
     */
    readonly files: readonly IParsedSourceFileDTO[]

    /**
     * Optional source file-path subset.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional max number of returned issues.
     */
    readonly maxIssues?: number
}

/**
 * Interface contract validator options.
 */
export interface IAstInterfaceContractValidatorServiceOptions {
    /**
     * Optional import/export graph builder override.
     */
    readonly graphBuilder?: IAstImportExportGraphBuilder

    /**
     * Optional default max number of returned issues.
     */
    readonly defaultMaxIssues?: number
}

/**
 * Interface contract validator contract.
 */
export interface IAstInterfaceContractValidatorService {
    /**
     * Validates interface contract declarations for classes and interfaces.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic validation issues and summary.
     */
    validate(
        input: IAstInterfaceContractValidatorInput,
    ): Promise<IAstInterfaceContractValidatorResult>
}

interface IResolvedInterfaceContractConfig {
    readonly filePaths?: readonly string[]
    readonly maxIssues: number
}

interface IInterfaceDeclarationReference {
    readonly filePath: string
    readonly declarationName: string
}

interface IValidationContext {
    readonly interfaceIndex: ReadonlyMap<string, readonly IInterfaceDeclarationReference[]>
    readonly reachableTargetsBySource: ReadonlyMap<string, ReadonlySet<string>>
}

interface IValidationAggregation {
    readonly issues: readonly IAstInterfaceContractIssue[]
    readonly checkedClassCount: number
    readonly checkedInterfaceCount: number
}

/**
 * Validates class and interface contracts across parsed files.
 */
export class AstInterfaceContractValidatorService
    implements IAstInterfaceContractValidatorService
{
    private readonly graphBuilder: IAstImportExportGraphBuilder
    private readonly defaultMaxIssues: number

    /**
     * Creates interface contract validator service.
     *
     * @param options Optional validator configuration.
     */
    public constructor(options: IAstInterfaceContractValidatorServiceOptions = {}) {
        this.graphBuilder = options.graphBuilder ?? new AstImportExportGraphBuilder()
        this.defaultMaxIssues = validateMaxIssues(options.defaultMaxIssues ?? DEFAULT_MAX_ISSUES)
    }

    /**
     * Validates interface contract declarations for classes and interfaces.
     *
     * @param input Parsed source files and optional runtime settings.
     * @returns Deterministic validation issues and summary.
     */
    public async validate(
        input: IAstInterfaceContractValidatorInput,
    ): Promise<IAstInterfaceContractValidatorResult> {
        const config = this.resolveConfig(input)
        const graph = await this.graphBuilder.build(input.files, {
            filePaths: config.filePaths,
        })
        const sourceFiles = resolveSourceFiles(input.files, config.filePaths)
        const context: IValidationContext = {
            interfaceIndex: createInterfaceIndex(input.files),
            reachableTargetsBySource: createReachableTargetsBySource(
                sourceFiles,
                graph.edgesBySource,
            ),
        }
        const aggregation = validateSourceFiles(sourceFiles, context)
        const sortedIssues = [...aggregation.issues].sort(compareIssues)
        const issues = sortedIssues.slice(0, config.maxIssues)
        const truncatedIssueCount = Math.max(0, sortedIssues.length - issues.length)

        return {
            issues,
            summary: createSummary(
                graph.summary.scannedFileCount,
                aggregation.checkedClassCount,
                aggregation.checkedInterfaceCount,
                issues,
                truncatedIssueCount,
            ),
        }
    }

    /**
     * Resolves runtime config with validated defaults.
     *
     * @param input Runtime input.
     * @returns Validated runtime config.
     */
    private resolveConfig(
        input: IAstInterfaceContractValidatorInput,
    ): IResolvedInterfaceContractConfig {
        return {
            filePaths: normalizeFilePathFilter(input.filePaths),
            maxIssues: validateMaxIssues(input.maxIssues ?? this.defaultMaxIssues),
        }
    }
}

/**
 * Validates max issue cap.
 *
 * @param maxIssues Raw max issue cap.
 * @returns Validated max issue cap.
 */
function validateMaxIssues(maxIssues: number): number {
    if (Number.isSafeInteger(maxIssues) === false || maxIssues < 1) {
        throw new AstInterfaceContractValidatorError(
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.INVALID_MAX_ISSUES,
            {maxIssues},
        )
    }

    return maxIssues
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw file-path filter.
 * @returns Sorted unique normalized file paths or undefined.
 */
function normalizeFilePathFilter(
    filePaths: readonly string[] | undefined,
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstInterfaceContractValidatorError(
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.EMPTY_FILE_PATHS,
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
        throw new AstInterfaceContractValidatorError(
            AST_INTERFACE_CONTRACT_VALIDATOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Resolves source files to validate from runtime scope.
 *
 * @param files Parsed source files.
 * @param requestedFilePaths Optional source file scope.
 * @returns Deterministic source files to validate.
 */
function resolveSourceFiles(
    files: readonly IParsedSourceFileDTO[],
    requestedFilePaths: readonly string[] | undefined,
): readonly IParsedSourceFileDTO[] {
    const fileByPath = indexFilesByPath(files)

    if (requestedFilePaths === undefined) {
        return [...fileByPath.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map((entry) => entry[1])
    }

    const selectedFiles: IParsedSourceFileDTO[] = []
    for (const filePath of requestedFilePaths) {
        const selectedFile = fileByPath.get(filePath)
        if (selectedFile !== undefined) {
            selectedFiles.push(selectedFile)
        }
    }

    return selectedFiles
}

/**
 * Indexes parsed files by normalized file path.
 *
 * @param files Parsed source files.
 * @returns File lookup by normalized path.
 */
function indexFilesByPath(
    files: readonly IParsedSourceFileDTO[],
): ReadonlyMap<string, IParsedSourceFileDTO> {
    const fileByPath = new Map<string, IParsedSourceFileDTO>()

    for (const file of files) {
        fileByPath.set(normalizeFilePath(file.filePath), file)
    }

    return fileByPath
}

/**
 * Creates global interface declaration index by normalized contract name.
 *
 * @param files Parsed source files.
 * @returns Interface index.
 */
function createInterfaceIndex(
    files: readonly IParsedSourceFileDTO[],
): ReadonlyMap<string, readonly IInterfaceDeclarationReference[]> {
    const index = new Map<string, IInterfaceDeclarationReference[]>()

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)

        for (const declaration of file.interfaces) {
            const normalizedName = normalizeContractName(declaration.name)
            if (normalizedName.length === 0) {
                continue
            }

            const bucket = index.get(normalizedName)
            const reference: IInterfaceDeclarationReference = {
                filePath,
                declarationName: declaration.name,
            }

            if (bucket === undefined) {
                index.set(normalizedName, [reference])
                continue
            }

            bucket.push(reference)
        }
    }

    return freezeInterfaceIndex(index)
}

/**
 * Freezes mutable interface index for deterministic reads.
 *
 * @param index Mutable interface index.
 * @returns Immutable deterministic interface index.
 */
function freezeInterfaceIndex(
    index: Map<string, IInterfaceDeclarationReference[]>,
): ReadonlyMap<string, readonly IInterfaceDeclarationReference[]> {
    const entries = [...index.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([contractName, references]): [string, readonly IInterfaceDeclarationReference[]] => {
            return [contractName, [...references].sort(compareInterfaceReferences)]
        })

    return new Map<string, readonly IInterfaceDeclarationReference[]>(entries)
}

/**
 * Compares interface declaration references deterministically.
 *
 * @param left Left reference.
 * @param right Right reference.
 * @returns Sort result.
 */
function compareInterfaceReferences(
    left: IInterfaceDeclarationReference,
    right: IInterfaceDeclarationReference,
): number {
    const filePathCompare = left.filePath.localeCompare(right.filePath)
    if (filePathCompare !== 0) {
        return filePathCompare
    }

    return left.declarationName.localeCompare(right.declarationName)
}

/**
 * Creates reachable-target index for source files using graph edges.
 *
 * @param sourceFiles Source files under validation.
 * @param edgesBySource Outgoing edge index.
 * @returns Reachable targets by source file path.
 */
function createReachableTargetsBySource(
    sourceFiles: readonly IParsedSourceFileDTO[],
    edgesBySource: ReadonlyMap<string, readonly IAstImportExportGraphEdge[]>,
): ReadonlyMap<string, ReadonlySet<string>> {
    const reachableTargetsBySource = new Map<string, ReadonlySet<string>>()

    for (const sourceFile of sourceFiles) {
        const sourceFilePath = normalizeFilePath(sourceFile.filePath)
        reachableTargetsBySource.set(
            sourceFilePath,
            collectReachableTargets(sourceFilePath, edgesBySource),
        )
    }

    return reachableTargetsBySource
}

/**
 * Collects transitive reachable targets from one source file.
 *
 * @param sourceFilePath Source file path.
 * @param edgesBySource Outgoing edge index.
 * @returns Reachable target file paths.
 */
function collectReachableTargets(
    sourceFilePath: string,
    edgesBySource: ReadonlyMap<string, readonly IAstImportExportGraphEdge[]>,
): ReadonlySet<string> {
    const visited = new Set<string>()
    const stack = [sourceFilePath]

    while (stack.length > 0) {
        const current = stack.pop()
        if (current === undefined) {
            continue
        }

        const edges = edgesBySource.get(current)
        if (edges === undefined) {
            continue
        }

        for (const edge of edges) {
            if (visited.has(edge.targetFilePath)) {
                continue
            }

            visited.add(edge.targetFilePath)
            stack.push(edge.targetFilePath)
        }
    }

    const orderedTargets = [...visited].sort((left, right) => left.localeCompare(right))
    return new Set<string>(orderedTargets)
}

/**
 * Validates class and interface contracts for source files.
 *
 * @param sourceFiles Source files under validation.
 * @param context Validation context.
 * @returns Validation aggregation.
 */
function validateSourceFiles(
    sourceFiles: readonly IParsedSourceFileDTO[],
    context: IValidationContext,
): IValidationAggregation {
    const issues: IAstInterfaceContractIssue[] = []
    let checkedClassCount = 0
    let checkedInterfaceCount = 0

    for (const sourceFile of sourceFiles) {
        const filePath = normalizeFilePath(sourceFile.filePath)
        const classDeclarations = sortClassDeclarations(sourceFile.classes)
        const interfaceDeclarations = sortInterfaceDeclarations(sourceFile.interfaces)

        checkedClassCount += classDeclarations.length
        checkedInterfaceCount += interfaceDeclarations.length

        issues.push(...validateClassContracts(filePath, classDeclarations, context))
        issues.push(...validateInterfaceContracts(filePath, interfaceDeclarations, context))
    }

    return {
        issues,
        checkedClassCount,
        checkedInterfaceCount,
    }
}

/**
 * Validates class implements contracts for one file.
 *
 * @param filePath Source file path.
 * @param declarations Sorted class declarations.
 * @param context Validation context.
 * @returns Collected issues.
 */
function validateClassContracts(
    filePath: string,
    declarations: readonly IAstClassDTO[],
    context: IValidationContext,
): readonly IAstInterfaceContractIssue[] {
    const issues: IAstInterfaceContractIssue[] = []

    for (const declaration of declarations) {
        const seenContracts = new Set<string>()

        for (const rawContractName of declaration.implementsTypes) {
            const normalizedContractName = normalizeContractName(rawContractName)
            if (normalizedContractName.length === 0) {
                continue
            }

            if (seenContracts.has(normalizedContractName)) {
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.DUPLICATE_IMPLEMENTED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.LOW,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.CLASS,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths: [],
                        reason: `Class ${declaration.name} repeats implemented contract ${normalizedContractName}`,
                    }),
                )
                continue
            }

            seenContracts.add(normalizedContractName)
            const candidates = resolveInterfaceCandidates(
                normalizedContractName,
                filePath,
                context,
            )

            if (candidates.length === 0) {
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.MISSING_IMPLEMENTED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.HIGH,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.CLASS,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths: [],
                        reason: `Class ${declaration.name} implements missing interface ${normalizedContractName}`,
                    }),
                )
                continue
            }

            if (candidates.length > 1) {
                const candidateFilePaths = collectCandidateFilePaths(candidates)
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.AMBIGUOUS_IMPLEMENTED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.MEDIUM,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.CLASS,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths,
                        reason: `Class ${declaration.name} implements ambiguous interface ${normalizedContractName}`,
                    }),
                )
            }
        }
    }

    return issues
}

/**
 * Validates interface extends contracts for one file.
 *
 * @param filePath Source file path.
 * @param declarations Sorted interface declarations.
 * @param context Validation context.
 * @returns Collected issues.
 */
function validateInterfaceContracts(
    filePath: string,
    declarations: readonly IAstInterfaceDTO[],
    context: IValidationContext,
): readonly IAstInterfaceContractIssue[] {
    const issues: IAstInterfaceContractIssue[] = []

    for (const declaration of declarations) {
        const seenContracts = new Set<string>()

        for (const rawContractName of declaration.extendsTypes) {
            const normalizedContractName = normalizeContractName(rawContractName)
            if (normalizedContractName.length === 0) {
                continue
            }

            if (seenContracts.has(normalizedContractName)) {
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.DUPLICATE_EXTENDED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.LOW,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.INTERFACE,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths: [],
                        reason: `Interface ${declaration.name} repeats extended contract ${normalizedContractName}`,
                    }),
                )
                continue
            }

            seenContracts.add(normalizedContractName)
            const candidates = resolveInterfaceCandidates(
                normalizedContractName,
                filePath,
                context,
            )

            if (candidates.length === 0) {
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.MISSING_EXTENDED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.HIGH,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.INTERFACE,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths: [],
                        reason: `Interface ${declaration.name} extends missing interface ${normalizedContractName}`,
                    }),
                )
                continue
            }

            if (candidates.length > 1) {
                const candidateFilePaths = collectCandidateFilePaths(candidates)
                issues.push(
                    createIssue({
                        type: AST_INTERFACE_CONTRACT_ISSUE_TYPE.AMBIGUOUS_EXTENDED_INTERFACE,
                        severity: AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.MEDIUM,
                        filePath,
                        declarationKind: AST_INTERFACE_CONTRACT_DECLARATION_KIND.INTERFACE,
                        declarationName: declaration.name,
                        contractName: normalizedContractName,
                        candidateFilePaths,
                        reason: `Interface ${declaration.name} extends ambiguous interface ${normalizedContractName}`,
                    }),
                )
            }
        }
    }

    return issues
}

interface ICreateIssueInput {
    readonly type: AstInterfaceContractIssueType
    readonly severity: AstInterfaceContractIssueSeverity
    readonly filePath: string
    readonly declarationKind: AstInterfaceContractDeclarationKind
    readonly declarationName: string
    readonly contractName: string
    readonly candidateFilePaths: readonly string[]
    readonly reason: string
}

/**
 * Creates deterministic issue payload.
 *
 * @param input Issue data.
 * @returns Validation issue.
 */
function createIssue(input: ICreateIssueInput): IAstInterfaceContractIssue {
    return {
        id: createIssueId(input),
        type: input.type,
        severity: input.severity,
        filePath: input.filePath,
        declarationKind: input.declarationKind,
        declarationName: input.declarationName,
        contractName: input.contractName,
        candidateFilePaths: input.candidateFilePaths,
        reason: input.reason,
    }
}

/**
 * Creates stable issue identifier.
 *
 * @param input Issue data.
 * @returns Stable identifier.
 */
function createIssueId(input: ICreateIssueInput): string {
    return [
        input.type,
        input.filePath,
        input.declarationKind,
        input.declarationName,
        input.contractName,
        input.candidateFilePaths.join(","),
    ].join("|")
}

/**
 * Resolves interface candidates for one normalized contract name.
 *
 * @param contractName Normalized contract name.
 * @param sourceFilePath Source file path.
 * @param context Validation context.
 * @returns Candidate interface declarations.
 */
function resolveInterfaceCandidates(
    contractName: string,
    sourceFilePath: string,
    context: IValidationContext,
): readonly IInterfaceDeclarationReference[] {
    const allCandidates = context.interfaceIndex.get(contractName)
    if (allCandidates === undefined || allCandidates.length === 0) {
        return []
    }

    const sameFileCandidates = allCandidates.filter(
        (candidate) => candidate.filePath === sourceFilePath,
    )
    if (sameFileCandidates.length > 0) {
        return sameFileCandidates
    }

    const reachableTargets = context.reachableTargetsBySource.get(sourceFilePath)
    if (reachableTargets === undefined) {
        return allCandidates
    }

    const reachableCandidates = allCandidates.filter((candidate) => {
        return reachableTargets.has(candidate.filePath)
    })
    if (reachableCandidates.length > 0) {
        return reachableCandidates
    }

    return allCandidates
}

/**
 * Collects sorted unique candidate file paths.
 *
 * @param candidates Candidate interface declarations.
 * @returns Candidate file paths.
 */
function collectCandidateFilePaths(
    candidates: readonly IInterfaceDeclarationReference[],
): readonly string[] {
    const candidateFilePathSet = new Set<string>()

    for (const candidate of candidates) {
        candidateFilePathSet.add(candidate.filePath)
    }

    return [...candidateFilePathSet].sort((left, right) => left.localeCompare(right))
}

/**
 * Sorts class declarations deterministically.
 *
 * @param declarations Raw class declarations.
 * @returns Sorted class declarations.
 */
function sortClassDeclarations(
    declarations: readonly IAstClassDTO[],
): readonly IAstClassDTO[] {
    return [...declarations].sort(compareClassDeclarations)
}

/**
 * Sorts interface declarations deterministically.
 *
 * @param declarations Raw interface declarations.
 * @returns Sorted interface declarations.
 */
function sortInterfaceDeclarations(
    declarations: readonly IAstInterfaceDTO[],
): readonly IAstInterfaceDTO[] {
    return [...declarations].sort(compareInterfaceDeclarations)
}

/**
 * Compares class declarations by location and name.
 *
 * @param left Left declaration.
 * @param right Right declaration.
 * @returns Sort result.
 */
function compareClassDeclarations(left: IAstClassDTO, right: IAstClassDTO): number {
    const locationCompare = compareLocation(left.location, right.location)
    if (locationCompare !== 0) {
        return locationCompare
    }

    return left.name.localeCompare(right.name)
}

/**
 * Compares interface declarations by location and name.
 *
 * @param left Left declaration.
 * @param right Right declaration.
 * @returns Sort result.
 */
function compareInterfaceDeclarations(left: IAstInterfaceDTO, right: IAstInterfaceDTO): number {
    const locationCompare = compareLocation(left.location, right.location)
    if (locationCompare !== 0) {
        return locationCompare
    }

    return left.name.localeCompare(right.name)
}

/**
 * Compares two source locations deterministically.
 *
 * @param left Left source location.
 * @param right Right source location.
 * @returns Sort result.
 */
function compareLocation(
    left: {lineStart: number; columnStart: number},
    right: {lineStart: number; columnStart: number},
): number {
    if (left.lineStart !== right.lineStart) {
        return left.lineStart - right.lineStart
    }

    return left.columnStart - right.columnStart
}

/**
 * Compares issues deterministically by severity, type and location.
 *
 * @param left Left issue.
 * @param right Right issue.
 * @returns Sort result.
 */
function compareIssues(
    left: IAstInterfaceContractIssue,
    right: IAstInterfaceContractIssue,
): number {
    const leftSeverityIndex = ISSUE_SEVERITY_ORDER.indexOf(left.severity)
    const rightSeverityIndex = ISSUE_SEVERITY_ORDER.indexOf(right.severity)
    if (leftSeverityIndex !== rightSeverityIndex) {
        return leftSeverityIndex - rightSeverityIndex
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

    const leftKindIndex = DECLARATION_KIND_ORDER.indexOf(left.declarationKind)
    const rightKindIndex = DECLARATION_KIND_ORDER.indexOf(right.declarationKind)
    if (leftKindIndex !== rightKindIndex) {
        return leftKindIndex - rightKindIndex
    }

    const declarationCompare = left.declarationName.localeCompare(right.declarationName)
    if (declarationCompare !== 0) {
        return declarationCompare
    }

    const contractCompare = left.contractName.localeCompare(right.contractName)
    if (contractCompare !== 0) {
        return contractCompare
    }

    return left.id.localeCompare(right.id)
}

/**
 * Builds summary payload from returned issues.
 *
 * @param scannedFileCount Number of source files scanned by graph builder.
 * @param checkedClassCount Number of analyzed class declarations.
 * @param checkedInterfaceCount Number of analyzed interface declarations.
 * @param issues Returned issues.
 * @param truncatedIssueCount Number of omitted issues.
 * @returns Aggregated summary.
 */
function createSummary(
    scannedFileCount: number,
    checkedClassCount: number,
    checkedInterfaceCount: number,
    issues: readonly IAstInterfaceContractIssue[],
    truncatedIssueCount: number,
): IAstInterfaceContractValidatorSummary {
    const byType: Record<AstInterfaceContractIssueType, number> = {
        MISSING_IMPLEMENTED_INTERFACE: 0,
        AMBIGUOUS_IMPLEMENTED_INTERFACE: 0,
        DUPLICATE_IMPLEMENTED_INTERFACE: 0,
        MISSING_EXTENDED_INTERFACE: 0,
        AMBIGUOUS_EXTENDED_INTERFACE: 0,
        DUPLICATE_EXTENDED_INTERFACE: 0,
    }

    let highSeverityCount = 0

    for (const issue of issues) {
        byType[issue.type] += 1

        if (issue.severity === AST_INTERFACE_CONTRACT_ISSUE_SEVERITY.HIGH) {
            highSeverityCount += 1
        }
    }

    return {
        scannedFileCount,
        checkedClassCount,
        checkedInterfaceCount,
        issueCount: issues.length,
        highSeverityCount,
        truncated: truncatedIssueCount > 0,
        truncatedIssueCount,
        byType,
    }
}

/**
 * Normalizes raw type token to contract identifier.
 *
 * @param value Raw contract token.
 * @returns Normalized contract identifier.
 */
function normalizeContractName(value: string): string {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
        return ""
    }

    const withoutGenerics = stripGenericSegments(trimmed)
    const withoutNullable = withoutGenerics.replace(/\?/g, "")
    const withoutArraySuffix = withoutNullable.endsWith("[]")
        ? withoutNullable.slice(0, -2)
        : withoutNullable
    const segments = withoutArraySuffix
        .split(/::|\.|:/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)

    if (segments.length === 0) {
        return ""
    }

    return segments[segments.length - 1] ?? ""
}

/**
 * Strips nested generic segment content from raw type token.
 *
 * @param value Raw type token.
 * @returns Type token without generic segment content.
 */
function stripGenericSegments(value: string): string {
    let depth = 0
    let result = ""

    for (const char of value) {
        if (char === "<") {
            depth += 1
            continue
        }

        if (char === ">") {
            if (depth > 0) {
                depth -= 1
                continue
            }
        }

        if (depth === 0) {
            result += char
        }
    }

    return result.trim()
}
