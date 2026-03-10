import type {IUseCase} from "../../ports/inbound/use-case.port"
import type {IIssueAggregationProvider} from "../../ports/outbound/review/issue-aggregation-provider"
import type {IFileMetricsProvider} from "../../ports/outbound/analysis/file-metrics-provider"
import type {ICodeGraphPageRankService} from "../../ports/outbound/graph/code-graph-page-rank-service.port"
import type {IFileMetricsDTO} from "../../dto/analytics/file-metrics.dto"
import type {IHotspotMetric, ICodeCityDataDTO} from "../../dto/analytics/code-city-data.dto"
import type {IIssueHeatmapEntryDTO} from "../../dto/analytics/issue-heatmap-entry.dto"
import type {ITreemapNodeDTO, ITreemapNodeMetrics, TreemapNodeType} from "../../dto/analytics/treemap-node.dto"
import {TREEMAP_NODE_TYPE} from "../../dto/analytics/treemap-node.dto"
import type {ICodeGraph} from "../../ports/outbound/graph/code-graph.type"
import type {IGraphRepository} from "../../ports/outbound/graph/code-graph-repository.port"
import {CODE_GRAPH_NODE_TYPE} from "../../ports/outbound/graph/code-graph.type"
import {NotFoundError} from "../../../domain/errors/not-found.error"
import {ValidationError, type IValidationErrorField} from "../../../domain/errors/validation.error"
import {RepositoryId} from "../../../domain/value-objects/repository-id.value-object"
import type {DomainError} from "../../../domain/errors/domain.error"
import {Result} from "../../../shared/result"

interface INormalizedGetCodeCityDataInput {
    /**
     * Normalized repository identifier.
     */
    readonly repoId: string

    /**
     * Optional normalized branch selector.
     */
    readonly branch?: string
}

/**
 * Input payload for getCodeCityData use case.
 */
export interface IGetCodeCityDataInput {
    /**
     * Repository identifier in `<platform>:<id>` format.
     */
    readonly repoId: string

    /**
     * Optional branch reference.
     */
    readonly branch?: string
}

interface IMutableTreemapNode {
    /**
     * Node identifier.
     */
    readonly id: string

    /**
     * Node name.
     */
    readonly name: string

    /**
     * Node type.
     */
    readonly type: TreemapNodeType

    /**
     * Node metrics.
     */
    metrics: ITreemapNodeMetrics

    /**
     * Mutable child collection.
     */
    children: IMutableTreemapNode[]
}

/**
 * Input/output contract for code city analytics.
 */
export interface IGetCodeCityDataUseCaseDependencies {
    /**
     * Graph repository port.
     */
    readonly graphRepository: IGraphRepository

    /**
     * File metrics provider port.
     */
    readonly fileMetricsProvider: IFileMetricsProvider

    /**
     * Code graph PageRank hotspot ranking service.
     */
    readonly codeGraphPageRankService: ICodeGraphPageRankService

    /**
     * Issue aggregation provider port.
     */
    readonly issueAggregationProvider: IIssueAggregationProvider

    /**
     * Optional now provider for generatedAt value.
     */
    readonly now?: () => Date
}

const REPOSITORY_ROOT_NODE_ID = "repository-root"
const REPOSITORY_ROOT_NODE_NAME = "repository"

/**
 * Builds code city aggregated payload for repository UI.
 */
export class GetCodeCityDataUseCase
    implements IUseCase<IGetCodeCityDataInput, ICodeCityDataDTO, DomainError>
{
    private readonly graphRepository: IGraphRepository
    private readonly fileMetricsProvider: IFileMetricsProvider
    private readonly codeGraphPageRankService: ICodeGraphPageRankService
    private readonly issueAggregationProvider: IIssueAggregationProvider
    private readonly nowProvider: () => Date

    /**
     * Creates use case instance.
     *
     * @param dependencies Dependency ports.
     */
    public constructor(dependencies: IGetCodeCityDataUseCaseDependencies) {
        this.graphRepository = dependencies.graphRepository
        this.fileMetricsProvider = dependencies.fileMetricsProvider
        this.codeGraphPageRankService = dependencies.codeGraphPageRankService
        this.issueAggregationProvider = dependencies.issueAggregationProvider
        this.nowProvider = dependencies.now ?? (() => new Date())
    }

    /**
     * Loads graph, enriches node metrics and builds deterministic city payload.
     *
     * @param input Request payload.
     * @returns Code city DTO or domain error.
     */
    public async execute(input: IGetCodeCityDataInput): Promise<
        Result<ICodeCityDataDTO, DomainError>
    > {
        const normalizedInputResult = this.validateAndNormalizeInput(input)
        if (normalizedInputResult.isFail) {
            return Result.fail<ICodeCityDataDTO, DomainError>(normalizedInputResult.error)
        }

        const normalizedInput = normalizedInputResult.value
        let graph: ICodeGraph | null
        try {
            graph = await this.graphRepository.loadGraph(normalizedInput.repoId, normalizedInput.branch)
        } catch (error: unknown) {
            return Result.fail<ICodeCityDataDTO, DomainError>(
                this.mapDependencyFailure("loadGraph", normalizedInput.repoId, error),
            )
        }

        if (graph === null) {
            return Result.fail<ICodeCityDataDTO, DomainError>(
                new NotFoundError("CodeGraph", normalizedInput.repoId),
            )
        }

        const graphFilePaths = this.collectFilePathsFromGraph(graph)

        const fileMetricsResult = await this.loadFileMetrics(
            normalizedInput.repoId,
            graphFilePaths,
        )
        if (fileMetricsResult.isFail) {
            return Result.fail<ICodeCityDataDTO, DomainError>(fileMetricsResult.error)
        }

        const issueHeatmapResult = await this.loadIssueHeatmap(normalizedInput.repoId)
        if (issueHeatmapResult.isFail) {
            return Result.fail<ICodeCityDataDTO, DomainError>(issueHeatmapResult.error)
        }

        const fileMetrics = this.buildFileMetricsRows(
            graphFilePaths,
            fileMetricsResult.value,
            issueHeatmapResult.value,
        )

        const rootNode = this.buildTreemapRoot(fileMetrics)
        const hotspotsResult = await this.loadHotspots(
            normalizedInput.repoId,
            graph,
            fileMetrics,
        )
        if (hotspotsResult.isFail) {
            return Result.fail<ICodeCityDataDTO, DomainError>(hotspotsResult.error)
        }

        return Result.ok<ICodeCityDataDTO, DomainError>({
            repositoryId: normalizedInput.repoId,
            rootNode,
            heatmap: issueHeatmapResult.value,
            hotspots: hotspotsResult.value,
            generatedAt: this.nowProvider().toISOString(),
        })
    }

    /**
     * Normalizes input fields and validates format.
     *
     * @param input Raw input payload.
     * @returns Normalized payload or validation error.
     */
    private validateAndNormalizeInput(
        input: IGetCodeCityDataInput,
    ): Result<INormalizedGetCodeCityDataInput, ValidationError> {
        const fields = this.collectValidationErrors(input)
        if (fields.length > 0) {
            return Result.fail<INormalizedGetCodeCityDataInput, ValidationError>(
                new ValidationError("CodeCity data validation failed", fields),
            )
        }

        try {
            const repositoryId = RepositoryId.parse(input.repoId)
            const normalizedBranch = this.normalizeBranch(input.branch)

            return Result.ok<INormalizedGetCodeCityDataInput, ValidationError>({
                repoId: repositoryId.toString(),
                branch: normalizedBranch,
            })
        } catch (error: unknown) {
            if (error instanceof Error) {
                return Result.fail<INormalizedGetCodeCityDataInput, ValidationError>(
                    new ValidationError("CodeCity data validation failed", [{
                        field: "repoId",
                        message: error.message,
                    }]),
                )
            }

            return Result.fail<INormalizedGetCodeCityDataInput, ValidationError>(
                new ValidationError("CodeCity data validation failed", [{
                    field: "repoId",
                    message: "contains invalid value",
                }]),
            )
        }
    }

    /**
     * Collects input-level field errors.
     *
     * @param input Input payload.
     * @returns List of validation fields.
     */
    private collectValidationErrors(input: IGetCodeCityDataInput): IValidationErrorField[] {
        const fields: IValidationErrorField[] = []

        if (typeof input.repoId !== "string" || input.repoId.trim().length === 0) {
            fields.push({
                field: "repoId",
                message: "must be a non-empty string",
            })
        }

        const normalizedBranch = this.normalizeBranch(input.branch)
        if (input.branch !== undefined && normalizedBranch === undefined) {
            fields.push({
                field: "branch",
                message: "must be a non-empty string when provided",
            })
        }

        return fields
    }

    /**
     * Normalizes branch if provided.
     *
     * @param branch Optional branch string.
     * @returns Normalized branch or undefined.
     */
    private normalizeBranch(branch: string | undefined): string | undefined {
        if (branch === undefined) {
            return undefined
        }

        const trimmed = branch.trim()
        if (trimmed.length === 0) {
            return undefined
        }

        return trimmed
    }

    /**
     * Maps dependency failures to validation error.
     *
     * @param operation Operation name.
     * @param repositoryId Repository identifier.
     * @param error Raw error object.
     * @returns Domain-facing validation error.
     */
    private mapDependencyFailure(
        operation: string,
        repositoryId: string,
        error: unknown,
    ): ValidationError {
        if (error instanceof Error) {
            return new ValidationError("CodeCity data loading failed", [{
                field: "repositoryId",
                message: `${operation} failed for ${repositoryId}: ${error.message}`,
            }], error)
        }

        return new ValidationError("CodeCity data loading failed", [{
            field: "repositoryId",
            message: `${operation} failed for ${repositoryId}`,
        }])
    }

    /**
     * Collects and normalizes file paths from file nodes.
     *
     * @param graph Graph payload.
     * @returns Sorted set of normalized file paths.
     */
    private collectFilePathsFromGraph(graph: ICodeGraph): readonly string[] {
        const filePaths = new Set<string>()

        for (const node of graph.nodes) {
            if (node.type !== CODE_GRAPH_NODE_TYPE.FILE) {
                continue
            }

            const normalized = this.normalizeFilePath(node.filePath)
            if (normalized.length > 0) {
                filePaths.add(normalized)
            }
        }

        return [...filePaths].sort()
    }

    /**
     * Loads file metrics for graph files.
     *
     * @param repositoryId Repository identifier.
     * @param filePaths Requested file paths.
     * @returns File metrics.
     */
    private async loadFileMetrics(
        repositoryId: string,
        filePaths: readonly string[],
    ): Promise<Result<readonly IFileMetricsDTO[], ValidationError>> {
        try {
            const metrics = await this.fileMetricsProvider.getMetrics(repositoryId, filePaths)
            return Result.ok<readonly IFileMetricsDTO[], ValidationError>(metrics)
        } catch (error: unknown) {
            return Result.fail<readonly IFileMetricsDTO[], ValidationError>(
                this.mapDependencyFailure("getMetrics", repositoryId, error),
            )
        }
    }

    /**
     * Loads and normalizes issue heatmap from aggregation provider.
     *
     * @param repositoryId Repository identifier.
     * @returns Normalized heatmap entries.
     */
    private async loadIssueHeatmap(
        repositoryId: string,
    ): Promise<Result<readonly IIssueHeatmapEntryDTO[], ValidationError>> {
        try {
            const heatmap = await this.issueAggregationProvider.aggregateByFile(repositoryId)
            return Result.ok<readonly IIssueHeatmapEntryDTO[], ValidationError>(
                this.normalizeIssueHeatmap(heatmap),
            )
        } catch (error: unknown) {
            return Result.fail<readonly IIssueHeatmapEntryDTO[], ValidationError>(
                this.mapDependencyFailure("aggregateByFile", repositoryId, error),
            )
        }
    }

    /**
     * Loads deterministic hotspot ranking from graph PageRank service.
     *
     * @param repositoryId Repository identifier.
     * @param graph Graph payload.
     * @param fileMetrics Aggregated file metrics used to scope hotspots.
     * @returns Ranked hotspot metrics.
     */
    private async loadHotspots(
        repositoryId: string,
        graph: ICodeGraph,
        fileMetrics: readonly IFileMetricsDTO[],
    ): Promise<Result<readonly IHotspotMetric[], ValidationError>> {
        try {
            const hotspots = await this.codeGraphPageRankService.calculateHotspots({
                graph,
                filePaths: fileMetrics.map((metric) => metric.filePath),
            })

            return Result.ok<readonly IHotspotMetric[], ValidationError>(hotspots)
        } catch (error: unknown) {
            return Result.fail<readonly IHotspotMetric[], ValidationError>(
                this.mapDependencyFailure("calculateHotspots", repositoryId, error),
            )
        }
    }

    /**
     * Merges graph file paths, metrics and issues into unified metric row set.
     *
     * @param graphFilePaths File paths from graph.
     * @param fileMetrics Metric rows from provider.
     * @param issueHeatmap Aggregated issue rows.
     * @returns Unified file metric rows sorted by file path.
     */
    private buildFileMetricsRows(
        graphFilePaths: readonly string[],
        fileMetrics: readonly IFileMetricsDTO[],
        issueHeatmap: readonly IIssueHeatmapEntryDTO[],
    ): readonly IFileMetricsDTO[] {
        const metricByFile = this.toMetricsMap(fileMetrics)
        const issueByFile = this.toIssuesMap(issueHeatmap)
        const rows = graphFilePaths.map((filePath) => {
            return this.buildFileMetricRow(filePath, metricByFile.get(filePath), issueByFile.get(filePath))
        })

        return rows
    }

    /**
     * Builds single file metric row with optional fallback values.
     *
     * @param filePath File path.
     * @param metrics File metrics.
     * @param issueMetrics Issue aggregate metrics.
     * @returns Normalized DTO row.
     */
    private buildFileMetricRow(
        filePath: string,
        metrics: IFileMetricsDTO | undefined,
        issueMetrics: IIssueHeatmapEntryDTO | undefined,
    ): IFileMetricsDTO {
        return this.applyIssueMetricDefaults(
            this.applyFileMetricDefaults(
                this.createBaseFileMetricRow(filePath, metrics),
                metrics,
            ),
            issueMetrics,
        )
    }

    /**
     * Creates file metric row with base numeric defaults.
     *
     * @param filePath File path.
     * @param metrics Metrics source.
     * @returns Base DTO row.
     */
    private createBaseFileMetricRow(
        filePath: string,
        metrics: IFileMetricsDTO | undefined,
    ): IFileMetricsDTO {
        if (metrics !== undefined) {
            return {
                filePath,
                loc: this.normalizeMetricValue(metrics.loc),
                complexity: this.normalizeMetricValue(metrics.complexity),
                churn: this.normalizeMetricValue(metrics.churn),
                issueCount: this.normalizeMetricValue(metrics.issueCount),
            }
        }

        return {
            filePath,
            loc: 0,
            complexity: 0,
            churn: 0,
            issueCount: 0,
        }
    }

    /**
     * Applies optional non-required metrics from source.
     *
     * @param row Mutable row.
     * @param metrics Source metrics.
     */
    private applyFileMetricDefaults(
        row: IFileMetricsDTO,
        metrics: IFileMetricsDTO | undefined,
    ): IFileMetricsDTO {
        if (metrics === undefined) {
            return row
        }

        if (metrics.coverage !== undefined) {
            return {
                ...row,
                coverage: this.normalizeMetricValue(metrics.coverage),
            }
        }

        if (metrics.lastReviewDate !== undefined) {
            return {
                ...row,
                lastReviewDate: metrics.lastReviewDate,
            }
        }

        return row
    }

    /**
     * Applies issue metrics to row.
     *
     * @param row Mutable row.
     * @param issueMetrics Aggregated issue metrics.
     */
    private applyIssueMetricDefaults(
        row: IFileMetricsDTO,
        issueMetrics: IIssueHeatmapEntryDTO | undefined,
    ): IFileMetricsDTO {
        if (issueMetrics === undefined) {
            return row
        }

        return {
            ...row,
            issueCount: this.normalizeMetricValue(issueMetrics.totalIssues),
        }
    }

    /**
     * Builds normalized and merged metrics map.
     *
     * @param fileMetrics Raw file metrics.
     * @returns Normalized metrics by file path.
     */
    private toMetricsMap(fileMetrics: readonly IFileMetricsDTO[]): Map<string, IFileMetricsDTO> {
        const result = new Map<string, IFileMetricsDTO>()

        for (const item of fileMetrics) {
            const filePath = this.normalizeFilePath(item.filePath)
            if (filePath.length === 0) {
                continue
            }

            result.set(filePath, {
                filePath,
                loc: this.normalizeMetricValue(item.loc),
                complexity: this.normalizeMetricValue(item.complexity),
                churn: this.normalizeMetricValue(item.churn),
                issueCount: this.normalizeMetricValue(item.issueCount),
                ...(item.coverage !== undefined ? {coverage: this.normalizeMetricValue(item.coverage)} : {}),
                ...(item.lastReviewDate !== undefined ? {lastReviewDate: item.lastReviewDate} : {}),
            })
        }

        return result
    }

    /**
     * Builds normalized and merged issue heatmap by file.
     *
     * @param heatmap Raw heatmap.
     * @returns Sorted heatmap list.
     */
    private normalizeIssueHeatmap(
        heatmap: readonly IIssueHeatmapEntryDTO[],
    ): readonly IIssueHeatmapEntryDTO[] {
        const merged = new Map<string, IIssueHeatmapEntryDTO>()

        for (const issue of heatmap) {
            const filePath = this.normalizeFilePath(issue.filePath)
            if (filePath.length === 0) {
                continue
            }

            const totalIssues = this.normalizeMetricValue(issue.totalIssues)
            const bySeverity = this.normalizeNumericRecord(issue.bySeverity)
            const byCategory = this.normalizeNumericRecord(issue.byCategory)

            const existing = merged.get(filePath)
            if (existing === undefined) {
                merged.set(filePath, {
                    filePath,
                    totalIssues,
                    bySeverity,
                    byCategory,
                })
                continue
            }

            merged.set(filePath, {
                filePath,
                totalIssues: existing.totalIssues + totalIssues,
                bySeverity: this.mergeNumericRecords(existing.bySeverity, bySeverity),
                byCategory: this.mergeNumericRecords(existing.byCategory, byCategory),
            })
        }

        const sorted = [...merged.values()]
        sorted.sort((left, right) => {
            if (right.totalIssues === left.totalIssues) {
                return left.filePath.localeCompare(right.filePath)
            }

            return right.totalIssues - left.totalIssues
        })

        return sorted
    }

    /**
     * Builds issue map for quick lookup during metric merge.
     *
     * @param issueHeatmap Normalized issue rows.
     * @returns Map filePath → issue row.
     */
    private toIssuesMap(issueHeatmap: readonly IIssueHeatmapEntryDTO[]): Map<string, IIssueHeatmapEntryDTO> {
        const issueByFile = new Map<string, IIssueHeatmapEntryDTO>()
        for (const item of issueHeatmap) {
            issueByFile.set(item.filePath, item)
        }

        return issueByFile
    }

    /**
     * Merges issue provider response with duplicates.
     *
     * @param first First map.
     * @param second Second map.
     * @returns Merged values.
     */
    private mergeNumericRecords(
        first: Record<string, number>,
        second: Record<string, number>,
    ): Record<string, number> {
        const result = new Map<string, number>()

        for (const key of Object.keys(first)) {
            result.set(key, this.normalizeMetricValue(first[key] ?? 0))
        }

        for (const key of Object.keys(second)) {
            const previous = result.get(key) ?? 0
            result.set(key, previous + this.normalizeMetricValue(second[key] ?? 0))
        }

        return Object.fromEntries(result.entries())
    }

    /**
     * Builds deterministic root treemap node.
     *
     * @param fileMetrics Unified file metrics.
     * @returns Treemap root payload.
     */
    private buildTreemapRoot(
        fileMetrics: readonly IFileMetricsDTO[],
    ): ITreemapNodeDTO {
        const root: IMutableTreemapNode = {
            id: REPOSITORY_ROOT_NODE_ID,
            name: REPOSITORY_ROOT_NODE_NAME,
            type: TREEMAP_NODE_TYPE.DIRECTORY,
            metrics: {
                value: 0,
                extras: {},
            },
            children: [],
        }

        for (const metric of fileMetrics) {
            this.insertFileToTreemap(root, metric)
        }

        this.sortChildren(root)
        this.recalculateTreemapMetrics(root)

        return this.freezeTreemapNode(root)
    }

    /**
     * Inserts one file node into treemap hierarchy.
     *
     * @param root Root node.
     * @param metric File metric row.
     */
    private insertFileToTreemap(root: IMutableTreemapNode, metric: IFileMetricsDTO): void {
        const normalizedPath = this.normalizeFilePath(metric.filePath)
        if (normalizedPath.length === 0) {
            return
        }

        const parts = normalizedPath.split("/")
        let currentNode: IMutableTreemapNode = root
        let path = ""

        for (let index = 0; index < parts.length; index++) {
            const part = parts[index]
            if (part === undefined || part.length === 0) {
                continue
            }

            const isFile = index === parts.length - 1
            path = path.length === 0 ? part : `${path}/${part}`

            if (isFile) {
                const existing = this.findChildNode(currentNode, path, TREEMAP_NODE_TYPE.FILE)
                if (existing === undefined) {
                    currentNode.children.push(this.createFileNode(path, part, metric))
                }

                continue
            }

            const existingDirectory = this.findChildNode(
                currentNode,
                path,
                TREEMAP_NODE_TYPE.DIRECTORY,
            )

            if (existingDirectory === undefined) {
                const directoryNode = this.createDirectoryNode(path, part)
                currentNode.children.push(directoryNode)
                currentNode = directoryNode
                continue
            }

            currentNode = existingDirectory
        }
    }

    /**
     * Creates file treemap node.
     *
     * @param id Node id.
     * @param name Node name.
     * @param metric File metrics.
     * @returns Mutable treemap node.
     */
    private createFileNode(
        id: string,
        name: string,
        metric: IFileMetricsDTO,
    ): IMutableTreemapNode {
        return {
            id,
            name,
            type: TREEMAP_NODE_TYPE.FILE,
            metrics: {
                value: metric.loc,
                extras: {
                    complexity: metric.complexity,
                    churn: metric.churn,
                    issueCount: metric.issueCount,
                },
            },
            children: [],
        }
    }

    /**
     * Creates directory treemap node.
     *
     * @param id Node id.
     * @param name Node name.
     * @returns Mutable directory node.
     */
    private createDirectoryNode(id: string, name: string): IMutableTreemapNode {
        return {
            id,
            name,
            type: TREEMAP_NODE_TYPE.DIRECTORY,
            metrics: {
                value: 0,
                extras: {},
            },
            children: [],
        }
    }

    /**
     * Recalculates treemap values in bottom-up order.
     *
     * @param node Mutable node.
     * @returns Node metrics.
     */
    private recalculateTreemapMetrics(node: IMutableTreemapNode): ITreemapNodeMetrics {
        if (node.children.length === 0) {
            return node.metrics
        }

        let value = 0
        let files = 0
        let directories = 0
        let complexity = 0
        let churn = 0
        let issueCount = 0

        for (const child of node.children) {
            const childMetrics = this.recalculateTreemapMetrics(child)
            value += childMetrics.value
            if (child.type === TREEMAP_NODE_TYPE.FILE) {
                files += 1
            } else {
                directories += 1
            }

            complexity += childMetrics.extras?.complexity ?? 0
            churn += childMetrics.extras?.churn ?? 0
            issueCount += childMetrics.extras?.issueCount ?? 0
        }

        node.metrics = {
            value,
            extras: {
                files,
                directories,
                complexity,
                churn,
                issueCount,
            },
        }

        return node.metrics
    }

    /**
     * Sorts children deterministically (directories first, then files, then names).
     *
     * @param node Parent node.
     */
    private sortChildren(node: IMutableTreemapNode): void {
        node.children.sort((left, right) => {
            if (left.type !== right.type) {
                if (left.type === TREEMAP_NODE_TYPE.DIRECTORY) {
                    return -1
                }

                return 1
            }

            return left.name.localeCompare(right.name)
        })

        for (const child of node.children) {
            this.sortChildren(child)
        }
    }

    /**
     * Converts mutable tree node to readonly output shape.
     *
     * @param node Mutable node.
     * @returns DTO node.
     */
    private freezeTreemapNode(node: IMutableTreemapNode): ITreemapNodeDTO {
        return {
            id: node.id,
            name: node.name,
            type: node.type,
            metrics: node.metrics,
            children: node.children.map((child) => this.freezeTreemapNode(child)),
        }
    }

    /**
     * Finds child by type and id.
     *
     * @param node Parent node.
     * @param id Child id.
     * @param type Child type.
     * @returns Child node or undefined.
     */
    private findChildNode(
        node: IMutableTreemapNode,
        id: string,
        type: TreemapNodeType,
    ): IMutableTreemapNode | undefined {
        return node.children.find((child) => child.id === id && child.type === type)
    }

    /**
     * Normalizes metrics with safe number handling.
     *
     * @param value Raw value.
     * @returns Non-negative finite number.
     */
    private normalizeMetricValue(value: number): number {
        if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
            return 0
        }

        if (value < 0) {
            return 0
        }

        return value
    }

    /**
     * Normalizes path strings.
     *
     * @param value Raw path.
     * @returns Normalized relative path.
     */
    private normalizeFilePath(value: string): string {
        const trimmed = value.trim().replaceAll("\\", "/")
        const normalized = trimmed
            .replace(/^\/+/, "")
            .replace(/\/+$/, "")
            .replace(/\/+/g, "/")

        return normalized
    }

    /**
     * Normalizes severity/category counters.
     *
     * @param data Raw map.
     * @returns Numeric-safe map.
     */
    private normalizeNumericRecord(data: Record<string, number>): Record<string, number> {
        const normalized = new Map<string, number>()

        for (const key of Object.keys(data)) {
            normalized.set(key, this.normalizeMetricValue(data[key] ?? 0))
        }

        return Object.fromEntries(normalized.entries())
    }
}
