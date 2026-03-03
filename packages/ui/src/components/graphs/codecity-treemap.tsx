import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { ResponsiveContainer, Treemap } from "recharts"

const DEFAULT_HEIGHT = "420px"
const DEFAULT_METRIC: ICodeCityTreemapMetric = "complexity"
const DEFAULT_EMPTY_LABEL = "No file data for CodeCity treemap yet."
const DEFAULT_METRIC_SELECTOR_ID = "codecity-metric-selector"

const CODE_CITY_METRICS = ["complexity", "coverage", "churn"] as const
const CODE_CITY_IMPACT_LEVELS = ["changed", "impacted", "ripple"] as const

/** Метрика для цветовой индикации.
 * @see WEB-CITY-002
 */
type ICodeCityTreemapMetric = (typeof CODE_CITY_METRICS)[number]
type ICodeCityTreemapImpactLevel = (typeof CODE_CITY_IMPACT_LEVELS)[number]

const CODE_CITY_METRIC_LABELS: Record<ICodeCityTreemapMetric, string> = {
    complexity: "Complexity",
    coverage: "Coverage",
    churn: "Churn",
}
const CODE_CITY_IMPACT_LABELS: Record<ICodeCityTreemapImpactLevel, string> = {
    changed: "Changed",
    impacted: "Impacted",
    ripple: "Ripple",
}
const CODE_CITY_IMPACT_PRIORITIES: Record<ICodeCityTreemapImpactLevel, number> = {
    changed: 3,
    impacted: 2,
    ripple: 1,
}
const CODE_CITY_IMPACT_COLOR: Record<ICodeCityTreemapImpactLevel, string> = {
    changed: "hsl(348, 83%, 58%)",
    impacted: "hsl(35, 96%, 59%)",
    ripple: "hsl(212, 86%, 57%)",
}

export interface ICodeCityTreemapImpactedFileDescriptor {
    /** Идентификатор файла в выборке. */
    readonly fileId: string
    /** Степень влияния CCR на файл. */
    readonly impactType: ICodeCityTreemapImpactLevel
}

interface ICodeCityTreemapImpactSummary {
    readonly changed: number
    readonly impacted: number
    readonly ripple: number
}

interface ICodeCityTreemapIssueSummary {
    readonly filesWithIssues: number
    readonly maxIssuesPerFile: number
    readonly totalIssues: number
}

interface ICodeCityTreemapMetricRange {
    readonly min: number
    readonly max: number
}

interface ICodeCityTreemapTreemapNodePayload {
    readonly children?: ReadonlyArray<unknown>
    readonly color?: string
    readonly depth?: number
    readonly height?: number
    readonly impactType?: ICodeCityTreemapImpactLevel
    readonly issueHeatmapColor?: string
    readonly name?: string
    readonly value?: number
    readonly issueCount?: number
    readonly width?: number
    readonly x?: number
    readonly y?: number
}

interface ICodeCityTreemapTreemapContentProps {
    readonly fill?: string
    readonly payload?: ICodeCityTreemapTreemapNodePayload
    readonly x?: number
    readonly y?: number
    readonly width?: number
    readonly height?: number
}

function resolveIssueCount(value?: number): number {
    if (typeof value !== "number" || Number.isFinite(value) === false || value <= 0) {
        return 0
    }

    return Math.floor(value)
}

function resolveIssueHeatmapColor(
    issueCount: number,
    maxIssueCount: number,
): string | undefined {
    if (issueCount <= 0 || maxIssueCount <= 0) {
        return undefined
    }

    const ratio = Math.max(0, Math.min(1, issueCount / maxIssueCount))
    const hue = Math.round(120 - ratio * 120)

    return `hsla(${hue}, 86%, 52%, 0.45)`
}

function buildImpactedFileIndex(
    impactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor>,
): Map<string, ICodeCityTreemapImpactLevel> {
    const impactByFileId = new Map<string, ICodeCityTreemapImpactLevel>()

    for (const entry of impactedFiles) {
        if (entry.fileId.trim().length === 0) {
            continue
        }

        const currentImpact = impactByFileId.get(entry.fileId)
        if (
            currentImpact === undefined
            || CODE_CITY_IMPACT_PRIORITIES[entry.impactType] > CODE_CITY_IMPACT_PRIORITIES[currentImpact]
        ) {
            impactByFileId.set(entry.fileId, entry.impactType)
        }
    }

    return impactByFileId
}

function resolveImpactSummary(
    packages: ReadonlyArray<ICodeCityTreemapPackageNode>,
): ICodeCityTreemapImpactSummary {
    const summary: ICodeCityTreemapImpactSummary = {
        changed: 0,
        impacted: 0,
        ripple: 0,
    }

    for (const packageItem of packages) {
        for (const file of packageItem.children) {
            if (file.impactType === "changed") {
                summary.changed += 1
            } else if (file.impactType === "impacted") {
                summary.impacted += 1
            } else if (file.impactType === "ripple") {
                summary.ripple += 1
            }
        }
    }

    return summary
}

function resolveImpactStyle(
    props: ICodeCityTreemapTreemapContentProps,
): { readonly stroke: string; readonly strokeWidth: number; readonly strokeDasharray?: string } {
    const node = props.payload
    if (node?.impactType === "changed") {
        return { stroke: CODE_CITY_IMPACT_COLOR.changed, strokeWidth: 2.5 }
    }
    if (node?.impactType === "impacted") {
        return { stroke: CODE_CITY_IMPACT_COLOR.impacted, strokeWidth: 2.2 }
    }
    if (node?.impactType === "ripple") {
        return {
            stroke: CODE_CITY_IMPACT_COLOR.ripple,
            strokeWidth: 2,
            strokeDasharray: "5 3",
        }
    }

    return {
        stroke: "hsl(var(--nextui-colors-defaultBorder))",
        strokeWidth: 1,
    }
}

function resolveMetricByValue(value: string): ICodeCityTreemapMetric {
    if (value === "coverage" || value === "churn") {
        return value
    }

    return "complexity"
}

function resolveMetricRange(values: ReadonlyArray<number>): ICodeCityTreemapMetricRange {
    if (values.length === 0) {
        return { max: 0, min: 0 }
    }

    let min = values[0] ?? 0
    let max = values[0] ?? 0

    for (const current of values) {
        if (current < min) {
            min = current
        }
        if (current > max) {
            max = current
        }
    }

    return { max, min }
}

function resolveMetricLabel(metric: ICodeCityTreemapMetric): string {
    return CODE_CITY_METRIC_LABELS[metric]
}

function resolveMetricColor(range: ICodeCityTreemapMetricRange, value: number): string {
    if (range.max <= range.min) {
        return "hsl(120, 80%, 44%)"
    }

    const ratio = Math.max(
        0,
        Math.min(1, (value - range.min) / (range.max - range.min)),
    )
    const hue = Math.round(120 - ratio * 120)

    return `hsl(${hue}, 78%, 44%)`
}

function resolveTreemapFileMetricValue(
    file: ICodeCityTreemapFileDescriptor,
    metric: ICodeCityTreemapMetric,
): number {
    const value = (() => {
        if (metric === "coverage") {
            return file.coverage
        }

        if (metric === "churn") {
            return file.churn
        }

        return file.complexity
    })()

    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return 0
    }

    return value
}

function renderTreemapCell(props: ICodeCityTreemapTreemapContentProps): ReactElement {
    const x = props.x ?? 0
    const y = props.y ?? 0
    const width = props.width ?? 0
    const height = props.height ?? 0
    const node = props.payload
    const issueHeatmapColor = node?.issueHeatmapColor
    const color = node?.color ?? (props.fill ?? "hsl(120, 80%, 44%)")
    const strokeStyle = resolveImpactStyle(props)
    const nodeName = typeof node?.name === "string" ? node.name : ""
    const canShowText = width > 42 && height > 16
    const isLeaf = (node?.children?.length ?? 0) === 0

    if (width <= 0 || height <= 0) {
        return <g />
    }

    return (
        <g>
            <rect
                fill={color}
                height={height}
                stroke={strokeStyle.stroke}
                strokeDasharray={strokeStyle.strokeDasharray}
                strokeWidth={strokeStyle.strokeWidth}
                width={width}
                x={x}
                y={y}
            />
            {issueHeatmapColor !== undefined ? (
                <rect
                    fill={issueHeatmapColor}
                    height={height}
                    width={width}
                    x={x}
                    y={y}
                />
            ) : null}
            {isLeaf && canShowText ? <text x={x + 4} y={y + 14} fill="#fff">{nodeName}</text> : null}
        </g>
    )
}

/** Файл для источника CodeCity 2D treemap. */
export interface ICodeCityTreemapFileDescriptor {
    /** Идентификатор файла. */
    readonly id: string
    /** Путь к файлу. */
    readonly path: string
    /** LOC/строки кода. */
    readonly loc?: number
    /** Комплексная метрика сложности (fallback при отсутствии LOC). */
    readonly complexity?: number
    /** Явный уровень CCR-влияния для файла. */
    readonly impactType?: ICodeCityTreemapImpactLevel
    /** Покрытие по файла в проценте (0..100). */
    readonly coverage?: number
    /** Churn/изменчивость файла в окне анализа. */
    readonly churn?: number
    /** Количество найденных найденных проблем для heatmap. */
    readonly issueCount?: number
    /** Общее количество строк (fallback при отсутствии LOC/complexity). */
    readonly size?: number
}

interface ICodeCityTreemapFileNode {
    /** Идентификатор файла. */
    readonly id: string
    /** Отображаемое имя файла. */
    readonly name: string
    /** Полный путь к файлу. */
    readonly path: string
    /** Количество найденных проблем в файле. */
    readonly issueCount: number
    /** Значение веса для treemap. */
    readonly value: number
    /** Значение выбранной метрики для цветовой шкалы. */
    readonly metricValue: number
    /** Уровень CCR-влияния для узла (если применимо). */
    readonly impactType?: ICodeCityTreemapImpactLevel
    /** Цвет heatmap-оверлея по issue density. */
    readonly issueHeatmapColor?: string
    /** Цвет по метрике для узла. */
    readonly color: string
}

interface ICodeCityTreemapPackageNode {
    /** Название пакета (группы файлов). */
    readonly name: string
    /** Общий вес пакета. */
    readonly value: number
    /** Файлы в пакете. */
    readonly children: ReadonlyArray<ICodeCityTreemapFileNode>
    /** Значение выбранной метрики для пакета. */
    readonly metricValue: number
    /** Цвет пакета. */
    readonly color: string
}

/** Агрегированные данные для визуализации treemap. */
export interface ICodeCityTreemapData {
    /** Узлы верхнего уровня (пакеты). */
    readonly packages: ReadonlyArray<ICodeCityTreemapPackageNode>
    /** Сумма LOC в дереве. */
    readonly totalLoc: number
    /** Общее число файлов в виджете. */
    readonly totalFiles: number
    /** Агрегированная метрика heatmap по issues. */
    readonly issueSummary: ICodeCityTreemapIssueSummary
    /** Метрики CCR-влияния. */
    readonly impactSummary: ICodeCityTreemapImpactSummary
    /** Выбранная метрика цвета. */
    readonly metric: ICodeCityTreemapMetric
    /** Диапазон значений выбранной метрики. */
    readonly metricRange: ICodeCityTreemapMetricRange
}

/** Пропсы компонента treemap. */
export interface ICodeCityTreemapProps {
    /** Файлы для постройки 2D treemap. */
    readonly files: ReadonlyArray<ICodeCityTreemapFileDescriptor>
    /** Выбранная метрика по умолчанию для цветовой кодировки. */
    readonly defaultMetric?: ICodeCityTreemapMetric
    /** Файлы, затронутые в рамках текущего CCR. */
    readonly impactedFiles?: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor>
    /** Высота контейнера. */
    readonly height?: string
    /** Заголовок. */
    readonly title?: string
    /** Текст пустого состояния. */
    readonly emptyStateLabel?: string
}

function normalizePath(rawPath: string): string {
    return rawPath.trim().replaceAll("\\", "/")
}

function resolvePackageName(filePath: string): string {
    const normalizedPath = normalizePath(filePath)
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex <= 0) {
        return "root"
    }

    return normalizedPath.slice(0, separatorIndex)
}

function resolveFileName(filePath: string): string {
    const normalizedPath = normalizePath(filePath)
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex === -1) {
        return normalizedPath
    }

    return normalizedPath.slice(separatorIndex + 1)
}

function resolveFileLoc(file: ICodeCityTreemapFileDescriptor): number {
    const candidate = file.loc ?? file.size ?? file.complexity
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 1) {
        return Math.floor(candidate)
    }

    return 1
}

/**
 * Формирует иерархические данные для treemap (package -> files) с метрикой размера LOC.
 *
 * @param files Пакет метрик файлов.
 * @returns Нормализованные данные и метрики.
 */
export function buildCodeCityTreemapData(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    metric: ICodeCityTreemapMetric = DEFAULT_METRIC,
    impactedFiles: ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> = [],
): ICodeCityTreemapData {
    const packageMap = new Map<string, ICodeCityTreemapFileNode[]>()
    const fileIds = new Set<string>()
    let totalFiles = 0
    let totalLoc = 0
    let totalIssues = 0
    let maxIssueCount = 0
    const metricValues: number[] = []
    const impactByFileId = buildImpactedFileIndex(impactedFiles)

    for (const file of files) {
        const normalizedPath = normalizePath(file.path)
        if (normalizedPath.length === 0 || file.id.length === 0) {
            continue
        }
        if (fileIds.has(file.id) === true) {
            continue
        }
        fileIds.add(file.id)

        const packageName = resolvePackageName(normalizedPath)
        const fileName = resolveFileName(normalizedPath)
        const fileLoc = resolveFileLoc(file)
        const metricValue = resolveTreemapFileMetricValue(file, metric)
        const impactType = file.impactType ?? impactByFileId.get(file.id)
        const issueCount = resolveIssueCount(file.issueCount)
        totalIssues += issueCount
        if (issueCount > maxIssueCount) {
            maxIssueCount = issueCount
        }
        const packageFiles = packageMap.get(packageName)
        const fileNode: ICodeCityTreemapFileNode = {
            id: file.id,
            name: fileName,
            path: normalizedPath,
            issueCount,
            color: "",
            impactType,
            metricValue,
            value: fileLoc,
        }
        metricValues.push(metricValue)

        if (packageFiles === undefined) {
            packageMap.set(packageName, [fileNode])
            continue
        }

        packageFiles.push(fileNode)
    }

    const metricRange = resolveMetricRange(metricValues)

    const packages: ICodeCityTreemapPackageNode[] = Array.from(packageMap.entries())
        .map(([name, children]): ICodeCityTreemapPackageNode => {
            const coloredChildren = [...children].map((fileNode): ICodeCityTreemapFileNode => {
                return {
                    ...fileNode,
                    color: resolveMetricColor(metricRange, fileNode.metricValue),
                    issueHeatmapColor: resolveIssueHeatmapColor(
                        fileNode.issueCount,
                        maxIssueCount,
                    ),
                }
            })
            const sortedChildren = [...coloredChildren].sort((left, right): number => {
                return right.value - left.value
            })
            const packageValue = sortedChildren.reduce(
                (total, fileNode): number => total + fileNode.value,
                0,
            )
            const packageMetricValue = sortedChildren.length === 0
                ? 0
                : sortedChildren.reduce(
                    (total, fileNode): number => total + fileNode.metricValue,
                    0,
                ) / sortedChildren.length

            const packageColor = resolveMetricColor(metricRange, packageMetricValue)

            return {
                children: sortedChildren,
                name,
                color: packageColor,
                value: packageValue,
                metricValue: packageMetricValue,
            }
        })
        .filter((entry): boolean => entry.children.length > 0)
        .sort((left, right): number => right.value - left.value)

    let filesWithIssues = 0
    for (const packageItem of packages) {
        totalFiles += packageItem.children.length
        totalLoc += packageItem.value
        filesWithIssues += packageItem.children.reduce(
            (count, fileNode): number => (fileNode.issueCount > 0 ? count + 1 : count),
            0,
        )
    }

    return {
        packages,
        totalFiles,
        issueSummary: {
            filesWithIssues,
            maxIssuesPerFile: maxIssueCount,
            totalIssues,
        },
        impactSummary: resolveImpactSummary(packages),
        totalLoc,
        metric,
        metricRange,
    }
}

/**
 * Рендерит 2D treemap на базе Recharts.
 *
 * @param props Пропсы визуализации.
 */
export function CodeCityTreemap(props: ICodeCityTreemapProps): ReactElement {
    const title = props.title ?? "CodeCity treemap"
    const emptyStateLabel = props.emptyStateLabel ?? DEFAULT_EMPTY_LABEL
    const height = props.height ?? DEFAULT_HEIGHT
    const [metric, setMetric] = useState<ICodeCityTreemapMetric>(
        props.defaultMetric ?? DEFAULT_METRIC,
    )
    const treemapData = useMemo(
        () => buildCodeCityTreemapData(props.files, metric, props.impactedFiles ?? []),
        [props.files, props.impactedFiles, metric],
    )
    const issueSummary = treemapData.issueSummary
    const issueSummaryText = `Issues: ${issueSummary.totalIssues} in ${issueSummary.filesWithIssues} files`
    const metricLabel = resolveMetricLabel(metric)
    const hasIssueHeatmap = issueSummary.maxIssuesPerFile > 0
    const selectorId = `${DEFAULT_METRIC_SELECTOR_ID}-${title.toLowerCase().replaceAll(" ", "-")}`
    const impactSummary = treemapData.impactSummary
    const impactSummaryText = `Changed: ${impactSummary.changed}, Impacted: ${impactSummary.impacted}, Ripple: ${impactSummary.ripple}`

    const summaryText = `Packages: ${treemapData.packages.length}, Files: ${treemapData.totalFiles}, LOC: ${treemapData.totalLoc}`
    const metricRangeText = `Min ${treemapData.metricRange.min} — Max ${treemapData.metricRange.max}`
    const handleMetricChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setMetric(resolveMetricByValue(event.target.value))
    }

    if (treemapData.packages.length === 0) {
        return (
            <Card aria-label={title}>
                <CardHeader>
                    <h3 className="text-lg font-semibold">{title}</h3>
                </CardHeader>
                <CardBody>
                    <p>{emptyStateLabel}</p>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card aria-label={title}>
            <CardHeader>
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-foreground-500">{summaryText}</p>
                    <p className="text-sm text-foreground-500">Color metric: {metricLabel}</p>
                    <div className="flex flex-wrap items-end gap-2">
                        <label className="text-sm" htmlFor={selectorId}>
                            Metric
                        </label>
                        <select
                            className="rounded-md border border-default-200 bg-transparent px-2 py-1 text-sm"
                            id={selectorId}
                            onChange={handleMetricChange}
                            value={metric}
                        >
                            {CODE_CITY_METRICS.map((metricName): ReactElement => (
                                <option key={metricName} value={metricName}>
                                    {resolveMetricLabel(metricName)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div
                        className="flex items-center gap-2 text-xs text-foreground-500"
                        aria-label="Metric legend"
                    >
                        <span>Low</span>
                        <div
                            className="h-2 flex-1 rounded-full"
                            style={{
                                background:
                                    "linear-gradient(90deg, hsl(120, 80%, 44%), hsl(0, 78%, 44%))",
                            }}
                        />
                        <span>High</span>
                        <span>{metricRangeText}</span>
                    </div>
                    {hasIssueHeatmap ? (
                        <div
                            aria-label="Issue heatmap legend"
                            className="flex items-center gap-2 text-xs text-foreground-500"
                        >
                            <span>Issue heatmap</span>
                            <div
                                className="h-2 flex-1 rounded-full"
                                style={{
                                    background:
                                        "linear-gradient(90deg, hsl(120, 80%, 44%), hsl(0, 78%, 44%))",
                                }}
                            />
                            <span>Max issues: {issueSummary.maxIssuesPerFile}</span>
                            <span>{issueSummaryText}</span>
                        </div>
                    ) : null}
                    {impactSummary.changed + impactSummary.impacted + impactSummary.ripple > 0 ? (
                        <div
                            aria-label="Impact legend"
                            className="flex flex-wrap items-center gap-3 text-xs text-foreground-500"
                        >
                            {CODE_CITY_IMPACT_LEVELS.map(
                                (impact): ReactElement => (
                                    <div className="flex items-center gap-1" key={impact}>
                                        <span
                                            aria-hidden={true}
                                            className="inline-block h-3 w-3 rounded-full"
                                            style={{ backgroundColor: CODE_CITY_IMPACT_COLOR[impact] }}
                                        />
                                        <span>{CODE_CITY_IMPACT_LABELS[impact]}</span>
                                    </div>
                                ),
                            )}
                            <span>{impactSummaryText}</span>
                        </div>
                    ) : null}
                </div>
            </CardHeader>
            <CardBody>
                <div aria-label="Code city treemap" style={{ height, width: "100%" }}>
                    <ResponsiveContainer height="100%" width="100%">
                        <Treemap
                            data={treemapData.packages}
                            dataKey="value"
                            nameKey="name"
                            stroke="hsl(var(--nextui-colors-defaultBorder))"
                            fill="hsl(var(--nextui-colors-success-500))"
                            content={renderTreemapCell}
                        />
                    </ResponsiveContainer>
                </div>
            </CardBody>
        </Card>
    )
}
