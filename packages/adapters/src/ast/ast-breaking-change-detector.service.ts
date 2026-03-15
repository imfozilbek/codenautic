import {AST_IMPORT_KIND, FilePath, type IParsedSourceFileDTO} from "@codenautic/core"

import {
    AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE,
    AstBreakingChangeDetectorError,
} from "./ast-breaking-change-detector.error"
import {
    AstImportExportGraphBuilder,
    type IAstImportExportGraphBuilder,
    type IAstImportExportGraphResult,
} from "./ast-import-export-graph-builder"

const DEFAULT_MAX_AFFECTED_FILES = 100

const BREAKING_CHANGE_TYPE_ORDER = [
    "REMOVED_FILE_EXPORT_SURFACE",
    "REMOVED_SYMBOL_EXPORT",
] as const

/**
 * Breaking change type for export-surface comparison.
 */
export const AST_BREAKING_CHANGE_TYPE = {
    REMOVED_FILE_EXPORT_SURFACE: "REMOVED_FILE_EXPORT_SURFACE",
    REMOVED_SYMBOL_EXPORT: "REMOVED_SYMBOL_EXPORT",
} as const

/**
 * Breaking change severity.
 */
export const AST_BREAKING_CHANGE_SEVERITY = {
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
} as const

/**
 * Breaking change type literal.
 */
export type AstBreakingChangeType =
    (typeof AST_BREAKING_CHANGE_TYPE)[keyof typeof AST_BREAKING_CHANGE_TYPE]

/**
 * Breaking change severity literal.
 */
export type AstBreakingChangeSeverity =
    (typeof AST_BREAKING_CHANGE_SEVERITY)[keyof typeof AST_BREAKING_CHANGE_SEVERITY]

/**
 * One breaking change record.
 */
export interface IAstBreakingChange {
    /**
     * Stable deterministic breaking change identifier.
     */
    readonly id: string

    /**
     * Breaking change type.
     */
    readonly type: AstBreakingChangeType

    /**
     * Severity derived from affected consumer footprint.
     */
    readonly severity: AstBreakingChangeSeverity

    /**
     * Provider file where export-surface break occurred.
     */
    readonly providerFilePath: string

    /**
     * Removed symbol when type is `REMOVED_SYMBOL_EXPORT`.
     */
    readonly symbol?: string

    /**
     * Total affected file count before truncation.
     */
    readonly affectedFileCount: number

    /**
     * Sorted affected file paths truncated by configured cap.
     */
    readonly affectedFilePaths: readonly string[]

    /**
     * Indicates affected-file list truncation.
     */
    readonly truncatedAffectedFiles: boolean

    /**
     * Stable human-readable reason.
     */
    readonly reason: string
}

/**
 * Breaking change detector summary.
 */
export interface IAstBreakingChangeDetectorSummary {
    /**
     * Number of evaluated provider files.
     */
    readonly providerFileCount: number

    /**
     * Number of detected breaking changes.
     */
    readonly breakingChangeCount: number

    /**
     * Number of high severity breaking changes.
     */
    readonly highSeverityCount: number

    /**
     * Number of unique affected files in output payload.
     */
    readonly affectedFileCount: number

    /**
     * Number of breaking changes with truncated affected file lists.
     */
    readonly truncatedChangeCount: number
}

/**
 * Breaking change detector output.
 */
export interface IAstBreakingChangeDetectorResult {
    /**
     * Deterministic sorted breaking changes.
     */
    readonly breakingChanges: readonly IAstBreakingChange[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstBreakingChangeDetectorSummary
}

/**
 * Runtime input for breaking change detector.
 */
export interface IAstBreakingChangeDetectorInput {
    /**
     * Baseline parsed source files.
     */
    readonly baseFiles: readonly IParsedSourceFileDTO[]

    /**
     * Target parsed source files after change.
     */
    readonly targetFiles: readonly IParsedSourceFileDTO[]

    /**
     * Optional provider file subset to evaluate.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional max affected file cap per breaking change.
     */
    readonly maxAffectedFiles?: number
}

/**
 * Breaking change detector construction options.
 */
export interface IAstBreakingChangeDetectorServiceOptions {
    /**
     * Optional import/export graph builder override.
     */
    readonly graphBuilder?: IAstImportExportGraphBuilder

    /**
     * Optional default max affected file cap.
     */
    readonly defaultMaxAffectedFiles?: number
}

/**
 * Breaking change detector contract.
 */
export interface IAstBreakingChangeDetectorService {
    /**
     * Detects export-surface breaking changes between baseline and target snapshots.
     *
     * @param input Baseline and target parsed source files.
     * @returns Deterministic breaking change payload.
     */
    detect(
        input: IAstBreakingChangeDetectorInput,
    ): Promise<IAstBreakingChangeDetectorResult>
}

interface IResolvedBreakingChangeConfig {
    readonly filePaths?: readonly string[]
    readonly maxAffectedFiles: number
}

interface IAffectedFileResolution {
    readonly filePaths: readonly string[]
    readonly totalCount: number
    readonly truncated: boolean
}

interface IExportDeclaration {
    readonly name: string
    readonly exported: boolean
}

/**
 * Detects export-surface breaking changes with consumer impact metadata.
 */
export class AstBreakingChangeDetectorService
    implements IAstBreakingChangeDetectorService
{
    private readonly graphBuilder: IAstImportExportGraphBuilder
    private readonly defaultMaxAffectedFiles: number

    /**
     * Creates breaking change detector service.
     *
     * @param options Optional detector configuration.
     */
    public constructor(options: IAstBreakingChangeDetectorServiceOptions = {}) {
        this.graphBuilder = options.graphBuilder ?? new AstImportExportGraphBuilder()
        this.defaultMaxAffectedFiles = validateMaxAffectedFiles(
            options.defaultMaxAffectedFiles ?? DEFAULT_MAX_AFFECTED_FILES,
        )
    }

    /**
     * Detects export-surface breaking changes.
     *
     * @param input Baseline and target parsed source files.
     * @returns Deterministic breaking change payload.
     */
    public async detect(
        input: IAstBreakingChangeDetectorInput,
    ): Promise<IAstBreakingChangeDetectorResult> {
        const config = this.resolveConfig(input)
        const baseGraph = await this.graphBuilder.build(input.baseFiles)
        const baseExports = collectExportSurface(input.baseFiles)
        const targetExports = collectExportSurface(input.targetFiles)
        const providerFilePaths = resolveProviderFilePaths(baseExports, config.filePaths)
        const changes = detectBreakingChanges(
            providerFilePaths,
            baseExports,
            targetExports,
            baseGraph,
            config.maxAffectedFiles,
        )
        const breakingChanges = deduplicateAndSortBreakingChanges(changes)

        return {
            breakingChanges,
            summary: createSummary(providerFilePaths.length, breakingChanges),
        }
    }

    /**
     * Resolves runtime config with validated defaults.
     *
     * @param input Runtime input.
     * @returns Validated config.
     */
    private resolveConfig(
        input: IAstBreakingChangeDetectorInput,
    ): IResolvedBreakingChangeConfig {
        return {
            filePaths: normalizeFilePathFilter(input.filePaths),
            maxAffectedFiles: validateMaxAffectedFiles(
                input.maxAffectedFiles ?? this.defaultMaxAffectedFiles,
            ),
        }
    }
}

/**
 * Validates max affected file cap.
 *
 * @param maxAffectedFiles Raw cap.
 * @returns Validated cap.
 */
function validateMaxAffectedFiles(maxAffectedFiles: number): number {
    if (Number.isSafeInteger(maxAffectedFiles) === false || maxAffectedFiles < 1) {
        throw new AstBreakingChangeDetectorError(
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_AFFECTED_FILES,
            {maxAffectedFiles},
        )
    }

    return maxAffectedFiles
}

/**
 * Normalizes optional provider file-path filter.
 *
 * @param filePaths Raw file paths.
 * @returns Sorted unique normalized file paths or undefined.
 */
function normalizeFilePathFilter(
    filePaths: readonly string[] | undefined,
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstBreakingChangeDetectorError(
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
        )
    }

    const normalizedPaths = new Set<string>()

    for (const filePath of filePaths) {
        normalizedPaths.add(normalizeFilePath(filePath))
    }

    return [...normalizedPaths].sort((left, right) => left.localeCompare(right))
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
        throw new AstBreakingChangeDetectorError(
            AST_BREAKING_CHANGE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Collects export symbol surface by normalized file path.
 *
 * @param files Parsed source files.
 * @returns Export symbol surface lookup.
 */
function collectExportSurface(
    files: readonly IParsedSourceFileDTO[],
): ReadonlyMap<string, ReadonlySet<string>> {
    const exportSurface = new Map<string, Set<string>>()

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)
        const symbols = exportSurface.get(filePath) ?? new Set<string>()
        const declarationSymbols = collectExportDeclarationSymbols(file)

        for (const symbol of declarationSymbols) {
            symbols.add(symbol)
        }

        exportSurface.set(filePath, symbols)
    }

    return freezeExportSurface(exportSurface)
}

/**
 * Collects exported symbols from one parsed source file.
 *
 * @param file Parsed source file.
 * @returns Sorted unique export symbols.
 */
function collectExportDeclarationSymbols(file: IParsedSourceFileDTO): readonly string[] {
    const symbols = new Set<string>()

    appendExportedDeclarationNames(symbols, file.classes)
    appendExportedDeclarationNames(symbols, file.interfaces)
    appendExportedDeclarationNames(symbols, file.enums)
    appendExportedDeclarationNames(symbols, file.typeAliases)
    appendExportedDeclarationNames(symbols, file.functions)

    for (const statement of file.imports) {
        if (statement.kind !== AST_IMPORT_KIND.EXPORT_FROM) {
            continue
        }

        appendExportSpecifiers(symbols, statement.specifiers)
    }

    return [...symbols].sort((left, right) => left.localeCompare(right))
}

/**
 * Appends exported declaration names into symbol set.
 *
 * @param symbols Mutable export symbol set.
 * @param declarations Parsed declarations.
 */
function appendExportedDeclarationNames(
    symbols: Set<string>,
    declarations: readonly IExportDeclaration[],
): void {
    for (const declaration of declarations) {
        if (declaration.exported) {
            symbols.add(declaration.name)
        }
    }
}

/**
 * Appends normalized non-empty export specifiers into symbol set.
 *
 * @param symbols Mutable export symbol set.
 * @param specifiers Raw export specifiers.
 */
function appendExportSpecifiers(symbols: Set<string>, specifiers: readonly string[]): void {
    for (const specifier of specifiers) {
        const normalizedSpecifier = specifier.trim()
        if (normalizedSpecifier.length > 0) {
            symbols.add(normalizedSpecifier)
        }
    }
}

/**
 * Freezes mutable export-surface map into immutable deterministic lookup.
 *
 * @param exportSurface Mutable export-surface map.
 * @returns Immutable export-surface lookup.
 */
function freezeExportSurface(
    exportSurface: Map<string, Set<string>>,
): ReadonlyMap<string, ReadonlySet<string>> {
    const entries = [...exportSurface.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([filePath, symbols]): [string, ReadonlySet<string>] => {
            return [filePath, new Set<string>([...symbols].sort((left, right) => left.localeCompare(right)))]
        })

    return new Map<string, ReadonlySet<string>>(entries)
}

/**
 * Resolves provider file paths to evaluate.
 *
 * @param baseExports Baseline export surface.
 * @param requestedFilePaths Optional requested file subset.
 * @returns Sorted provider file paths.
 */
function resolveProviderFilePaths(
    baseExports: ReadonlyMap<string, ReadonlySet<string>>,
    requestedFilePaths: readonly string[] | undefined,
): readonly string[] {
    const baseProviderPaths = [...baseExports.keys()]

    if (requestedFilePaths === undefined) {
        return baseProviderPaths
    }

    const basePathSet = new Set<string>(baseProviderPaths)
    return requestedFilePaths.filter((filePath) => basePathSet.has(filePath))
}

/**
 * Detects breaking changes for resolved provider file paths.
 *
 * @param providerFilePaths Provider file paths to evaluate.
 * @param baseExports Baseline export surface.
 * @param targetExports Target export surface.
 * @param baseGraph Baseline dependency graph.
 * @param maxAffectedFiles Max affected file cap per breaking change.
 * @returns Mutable breaking change list.
 */
function detectBreakingChanges(
    providerFilePaths: readonly string[],
    baseExports: ReadonlyMap<string, ReadonlySet<string>>,
    targetExports: ReadonlyMap<string, ReadonlySet<string>>,
    baseGraph: IAstImportExportGraphResult,
    maxAffectedFiles: number,
): IAstBreakingChange[] {
    const changes: IAstBreakingChange[] = []

    for (const providerFilePath of providerFilePaths) {
        const baseSymbols = baseExports.get(providerFilePath)
        if (baseSymbols === undefined || baseSymbols.size === 0) {
            continue
        }

        const targetSymbols = targetExports.get(providerFilePath)
        if (targetSymbols === undefined) {
            changes.push(
                createBreakingChange(
                    AST_BREAKING_CHANGE_TYPE.REMOVED_FILE_EXPORT_SURFACE,
                    providerFilePath,
                    undefined,
                    resolveAffectedFiles(baseGraph, providerFilePath, undefined, maxAffectedFiles),
                ),
            )
            continue
        }

        const removedSymbols = [...baseSymbols]
            .filter((symbol) => targetSymbols.has(symbol) === false)
            .sort((left, right) => left.localeCompare(right))

        for (const symbol of removedSymbols) {
            changes.push(
                createBreakingChange(
                    AST_BREAKING_CHANGE_TYPE.REMOVED_SYMBOL_EXPORT,
                    providerFilePath,
                    symbol,
                    resolveAffectedFiles(baseGraph, providerFilePath, symbol, maxAffectedFiles),
                ),
            )
        }
    }

    return changes
}

/**
 * Resolves affected consumer files for one provider break.
 *
 * @param baseGraph Baseline dependency graph.
 * @param providerFilePath Provider file path.
 * @param symbol Optional removed symbol.
 * @param maxAffectedFiles Max affected file cap.
 * @returns Affected file resolution result.
 */
function resolveAffectedFiles(
    baseGraph: IAstImportExportGraphResult,
    providerFilePath: string,
    symbol: string | undefined,
    maxAffectedFiles: number,
): IAffectedFileResolution {
    const incomingEdges = baseGraph.edgesByTarget.get(providerFilePath) ?? []
    const affectedFilePathSet = new Set<string>()

    for (const edge of incomingEdges) {
        if (isEdgeAffectedByRemovedSymbol(edge.specifiers, symbol)) {
            affectedFilePathSet.add(edge.sourceFilePath)
        }
    }

    const affectedFilePaths = [...affectedFilePathSet].sort((left, right) => left.localeCompare(right))
    const truncated = affectedFilePaths.length > maxAffectedFiles

    return {
        filePaths: affectedFilePaths.slice(0, maxAffectedFiles),
        totalCount: affectedFilePaths.length,
        truncated,
    }
}

/**
 * Checks whether import edge is affected by removed symbol.
 *
 * @param specifiers Edge specifiers.
 * @param symbol Removed symbol.
 * @returns True when edge depends on removed symbol.
 */
function isEdgeAffectedByRemovedSymbol(
    specifiers: readonly string[],
    symbol: string | undefined,
): boolean {
    if (symbol === undefined) {
        return true
    }

    if (specifiers.length === 0) {
        return true
    }

    return specifiers.includes(symbol)
}

/**
 * Creates one deterministic breaking change record.
 *
 * @param type Breaking change type.
 * @param providerFilePath Provider file path.
 * @param symbol Removed symbol when available.
 * @param affectedFiles Affected files payload.
 * @returns Breaking change record.
 */
function createBreakingChange(
    type: AstBreakingChangeType,
    providerFilePath: string,
    symbol: string | undefined,
    affectedFiles: IAffectedFileResolution,
): IAstBreakingChange {
    const severity =
        affectedFiles.totalCount > 0
            ? AST_BREAKING_CHANGE_SEVERITY.HIGH
            : AST_BREAKING_CHANGE_SEVERITY.MEDIUM

    return {
        id: createBreakingChangeId(type, providerFilePath, symbol, affectedFiles.filePaths),
        type,
        severity,
        providerFilePath,
        symbol,
        affectedFileCount: affectedFiles.totalCount,
        affectedFilePaths: affectedFiles.filePaths,
        truncatedAffectedFiles: affectedFiles.truncated,
        reason: createBreakingChangeReason(type, providerFilePath, symbol),
    }
}

/**
 * Creates stable breaking change id.
 *
 * @param type Breaking change type.
 * @param providerFilePath Provider file path.
 * @param symbol Removed symbol when available.
 * @param affectedFilePaths Affected file paths.
 * @returns Stable change id.
 */
function createBreakingChangeId(
    type: AstBreakingChangeType,
    providerFilePath: string,
    symbol: string | undefined,
    affectedFilePaths: readonly string[],
): string {
    return [
        type,
        providerFilePath,
        symbol ?? "",
        affectedFilePaths.join(","),
    ].join("|")
}

/**
 * Creates human-readable reason for breaking change.
 *
 * @param type Breaking change type.
 * @param providerFilePath Provider file path.
 * @param symbol Removed symbol when available.
 * @returns Stable reason.
 */
function createBreakingChangeReason(
    type: AstBreakingChangeType,
    providerFilePath: string,
    symbol: string | undefined,
): string {
    if (type === AST_BREAKING_CHANGE_TYPE.REMOVED_FILE_EXPORT_SURFACE) {
        return `Export surface removed for provider file: ${providerFilePath}`
    }

    return `Exported symbol removed: ${symbol ?? "<unknown>"} in ${providerFilePath}`
}

/**
 * Deduplicates and sorts breaking changes deterministically.
 *
 * @param changes Mutable change list.
 * @returns Sorted unique breaking changes.
 */
function deduplicateAndSortBreakingChanges(
    changes: readonly IAstBreakingChange[],
): readonly IAstBreakingChange[] {
    const uniqueById = new Map<string, IAstBreakingChange>()

    for (const change of changes) {
        uniqueById.set(change.id, change)
    }

    return [...uniqueById.values()].sort(compareBreakingChanges)
}

/**
 * Compares breaking changes deterministically.
 *
 * @param left Left breaking change.
 * @param right Right breaking change.
 * @returns Sort result.
 */
function compareBreakingChanges(left: IAstBreakingChange, right: IAstBreakingChange): number {
    const leftTypeIndex = BREAKING_CHANGE_TYPE_ORDER.indexOf(left.type)
    const rightTypeIndex = BREAKING_CHANGE_TYPE_ORDER.indexOf(right.type)

    if (leftTypeIndex !== rightTypeIndex) {
        return leftTypeIndex - rightTypeIndex
    }

    const providerCompare = left.providerFilePath.localeCompare(right.providerFilePath)
    if (providerCompare !== 0) {
        return providerCompare
    }

    return (left.symbol ?? "").localeCompare(right.symbol ?? "")
}

/**
 * Builds breaking change detector summary.
 *
 * @param providerFileCount Number of evaluated provider files.
 * @param breakingChanges Breaking change output.
 * @returns Aggregated summary.
 */
function createSummary(
    providerFileCount: number,
    breakingChanges: readonly IAstBreakingChange[],
): IAstBreakingChangeDetectorSummary {
    const highSeverityCount = breakingChanges.filter((change) => {
        return change.severity === AST_BREAKING_CHANGE_SEVERITY.HIGH
    }).length
    const affectedFileSet = new Set<string>()
    let truncatedChangeCount = 0

    for (const change of breakingChanges) {
        for (const affectedFilePath of change.affectedFilePaths) {
            affectedFileSet.add(affectedFilePath)
        }

        if (change.truncatedAffectedFiles) {
            truncatedChangeCount += 1
        }
    }

    return {
        providerFileCount,
        breakingChangeCount: breakingChanges.length,
        highSeverityCount,
        affectedFileCount: affectedFileSet.size,
        truncatedChangeCount,
    }
}
