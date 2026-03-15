import {posix as pathPosix} from "node:path"

import {
    AST_IMPORT_KIND,
    type AstImportKind,
    type IParsedSourceFileDTO,
} from "@codenautic/core"

import {
    AstCrossFileAnalyzer,
    type IAstCrossFileAnalysisContext,
    type IAstCrossFileAnalyzerInput,
} from "./ast-cross-file-analyzer"

const FILE_EXTENSION_CANDIDATES = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".go",
    ".java",
    ".cs",
    ".rb",
    ".rs",
    ".php",
    ".kt",
] as const

const EDGE_TYPE_ORDER = [
    "IMPORT",
    "EXPORT",
] as const

const UNRESOLVED_REASON = {
    RELATIVE_IMPORT_NOT_FOUND: "RELATIVE_IMPORT_NOT_FOUND",
} as const

/**
 * Import/export dependency edge type.
 */
export const AST_IMPORT_EXPORT_EDGE_TYPE = {
    IMPORT: "IMPORT",
    EXPORT: "EXPORT",
} as const

/**
 * Import/export dependency edge type literal.
 */
export type AstImportExportEdgeType =
    (typeof AST_IMPORT_EXPORT_EDGE_TYPE)[keyof typeof AST_IMPORT_EXPORT_EDGE_TYPE]

/**
 * One resolved import/export dependency edge.
 */
export interface IAstImportExportGraphEdge {
    /**
     * Stable deterministic edge identifier.
     */
    readonly id: string

    /**
     * Edge semantic type.
     */
    readonly type: AstImportExportEdgeType

    /**
     * Source repository-relative file path.
     */
    readonly sourceFilePath: string

    /**
     * Target repository-relative file path.
     */
    readonly targetFilePath: string

    /**
     * Raw import/export source string from parsed AST.
     */
    readonly sourceImport: string

    /**
     * Import statement kind from AST parser contract.
     */
    readonly importKind: AstImportKind

    /**
     * Indicates `type`-only import/export relation.
     */
    readonly typeOnly: boolean

    /**
     * Sorted unique import/export specifiers when available.
     */
    readonly specifiers: readonly string[]
}

/**
 * One unresolved relative import/export dependency entry.
 */
export interface IAstUnresolvedImportExportReference {
    /**
     * Source repository-relative file path.
     */
    readonly sourceFilePath: string

    /**
     * Raw import/export source string from parsed AST.
     */
    readonly sourceImport: string

    /**
     * Candidate target paths considered during resolution.
     */
    readonly candidateFilePaths: readonly string[]

    /**
     * Stable unresolved reason code.
     */
    readonly reason: string
}

/**
 * Aggregated summary for one import/export graph build run.
 */
export interface IAstImportExportGraphSummary {
    /**
     * Number of analyzed source files.
     */
    readonly scannedFileCount: number

    /**
     * Number of normalized files in graph node set.
     */
    readonly nodeCount: number

    /**
     * Number of resolved internal import/export edges.
     */
    readonly edgeCount: number

    /**
     * Number of unresolved relative references.
     */
    readonly unresolvedReferenceCount: number

    /**
     * Number of external non-relative imports/exports skipped from internal graph.
     */
    readonly externalReferenceCount: number

    /**
     * Count of resolved edges grouped by type.
     */
    readonly byType: Readonly<Record<AstImportExportEdgeType, number>>
}

/**
 * Deterministic import/export dependency graph build result.
 */
export interface IAstImportExportGraphResult {
    /**
     * Sorted unique graph nodes represented by normalized file paths.
     */
    readonly nodes: readonly string[]

    /**
     * Sorted unique resolved internal dependency edges.
     */
    readonly edges: readonly IAstImportExportGraphEdge[]

    /**
     * Sorted unique unresolved relative references.
     */
    readonly unresolvedReferences: readonly IAstUnresolvedImportExportReference[]

    /**
     * Edge index by source file path.
     */
    readonly edgesBySource: ReadonlyMap<string, readonly IAstImportExportGraphEdge[]>

    /**
     * Edge index by target file path.
     */
    readonly edgesByTarget: ReadonlyMap<string, readonly IAstImportExportGraphEdge[]>

    /**
     * Aggregated summary.
     */
    readonly summary: IAstImportExportGraphSummary
}

/**
 * Runtime input for import/export graph builder.
 */
export interface IAstImportExportGraphBuilderInput
    extends IAstCrossFileAnalyzerInput {}

/**
 * Import/export graph builder contract.
 */
export interface IAstImportExportGraphBuilder {
    /**
     * Builds deterministic internal import/export dependency graph.
     *
     * @param files Parsed source files.
     * @param input Optional runtime batch filter settings.
     * @returns Deterministic graph build result.
     */
    build(
        files: readonly IParsedSourceFileDTO[],
        input?: IAstImportExportGraphBuilderInput,
    ): Promise<IAstImportExportGraphResult>
}

/**
 * Deterministic import/export dependency graph builder.
 */
export class AstImportExportGraphBuilder
    extends AstCrossFileAnalyzer<
        IAstImportExportGraphBuilderInput,
        IAstImportExportGraphResult
    >
    implements IAstImportExportGraphBuilder
{
    /**
     * Builds deterministic internal import/export dependency graph.
     *
     * @param files Parsed source files.
     * @param input Optional runtime batch filter settings.
     * @returns Deterministic graph build result.
     */
    public build(
        files: readonly IParsedSourceFileDTO[],
        input: IAstImportExportGraphBuilderInput = {},
    ): Promise<IAstImportExportGraphResult> {
        return this.analyze(files, input)
    }

    /**
     * Creates graph payload from normalized analysis context.
     *
     * @param context Prepared deterministic analysis context.
     * @returns Deterministic graph build result.
     */
    protected override analyzeWithContext(
        context: IAstCrossFileAnalysisContext,
    ): IAstImportExportGraphResult {
        const edges: IAstImportExportGraphEdge[] = []
        const unresolvedReferences: IAstUnresolvedImportExportReference[] = []
        let externalReferenceCount = 0

        for (const sourceFile of context.sourceFiles) {
            for (const statement of sourceFile.parsedFile.imports) {
                if (isRelativeImport(statement.source) === false) {
                    externalReferenceCount += 1
                    continue
                }

                const candidates = buildRelativeImportCandidates(
                    sourceFile.directoryPath,
                    statement.source,
                )
                const resolvedTarget = candidates.find((candidate) => {
                    return context.fileLookup.has(candidate)
                })

                if (resolvedTarget === undefined) {
                    unresolvedReferences.push({
                        sourceFilePath: sourceFile.filePath,
                        sourceImport: statement.source,
                        candidateFilePaths: candidates,
                        reason: UNRESOLVED_REASON.RELATIVE_IMPORT_NOT_FOUND,
                    })
                    continue
                }

                const edge: Omit<IAstImportExportGraphEdge, "id"> = {
                    type: resolveEdgeType(statement.kind),
                    sourceFilePath: sourceFile.filePath,
                    targetFilePath: resolvedTarget,
                    sourceImport: statement.source,
                    importKind: statement.kind,
                    typeOnly: statement.typeOnly,
                    specifiers: normalizeSpecifiers(statement.specifiers),
                }
                edges.push({
                    ...edge,
                    id: createEdgeId(edge),
                })
            }
        }

        const sortedEdges = deduplicateAndSortEdges(edges)
        const sortedUnresolvedReferences = deduplicateAndSortUnresolved(unresolvedReferences)
        const nodes = context.files.map((file) => file.filePath)

        return {
            nodes,
            edges: sortedEdges,
            unresolvedReferences: sortedUnresolvedReferences,
            edgesBySource: createEdgeIndex(sortedEdges, "source"),
            edgesByTarget: createEdgeIndex(sortedEdges, "target"),
            summary: createSummary(
                context.sourceFiles.length,
                nodes.length,
                sortedEdges,
                sortedUnresolvedReferences.length,
                externalReferenceCount,
            ),
        }
    }
}

/**
 * Normalizes import/export specifiers into deterministic sorted unique list.
 *
 * @param specifiers Raw specifiers from parser.
 * @returns Sorted unique non-empty specifiers.
 */
function normalizeSpecifiers(specifiers: readonly string[]): readonly string[] {
    const normalized = new Set<string>()

    for (const specifier of specifiers) {
        const trimmed = specifier.trim()
        if (trimmed.length > 0) {
            normalized.add(trimmed)
        }
    }

    return [...normalized].sort((left, right) => left.localeCompare(right))
}

/**
 * Resolves edge type from AST import kind.
 *
 * @param importKind Parsed import statement kind.
 * @returns Graph edge type.
 */
function resolveEdgeType(importKind: AstImportKind): AstImportExportEdgeType {
    if (importKind === AST_IMPORT_KIND.EXPORT_FROM) {
        return AST_IMPORT_EXPORT_EDGE_TYPE.EXPORT
    }

    return AST_IMPORT_EXPORT_EDGE_TYPE.IMPORT
}

/**
 * Builds candidate target file paths for one relative import/export source.
 *
 * @param directoryPath Source file directory.
 * @param importSource Relative import/export source.
 * @returns Candidate target file paths.
 */
function buildRelativeImportCandidates(
    directoryPath: string,
    importSource: string,
): readonly string[] {
    const normalizedSource = pathPosix.normalize(pathPosix.join(directoryPath, importSource))
    const candidates = new Set<string>()
    const extension = pathPosix.extname(normalizedSource)

    if (extension.length > 0) {
        candidates.add(normalizedSource)
    } else {
        for (const item of FILE_EXTENSION_CANDIDATES) {
            candidates.add(`${normalizedSource}${item}`)
            candidates.add(pathPosix.join(normalizedSource, `index${item}`))
        }
    }

    return [...candidates].sort((left, right) => left.localeCompare(right))
}

/**
 * Checks whether import/export source is relative.
 *
 * @param importSource Raw source from parsed AST.
 * @returns True when source is relative.
 */
function isRelativeImport(importSource: string): boolean {
    return importSource.startsWith("./") || importSource.startsWith("../")
}

/**
 * Deduplicates and sorts resolved edges deterministically.
 *
 * @param edges Mutable edges.
 * @returns Sorted unique edges.
 */
function deduplicateAndSortEdges(
    edges: readonly IAstImportExportGraphEdge[],
): readonly IAstImportExportGraphEdge[] {
    const uniqueById = new Map<string, IAstImportExportGraphEdge>()

    for (const edge of edges) {
        uniqueById.set(edge.id, edge)
    }

    return [...uniqueById.values()].sort(compareEdges)
}

/**
 * Deduplicates and sorts unresolved references deterministically.
 *
 * @param unresolvedReferences Mutable unresolved references.
 * @returns Sorted unique unresolved references.
 */
function deduplicateAndSortUnresolved(
    unresolvedReferences: readonly IAstUnresolvedImportExportReference[],
): readonly IAstUnresolvedImportExportReference[] {
    const uniqueByKey = new Map<string, IAstUnresolvedImportExportReference>()

    for (const unresolvedReference of unresolvedReferences) {
        const key = createUnresolvedKey(unresolvedReference)
        uniqueByKey.set(key, unresolvedReference)
    }

    return [...uniqueByKey.values()].sort(compareUnresolvedReferences)
}

/**
 * Creates stable edge id.
 *
 * @param edge Edge payload without id.
 * @returns Stable edge id.
 */
function createEdgeId(edge: Omit<IAstImportExportGraphEdge, "id">): string {
    return [
        edge.type,
        edge.sourceFilePath,
        edge.targetFilePath,
        edge.sourceImport,
        edge.importKind,
        edge.typeOnly ? "type" : "value",
        edge.specifiers.join(","),
    ].join("|")
}

/**
 * Creates stable key for unresolved reference entry.
 *
 * @param unresolvedReference Unresolved reference entry.
 * @returns Stable unresolved reference key.
 */
function createUnresolvedKey(
    unresolvedReference: IAstUnresolvedImportExportReference,
): string {
    return [
        unresolvedReference.sourceFilePath,
        unresolvedReference.sourceImport,
        unresolvedReference.reason,
        unresolvedReference.candidateFilePaths.join(","),
    ].join("|")
}

/**
 * Compares edges deterministically.
 *
 * @param left Left edge.
 * @param right Right edge.
 * @returns Sort result.
 */
function compareEdges(left: IAstImportExportGraphEdge, right: IAstImportExportGraphEdge): number {
    const leftTypeIndex = EDGE_TYPE_ORDER.indexOf(left.type)
    const rightTypeIndex = EDGE_TYPE_ORDER.indexOf(right.type)

    if (leftTypeIndex !== rightTypeIndex) {
        return leftTypeIndex - rightTypeIndex
    }

    const sourceCompare = left.sourceFilePath.localeCompare(right.sourceFilePath)
    if (sourceCompare !== 0) {
        return sourceCompare
    }

    const targetCompare = left.targetFilePath.localeCompare(right.targetFilePath)
    if (targetCompare !== 0) {
        return targetCompare
    }

    const sourceImportCompare = left.sourceImport.localeCompare(right.sourceImport)
    if (sourceImportCompare !== 0) {
        return sourceImportCompare
    }

    return left.importKind.localeCompare(right.importKind)
}

/**
 * Compares unresolved references deterministically.
 *
 * @param left Left unresolved reference.
 * @param right Right unresolved reference.
 * @returns Sort result.
 */
function compareUnresolvedReferences(
    left: IAstUnresolvedImportExportReference,
    right: IAstUnresolvedImportExportReference,
): number {
    const sourceCompare = left.sourceFilePath.localeCompare(right.sourceFilePath)
    if (sourceCompare !== 0) {
        return sourceCompare
    }

    const sourceImportCompare = left.sourceImport.localeCompare(right.sourceImport)
    if (sourceImportCompare !== 0) {
        return sourceImportCompare
    }

    return left.reason.localeCompare(right.reason)
}

/**
 * Builds deterministic edge index by one endpoint direction.
 *
 * @param edges Sorted edges.
 * @param direction Index direction.
 * @returns Immutable edge index.
 */
function createEdgeIndex(
    edges: readonly IAstImportExportGraphEdge[],
    direction: "source" | "target",
): ReadonlyMap<string, readonly IAstImportExportGraphEdge[]> {
    const index = new Map<string, IAstImportExportGraphEdge[]>()

    for (const edge of edges) {
        const key = direction === "source" ? edge.sourceFilePath : edge.targetFilePath
        const bucket = index.get(key)

        if (bucket === undefined) {
            index.set(key, [edge])
            continue
        }

        bucket.push(edge)
    }

    const entries = [...index.entries()].map(
        ([key, bucket]): [string, readonly IAstImportExportGraphEdge[]] => {
            return [key, [...bucket].sort(compareEdges)]
        },
    )

    return new Map<string, readonly IAstImportExportGraphEdge[]>(entries)
}

/**
 * Builds summary payload for graph build result.
 *
 * @param scannedFileCount Number of analyzed source files.
 * @param nodeCount Number of graph nodes.
 * @param edges Resolved edges.
 * @param unresolvedReferenceCount Number of unresolved references.
 * @param externalReferenceCount Number of skipped external references.
 * @returns Aggregated summary.
 */
function createSummary(
    scannedFileCount: number,
    nodeCount: number,
    edges: readonly IAstImportExportGraphEdge[],
    unresolvedReferenceCount: number,
    externalReferenceCount: number,
): IAstImportExportGraphSummary {
    const byType: Record<AstImportExportEdgeType, number> = {
        IMPORT: 0,
        EXPORT: 0,
    }

    for (const edge of edges) {
        byType[edge.type] += 1
    }

    return {
        scannedFileCount,
        nodeCount,
        edgeCount: edges.length,
        unresolvedReferenceCount,
        externalReferenceCount,
        byType,
    }
}
