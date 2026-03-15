import {FilePath, type IParsedSourceFileDTO} from "@codenautic/core"

import {
    AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE,
    AstApiSurfaceChangeDetectorError,
} from "./ast-api-surface-change-detector.error"

const DEFAULT_MAX_CHANGES = 200

const CHANGE_SEVERITY_ORDER = [
    "HIGH",
    "LOW",
] as const

const SYMBOL_KIND = {
    CLASS: "CLASS",
    ENUM: "ENUM",
    FUNCTION: "FUNCTION",
    INTERFACE: "INTERFACE",
    TYPE_ALIAS: "TYPE_ALIAS",
} as const

type ApiSymbolKind = (typeof SYMBOL_KIND)[keyof typeof SYMBOL_KIND]

/**
 * API surface change type.
 */
export const AST_API_SURFACE_CHANGE_TYPE = {
    ADDED_PUBLIC_FILE: "ADDED_PUBLIC_FILE",
    ADDED_PUBLIC_SYMBOL: "ADDED_PUBLIC_SYMBOL",
    REMOVED_PUBLIC_FILE: "REMOVED_PUBLIC_FILE",
    REMOVED_PUBLIC_SYMBOL: "REMOVED_PUBLIC_SYMBOL",
    CHANGED_PUBLIC_SYMBOL_SHAPE: "CHANGED_PUBLIC_SYMBOL_SHAPE",
} as const

/**
 * API surface change type literal.
 */
export type AstApiSurfaceChangeType =
    (typeof AST_API_SURFACE_CHANGE_TYPE)[keyof typeof AST_API_SURFACE_CHANGE_TYPE]

/**
 * API surface change severity bucket.
 */
export const AST_API_SURFACE_CHANGE_SEVERITY = {
    HIGH: "HIGH",
    LOW: "LOW",
} as const

/**
 * API surface change severity literal.
 */
export type AstApiSurfaceChangeSeverity =
    (typeof AST_API_SURFACE_CHANGE_SEVERITY)[keyof typeof AST_API_SURFACE_CHANGE_SEVERITY]

/**
 * One API surface change entry.
 */
export interface IAstApiSurfaceChange {
    /**
     * Stable deterministic change identifier.
     */
    readonly id: string

    /**
     * API change category.
     */
    readonly type: AstApiSurfaceChangeType

    /**
     * API change severity bucket.
     */
    readonly severity: AstApiSurfaceChangeSeverity

    /**
     * Repository-relative file path where change was observed.
     */
    readonly filePath: string

    /**
     * Optional symbol name when change is symbol-scoped.
     */
    readonly symbolName?: string

    /**
     * Optional sorted symbol kinds from base snapshot.
     */
    readonly beforeKinds?: readonly string[]

    /**
     * Optional sorted symbol kinds from target snapshot.
     */
    readonly afterKinds?: readonly string[]

    /**
     * Stable human-readable reason.
     */
    readonly reason: string
}

/**
 * API surface change detector summary.
 */
export interface IAstApiSurfaceChangeDetectorSummary {
    /**
     * Number of considered files in base snapshot.
     */
    readonly baseFileCount: number

    /**
     * Number of considered files in target snapshot.
     */
    readonly targetFileCount: number

    /**
     * Number of compared files across both snapshots.
     */
    readonly comparedFileCount: number

    /**
     * Number of returned API changes.
     */
    readonly changeCount: number

    /**
     * Number of high-severity returned changes.
     */
    readonly highSeverityCount: number

    /**
     * Whether output was truncated by max changes cap.
     */
    readonly truncated: boolean

    /**
     * Number of omitted changes.
     */
    readonly truncatedChangeCount: number

    /**
     * Returned change counts by type.
     */
    readonly byType: Record<AstApiSurfaceChangeType, number>
}

/**
 * API surface change detector result payload.
 */
export interface IAstApiSurfaceChangeDetectorResult {
    /**
     * Deterministic sorted API changes.
     */
    readonly changes: readonly IAstApiSurfaceChange[]

    /**
     * Aggregated summary.
     */
    readonly summary: IAstApiSurfaceChangeDetectorSummary
}

/**
 * Runtime input for API surface change detector.
 */
export interface IAstApiSurfaceChangeDetectorInput {
    /**
     * Parsed files from base snapshot.
     */
    readonly baseFiles: readonly IParsedSourceFileDTO[]

    /**
     * Parsed files from target snapshot.
     */
    readonly targetFiles: readonly IParsedSourceFileDTO[]

    /**
     * Optional file-path subset filter.
     */
    readonly filePaths?: readonly string[]

    /**
     * Optional max number of returned changes.
     */
    readonly maxChanges?: number
}

/**
 * API surface change detector options.
 */
export interface IAstApiSurfaceChangeDetectorServiceOptions {
    /**
     * Optional default max number of returned changes.
     */
    readonly defaultMaxChanges?: number
}

/**
 * API surface change detector contract.
 */
export interface IAstApiSurfaceChangeDetectorService {
    /**
     * Detects API surface changes between base and target snapshots.
     *
     * @param input Base and target parsed snapshots with runtime settings.
     * @returns Deterministic API surface changes.
     */
    detect(
        input: IAstApiSurfaceChangeDetectorInput,
    ): Promise<IAstApiSurfaceChangeDetectorResult>
}

interface ISnapshotIndex {
    readonly byFilePath: ReadonlyMap<string, ReadonlyMap<string, readonly ApiSymbolKind[]>>
    readonly fileCount: number
}

/**
 * Detects public API surface changes between two parsed snapshots.
 */
export class AstApiSurfaceChangeDetectorService
    implements IAstApiSurfaceChangeDetectorService
{
    private readonly defaultMaxChanges: number

    /**
     * Creates API surface change detector service.
     *
     * @param options Optional detector configuration.
     */
    public constructor(options: IAstApiSurfaceChangeDetectorServiceOptions = {}) {
        this.defaultMaxChanges = validateMaxChanges(
            options.defaultMaxChanges ?? DEFAULT_MAX_CHANGES,
        )
    }

    /**
     * Detects API surface changes between base and target snapshots.
     *
     * @param input Base and target parsed snapshots with runtime settings.
     * @returns Deterministic API surface changes.
     */
    public detect(
        input: IAstApiSurfaceChangeDetectorInput,
    ): Promise<IAstApiSurfaceChangeDetectorResult> {
        const filterFilePaths = normalizeFilterFilePaths(input.filePaths)
        const maxChanges = validateMaxChanges(input.maxChanges ?? this.defaultMaxChanges)
        const baseSnapshot = buildSnapshotIndex(input.baseFiles, filterFilePaths)
        const targetSnapshot = buildSnapshotIndex(input.targetFiles, filterFilePaths)
        const changes = computeApiSurfaceChanges(baseSnapshot, targetSnapshot)
        const truncatedChanges = changes.slice(0, maxChanges)
        const truncatedChangeCount = Math.max(0, changes.length - truncatedChanges.length)

        return Promise.resolve({
            changes: truncatedChanges,
            summary: createSummary(
                baseSnapshot,
                targetSnapshot,
                truncatedChanges,
                truncatedChangeCount,
            ),
        })
    }
}

/**
 * Validates max changes cap.
 *
 * @param maxChanges Raw cap value.
 * @returns Validated cap value.
 */
function validateMaxChanges(maxChanges: number): number {
    if (Number.isSafeInteger(maxChanges) === false || maxChanges < 1) {
        throw new AstApiSurfaceChangeDetectorError(
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.INVALID_MAX_CHANGES,
            {maxChanges},
        )
    }

    return maxChanges
}

/**
 * Normalizes optional file-path subset filter.
 *
 * @param filePaths Raw filter paths.
 * @returns Sorted unique normalized filter paths.
 */
function normalizeFilterFilePaths(
    filePaths?: readonly string[],
): readonly string[] | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstApiSurfaceChangeDetectorError(
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.EMPTY_FILE_PATHS,
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
        throw new AstApiSurfaceChangeDetectorError(
            AST_API_SURFACE_CHANGE_DETECTOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Builds API snapshot index by file and exported symbol.
 *
 * @param files Parsed files from snapshot.
 * @param filterFilePaths Optional filter paths.
 * @returns Snapshot index.
 */
function buildSnapshotIndex(
    files: readonly IParsedSourceFileDTO[],
    filterFilePaths?: readonly string[],
): ISnapshotIndex {
    const filterSet = filterFilePaths === undefined ? undefined : new Set(filterFilePaths)
    const byFilePath = new Map<string, ReadonlyMap<string, readonly ApiSymbolKind[]>>()

    for (const file of files) {
        const normalizedFilePath = normalizeFilePath(file.filePath)
        if (filterSet !== undefined && filterSet.has(normalizedFilePath) === false) {
            continue
        }

        const symbolsByName = collectPublicSymbols(file)
        if (symbolsByName.size === 0) {
            continue
        }

        byFilePath.set(normalizedFilePath, symbolsByName)
    }

    return {
        byFilePath,
        fileCount: byFilePath.size,
    }
}

/**
 * Collects public API symbols for one parsed file.
 *
 * @param file Parsed file.
 * @returns Symbol map with sorted kinds.
 */
function collectPublicSymbols(
    file: IParsedSourceFileDTO,
): ReadonlyMap<string, readonly ApiSymbolKind[]> {
    const kindsBySymbol = new Map<string, Set<ApiSymbolKind>>()

    addExportedClassSymbols(file, kindsBySymbol)
    addExportedEnumSymbols(file, kindsBySymbol)
    addExportedFunctionSymbols(file, kindsBySymbol)
    addExportedInterfaceSymbols(file, kindsBySymbol)
    addExportedTypeAliasSymbols(file, kindsBySymbol)

    const symbolsByName = new Map<string, readonly ApiSymbolKind[]>()

    for (const [symbolName, kinds] of kindsBySymbol.entries()) {
        symbolsByName.set(
            symbolName,
            [...kinds].sort((left, right) => left.localeCompare(right)),
        )
    }

    return symbolsByName
}

/**
 * Adds exported class symbols.
 *
 * @param file Parsed file.
 * @param kindsBySymbol Mutable symbol kind map.
 */
function addExportedClassSymbols(
    file: IParsedSourceFileDTO,
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
): void {
    for (const declaration of file.classes) {
        if (declaration.exported) {
            addSymbolKind(kindsBySymbol, declaration.name, SYMBOL_KIND.CLASS)
        }
    }
}

/**
 * Adds exported enum symbols.
 *
 * @param file Parsed file.
 * @param kindsBySymbol Mutable symbol kind map.
 */
function addExportedEnumSymbols(
    file: IParsedSourceFileDTO,
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
): void {
    for (const declaration of file.enums) {
        if (declaration.exported) {
            addSymbolKind(kindsBySymbol, declaration.name, SYMBOL_KIND.ENUM)
        }
    }
}

/**
 * Adds exported function symbols.
 *
 * @param file Parsed file.
 * @param kindsBySymbol Mutable symbol kind map.
 */
function addExportedFunctionSymbols(
    file: IParsedSourceFileDTO,
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
): void {
    for (const declaration of file.functions) {
        if (declaration.exported) {
            addSymbolKind(kindsBySymbol, declaration.name, SYMBOL_KIND.FUNCTION)
        }
    }
}

/**
 * Adds exported interface symbols.
 *
 * @param file Parsed file.
 * @param kindsBySymbol Mutable symbol kind map.
 */
function addExportedInterfaceSymbols(
    file: IParsedSourceFileDTO,
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
): void {
    for (const declaration of file.interfaces) {
        if (declaration.exported) {
            addSymbolKind(kindsBySymbol, declaration.name, SYMBOL_KIND.INTERFACE)
        }
    }
}

/**
 * Adds exported type-alias symbols.
 *
 * @param file Parsed file.
 * @param kindsBySymbol Mutable symbol kind map.
 */
function addExportedTypeAliasSymbols(
    file: IParsedSourceFileDTO,
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
): void {
    for (const declaration of file.typeAliases) {
        if (declaration.exported) {
            addSymbolKind(kindsBySymbol, declaration.name, SYMBOL_KIND.TYPE_ALIAS)
        }
    }
}

/**
 * Adds one symbol kind into symbol map.
 *
 * @param kindsBySymbol Mutable symbol kind map.
 * @param symbolName Public symbol name.
 * @param kind Symbol kind.
 */
function addSymbolKind(
    kindsBySymbol: Map<string, Set<ApiSymbolKind>>,
    symbolName: string,
    kind: ApiSymbolKind,
): void {
    const existingKinds = kindsBySymbol.get(symbolName)
    if (existingKinds === undefined) {
        kindsBySymbol.set(symbolName, new Set([kind]))
        return
    }

    existingKinds.add(kind)
}

/**
 * Computes deterministic API surface changes.
 *
 * @param baseSnapshot Base snapshot index.
 * @param targetSnapshot Target snapshot index.
 * @returns Deterministic sorted API changes.
 */
function computeApiSurfaceChanges(
    baseSnapshot: ISnapshotIndex,
    targetSnapshot: ISnapshotIndex,
): readonly IAstApiSurfaceChange[] {
    const changes: IAstApiSurfaceChange[] = []
    const comparedFiles = new Set<string>([
        ...baseSnapshot.byFilePath.keys(),
        ...targetSnapshot.byFilePath.keys(),
    ])

    for (const filePath of comparedFiles) {
        const baseSymbols = baseSnapshot.byFilePath.get(filePath)
        const targetSymbols = targetSnapshot.byFilePath.get(filePath)

        if (baseSymbols !== undefined && targetSymbols === undefined) {
            changes.push(createFileChange(filePath, "REMOVED_PUBLIC_FILE"))
            continue
        }

        if (baseSymbols === undefined && targetSymbols !== undefined) {
            changes.push(createFileChange(filePath, "ADDED_PUBLIC_FILE"))
            continue
        }

        if (baseSymbols === undefined || targetSymbols === undefined) {
            continue
        }

        changes.push(...computeSymbolChanges(filePath, baseSymbols, targetSymbols))
    }

    return changes.sort(compareChanges)
}

/**
 * Creates file-level API surface change.
 *
 * @param filePath File path.
 * @param type File-level change type.
 * @returns API surface change.
 */
function createFileChange(
    filePath: string,
    type: "ADDED_PUBLIC_FILE" | "REMOVED_PUBLIC_FILE",
): IAstApiSurfaceChange {
    if (type === "ADDED_PUBLIC_FILE") {
        return {
            id: `ADDED_PUBLIC_FILE|${filePath}`,
            type: AST_API_SURFACE_CHANGE_TYPE.ADDED_PUBLIC_FILE,
            severity: AST_API_SURFACE_CHANGE_SEVERITY.LOW,
            filePath,
            reason: `Public API file was added: ${filePath}`,
        }
    }

    return {
        id: `REMOVED_PUBLIC_FILE|${filePath}`,
        type: AST_API_SURFACE_CHANGE_TYPE.REMOVED_PUBLIC_FILE,
        severity: AST_API_SURFACE_CHANGE_SEVERITY.HIGH,
        filePath,
        reason: `Public API file was removed: ${filePath}`,
    }
}

/**
 * Computes symbol-level API changes for one file.
 *
 * @param filePath File path.
 * @param baseSymbols Base symbol index.
 * @param targetSymbols Target symbol index.
 * @returns Symbol-level API changes.
 */
function computeSymbolChanges(
    filePath: string,
    baseSymbols: ReadonlyMap<string, readonly ApiSymbolKind[]>,
    targetSymbols: ReadonlyMap<string, readonly ApiSymbolKind[]>,
): readonly IAstApiSurfaceChange[] {
    const changes: IAstApiSurfaceChange[] = []
    const symbolNames = new Set<string>([
        ...baseSymbols.keys(),
        ...targetSymbols.keys(),
    ])

    for (const symbolName of symbolNames) {
        const baseKinds = baseSymbols.get(symbolName)
        const targetKinds = targetSymbols.get(symbolName)

        if (baseKinds !== undefined && targetKinds === undefined) {
            changes.push({
                id: `REMOVED_PUBLIC_SYMBOL|${filePath}|${symbolName}`,
                type: AST_API_SURFACE_CHANGE_TYPE.REMOVED_PUBLIC_SYMBOL,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.HIGH,
                filePath,
                symbolName,
                beforeKinds: baseKinds,
                reason: `Public symbol was removed: ${symbolName}`,
            })
            continue
        }

        if (baseKinds === undefined && targetKinds !== undefined) {
            changes.push({
                id: `ADDED_PUBLIC_SYMBOL|${filePath}|${symbolName}`,
                type: AST_API_SURFACE_CHANGE_TYPE.ADDED_PUBLIC_SYMBOL,
                severity: AST_API_SURFACE_CHANGE_SEVERITY.LOW,
                filePath,
                symbolName,
                afterKinds: targetKinds,
                reason: `Public symbol was added: ${symbolName}`,
            })
            continue
        }

        if (baseKinds === undefined || targetKinds === undefined) {
            continue
        }

        if (areKindsEqual(baseKinds, targetKinds)) {
            continue
        }

        changes.push({
            id: `CHANGED_PUBLIC_SYMBOL_SHAPE|${filePath}|${symbolName}`,
            type: AST_API_SURFACE_CHANGE_TYPE.CHANGED_PUBLIC_SYMBOL_SHAPE,
            severity: AST_API_SURFACE_CHANGE_SEVERITY.HIGH,
            filePath,
            symbolName,
            beforeKinds: baseKinds,
            afterKinds: targetKinds,
            reason: `Public symbol shape changed: ${symbolName}`,
        })
    }

    return changes
}

/**
 * Compares symbol kind lists.
 *
 * @param leftKinds Left kind list.
 * @param rightKinds Right kind list.
 * @returns True when kind lists are equal.
 */
function areKindsEqual(
    leftKinds: readonly ApiSymbolKind[],
    rightKinds: readonly ApiSymbolKind[],
): boolean {
    if (leftKinds.length !== rightKinds.length) {
        return false
    }

    for (let index = 0; index < leftKinds.length; index += 1) {
        if (leftKinds[index] !== rightKinds[index]) {
            return false
        }
    }

    return true
}

/**
 * Compares API changes deterministically.
 *
 * @param left Left change.
 * @param right Right change.
 * @returns Sort result.
 */
function compareChanges(left: IAstApiSurfaceChange, right: IAstApiSurfaceChange): number {
    if (left.severity !== right.severity) {
        return CHANGE_SEVERITY_ORDER.indexOf(left.severity) - CHANGE_SEVERITY_ORDER.indexOf(right.severity)
    }

    if (left.filePath !== right.filePath) {
        return left.filePath.localeCompare(right.filePath)
    }

    if (left.type !== right.type) {
        return left.type.localeCompare(right.type)
    }

    if (left.symbolName !== right.symbolName) {
        return (left.symbolName ?? "").localeCompare(right.symbolName ?? "")
    }

    return left.id.localeCompare(right.id)
}

/**
 * Creates summary payload from returned API changes.
 *
 * @param baseSnapshot Base snapshot index.
 * @param targetSnapshot Target snapshot index.
 * @param changes Returned API changes.
 * @param truncatedChangeCount Omitted change count.
 * @returns Aggregated summary payload.
 */
function createSummary(
    baseSnapshot: ISnapshotIndex,
    targetSnapshot: ISnapshotIndex,
    changes: readonly IAstApiSurfaceChange[],
    truncatedChangeCount: number,
): IAstApiSurfaceChangeDetectorSummary {
    const byType = createEmptyByTypeRecord()
    let highSeverityCount = 0

    for (const change of changes) {
        byType[change.type] += 1
        if (change.severity === AST_API_SURFACE_CHANGE_SEVERITY.HIGH) {
            highSeverityCount += 1
        }
    }

    const comparedFileCount = new Set<string>([
        ...baseSnapshot.byFilePath.keys(),
        ...targetSnapshot.byFilePath.keys(),
    ]).size

    return {
        baseFileCount: baseSnapshot.fileCount,
        targetFileCount: targetSnapshot.fileCount,
        comparedFileCount,
        changeCount: changes.length,
        highSeverityCount,
        truncated: truncatedChangeCount > 0,
        truncatedChangeCount,
        byType,
    }
}

/**
 * Creates empty change counts by type.
 *
 * @returns Zero-initialized by-type record.
 */
function createEmptyByTypeRecord(): Record<AstApiSurfaceChangeType, number> {
    return {
        ADDED_PUBLIC_FILE: 0,
        ADDED_PUBLIC_SYMBOL: 0,
        REMOVED_PUBLIC_FILE: 0,
        REMOVED_PUBLIC_SYMBOL: 0,
        CHANGED_PUBLIC_SYMBOL_SHAPE: 0,
    }
}
