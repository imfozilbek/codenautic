import {
    type ChangeEvent,
    type KeyboardEvent,
    type ReactElement,
    useMemo,
    useState,
} from "react"

import { Button, Card, CardBody, CardHeader } from "@/components/ui"
import { ResponsiveContainer, Treemap } from "recharts"

const DEFAULT_HEIGHT = "420px"
const DEFAULT_METRIC: ICodeCityTreemapMetric = "complexity"
const DEFAULT_EMPTY_LABEL = "No file data for CodeCity treemap yet."
const DEFAULT_METRIC_SELECTOR_ID = "codecity-metric-selector"
const DEFAULT_COMPARISON_LABEL = "previous snapshot"
const CODE_CITY_COMPARISON_MARKER_HEIGHT = 4

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
const CODE_CITY_COMPARISON_DELTA_COLOR_GROWTH = "hsl(4, 82%, 58%)"
const CODE_CITY_COMPARISON_DELTA_COLOR_SHRINK = "hsl(142, 69%, 47%)"

export interface ICodeCityTreemapImpactedFileDescriptor {
    /** Идентификатор файла в выборке. */
    readonly fileId: string
    /** Степень влияния CCR на файл. */
    readonly impactType: ICodeCityTreemapImpactLevel
}

interface ICodeCityTreemapImpactSummary {
    changed: number
    impacted: number
    ripple: number
}

interface ICodeCityTreemapIssueSummary {
    readonly filesWithIssues: number
    readonly maxIssuesPerFile: number
    readonly totalIssues: number
}

interface ICodeCityTreemapComparisonSummary {
    readonly addedFiles: number
    readonly changedFiles: number
    readonly comparedFiles: number
    readonly comparedLoc: number
    readonly currentLoc: number
    readonly hasComparisonData: boolean
    readonly removedFiles: number
    readonly removedLoc: number
    readonly locDelta: number
}

interface ICodeCityTreemapFileTooltip {
    /** Ссылка на файл в quick link (если определена). */
    readonly fileLink?: string
    readonly complexity?: number
    readonly coverage?: number
    /** Изменение LOC относительно baseline-снимка. */
    readonly comparisonDelta?: number
    readonly fileId: string
    readonly fileName: string
    readonly issueCount: number
    readonly lastReviewAt?: string
    readonly loc: number
    readonly path: string
}

export interface ICodeCityTreemapFileLinkResolver {
    /** Идентификатор файла. */
    readonly fileId: string
    /** Отображаемое имя файла. */
    readonly fileName: string
    /** Полный путь к файлу. */
    readonly path: string
}

interface ICodeCityTreemapViewSummary {
    readonly files: number
    readonly impactSummary: ICodeCityTreemapImpactSummary
    readonly issueSummary: ICodeCityTreemapIssueSummary
    readonly loc: number
    readonly packageCount: number
}

interface ICodeCityTreemapMetricRange {
    readonly min: number
    readonly max: number
}

interface ICodeCityTreemapTreemapNodePayload {
    readonly children?: ReadonlyArray<unknown>
    readonly complexity?: number
    readonly color?: string
    readonly depth?: number
    readonly height?: number
    readonly id?: string
    readonly coverage?: number
    readonly impactType?: ICodeCityTreemapImpactLevel
    readonly issueHeatmapColor?: string
    readonly issueCount?: number
    readonly comparisonDelta?: number
    readonly lastReviewAt?: string
    readonly name?: string
    readonly path?: string
    readonly value?: number
    readonly width?: number
    readonly x?: number
    readonly y?: number
}

interface ICodeCityTreemapTreemapContentProps {
    readonly onFileHover?: (payload?: ICodeCityTreemapFileTooltip) => void
    readonly fileLink?: (file: ICodeCityTreemapFileLinkResolver) => string
    readonly fill?: string
    readonly onPackageSelect?: (packageName: string) => void
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

function formatComparisonDeltaLabel(value: number | undefined): string {
    if (typeof value !== "number" || Number.isFinite(value) === false) {
        return "—"
    }

    if (value > 0) {
        return `+${String(value)}`
    }

    if (value < 0) {
        return String(value)
    }

    return "0"
}

function resolveComparisonDeltaColor(delta: number | undefined): string | undefined {
    if (typeof delta !== "number" || Number.isNaN(delta) === true || delta === 0) {
        return undefined
    }

    return delta > 0
        ? CODE_CITY_COMPARISON_DELTA_COLOR_GROWTH
        : CODE_CITY_COMPARISON_DELTA_COLOR_SHRINK
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

function resolveLastReviewLabel(lastReviewAt: string | undefined): string {
    if (typeof lastReviewAt !== "string") {
        return "—"
    }

    const date = new Date(lastReviewAt)
    if (Number.isNaN(date.getTime()) === true) {
        return "—"
    }

    return date.toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function resolveCoverageLabel(coverage: number | undefined): string {
    if (typeof coverage !== "number" || Number.isNaN(coverage)) {
        return "—"
    }

    const normalizedCoverage = Math.max(0, Math.min(100, coverage))

    return `${Math.round(normalizedCoverage * 10) / 10}%`
}

function resolveNumberLabel(value: number | undefined): string {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return "—"
    }

    if (Number.isInteger(value) === true) {
        return String(value)
    }

    return String(Math.round(value * 10) / 10)
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

function buildComparisonFileIndex(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): Map<string, ICodeCityTreemapFileDescriptor> {
    const compareByFileId = new Map<string, ICodeCityTreemapFileDescriptor>()

    for (const file of files) {
        const fileId = file.id.trim()
        if (fileId.length === 0) {
            continue
        }

        const normalizedPath = normalizePath(file.path)
        if (normalizedPath.length === 0) {
            continue
        }

        if (compareByFileId.has(fileId) === true) {
            continue
        }

        compareByFileId.set(fileId, {
            ...file,
            id: fileId,
            path: normalizedPath,
        })
    }

    return compareByFileId
}

function resolveComparisonSummary(
    currentFiles: ReadonlyArray<ICodeCityTreemapFileNode>,
    comparisonFilesById: Map<string, ICodeCityTreemapFileDescriptor>,
): ICodeCityTreemapComparisonSummary {
    const comparisonFileIds = new Set<string>(comparisonFilesById.keys())
    const currentFileIds = new Set<string>(currentFiles.map((file): string => file.id))
    let addedFiles = 0
    let changedFiles = 0
    let currentLoc = 0
    let comparedLoc = 0
    let removedFiles = 0
    let removedLoc = 0

    for (const file of currentFiles) {
        currentLoc += file.value
        if (
            comparisonFileIds.has(file.id)
            && file.comparisonDelta !== undefined
            && file.comparisonDelta !== 0
        ) {
            changedFiles += 1
        }
        if (comparisonFileIds.has(file.id) === false) {
            addedFiles += 1
        }
    }

    for (const file of comparisonFilesById.values()) {
        const fileId = file.id.trim()
        if (fileId.length === 0) {
            continue
        }

        const fileLoc = resolveFileLoc(file)
        comparedLoc += fileLoc
        if (currentFileIds.has(fileId) === false) {
            removedFiles += 1
            removedLoc += fileLoc
        }
    }

    return {
        addedFiles,
        changedFiles,
        comparedFiles: comparisonFileIds.size,
        comparedLoc,
        currentLoc,
        hasComparisonData: comparisonFileIds.size > 0,
        removedFiles: removedFiles,
        removedLoc,
        locDelta: currentLoc - comparedLoc,
    }
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

function resolveViewSummary(
    packages: ReadonlyArray<ICodeCityTreemapPackageNode>,
): ICodeCityTreemapViewSummary {
    let files = 0
    let loc = 0
    let totalIssues = 0
    let filesWithIssues = 0
    let maxIssuesPerFile = 0
    const impactSummary = resolveImpactSummary(packages)

    for (const packageItem of packages) {
        files += packageItem.children.length
        loc += packageItem.value
        for (const file of packageItem.children) {
            if (file.issueCount > maxIssuesPerFile) {
                maxIssuesPerFile = file.issueCount
            }
            if (file.issueCount > 0) {
                filesWithIssues += 1
                totalIssues += file.issueCount
            }
        }
    }

    return {
        files,
        impactSummary,
        issueSummary: {
            filesWithIssues,
            maxIssuesPerFile,
            totalIssues,
        },
        loc,
        packageCount: packages.length,
    }
}

function resolveComparisonSummaryLabel(
    summary: ICodeCityTreemapComparisonSummary,
    comparisonLabel: string,
): string {
    const formattedDelta = formatComparisonDeltaLabel(summary.locDelta)
    return [
        `Compared with ${comparisonLabel}`,
        `LOC ${summary.currentLoc} vs ${summary.comparedLoc}`,
        `Δ${formattedDelta}`,
        `added ${summary.addedFiles}`,
        `removed ${summary.removedFiles}`,
        `changed ${summary.changedFiles}`,
    ].join(", ")
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
    const comparisonDelta =
        typeof node?.comparisonDelta === "number" ? node.comparisonDelta : undefined
    const comparisonDeltaColor = resolveComparisonDeltaColor(comparisonDelta)
    const strokeStyle = resolveImpactStyle(props)
    const nodeName = typeof node?.name === "string" ? node.name : ""
    const isPackage = (node?.children?.length ?? 0) > 0
    const canShowText = width > 42 && height > 16
    const isLeaf = (node?.children?.length ?? 0) === 0
    const fileId = typeof node?.id === "string" && node.id.length > 0 ? node.id : nodeName
    const filePath = typeof node?.path === "string" && node.path.length > 0 ? node.path : nodeName

    const handlePackageSelect = (): void => {
        if (isPackage === false || props.onPackageSelect === undefined || nodeName.length === 0) {
            return
        }

        props.onPackageSelect(nodeName)
    }
    const handleFileMouseEnter = (): void => {
        if (isPackage === true || props.onFileHover === undefined || nodeName.length === 0) {
            return
        }

        props.onFileHover({
            complexity: typeof node?.complexity === "number" ? node.complexity : undefined,
            coverage: typeof node?.coverage === "number" ? node.coverage : undefined,
            fileId,
            fileName: nodeName,
            issueCount: resolveIssueCount(node?.issueCount),
            comparisonDelta,
            fileLink:
                props.fileLink === undefined
                    ? undefined
                    : props.fileLink({
                          fileId,
                          fileName: nodeName,
                          path: filePath,
                      }),
            lastReviewAt: node?.lastReviewAt,
            loc: typeof node?.value === "number" ? node.value : 0,
            path: filePath,
        })
    }
    const handleFileMouseLeave = (): void => {
        props.onFileHover?.(undefined)
    }
    const handlePackageKeyDown = (event: KeyboardEvent<SVGGElement>): void => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handlePackageSelect()
        }
    }

    if (width <= 0 || height <= 0) {
        return <g />
    }

    return (
        <g
            aria-label={
                isPackage ? `Open package ${nodeName}` : `File ${nodeName}`
            }
            className={isPackage === true ? "cursor-pointer" : ""}
            onBlur={isPackage === false ? handleFileMouseLeave : undefined}
            onFocus={isPackage === false ? handleFileMouseEnter : undefined}
            onMouseEnter={isPackage === false ? handleFileMouseEnter : undefined}
            onMouseLeave={isPackage === false ? handleFileMouseLeave : undefined}
            onKeyDown={isPackage === true ? handlePackageKeyDown : undefined}
            onClick={isPackage === true ? handlePackageSelect : undefined}
            role="button"
            tabIndex={0}
        >
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
            {comparisonDeltaColor === undefined || isPackage === true ? null : (
                <rect
                    fill={comparisonDeltaColor}
                    height={
                        height <= CODE_CITY_COMPARISON_MARKER_HEIGHT
                            ? Math.max(1, height)
                            : CODE_CITY_COMPARISON_MARKER_HEIGHT
                    }
                    width={width}
                    x={x}
                    y={y + Math.max(0, height - CODE_CITY_COMPARISON_MARKER_HEIGHT)}
                />
            )}
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
    /** Дата последнего ревью для tooltip блока. */
    readonly lastReviewAt?: string
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
    /** Сложность файла для tooltip блока. */
    readonly complexity?: number
    /** Покрытие файла для tooltip блока. */
    readonly coverage?: number
    /** Дата последнего ревью для tooltip блока. */
    readonly lastReviewAt?: string
    /** Цвет heatmap-оверлея по issue density. */
    readonly issueHeatmapColor?: string
    /** Цвет по метрике для узла. */
    readonly color: string
    /** Разница LOC относительно базового снимка. */
    readonly comparisonDelta?: number
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
    /** Метрики сравнения по двум snapshot'ам. */
    readonly comparisonSummary: ICodeCityTreemapComparisonSummary
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
    /** Ярлык baseline-среза для сравнения. */
    readonly comparisonLabel?: string
    /** Текст пустого состояния. */
    readonly emptyStateLabel?: string
    /** Файлы baseline-среза для temporal comparison. */
    readonly compareFiles?: ReadonlyArray<ICodeCityTreemapFileDescriptor>
    /** Генератор quick link-URL к файлу по наведению. */
    readonly fileLink?: (file: ICodeCityTreemapFileLinkResolver) => string
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
    compareFiles: ReadonlyArray<ICodeCityTreemapFileDescriptor> = [],
): ICodeCityTreemapData {
    const packageMap = new Map<string, ICodeCityTreemapFileNode[]>()
    const fileIds = new Set<string>()
    let totalFiles = 0
    let totalLoc = 0
    let totalIssues = 0
    let maxIssueCount = 0
    const metricValues: number[] = []
    const impactByFileId = buildImpactedFileIndex(impactedFiles)
    const comparisonFileById = buildComparisonFileIndex(compareFiles)

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
        const compareFile = comparisonFileById.get(file.id)
        const comparisonDelta = comparisonFileById.size === 0
            ? undefined
            : compareFile === undefined
                ? fileLoc
                : fileLoc - resolveFileLoc(compareFile)
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
            complexity: file.complexity,
            coverage: file.coverage,
            lastReviewAt: file.lastReviewAt,
            impactType,
            comparisonDelta,
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
    const fileNodes = Array.from(packageMap.values()).flatMap(
        (entry): ReadonlyArray<ICodeCityTreemapFileNode> => entry,
    )
    const comparisonSummary = resolveComparisonSummary(
        fileNodes,
        comparisonFileById,
    )

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
        comparisonSummary,
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
    const comparisonLabel = props.comparisonLabel ?? DEFAULT_COMPARISON_LABEL
    const height = props.height ?? DEFAULT_HEIGHT
    const [metric, setMetric] = useState<ICodeCityTreemapMetric>(
        props.defaultMetric ?? DEFAULT_METRIC,
    )
    const [selectedPackage, setSelectedPackage] = useState<string | undefined>()
    const [hoveredFile, setHoveredFile] = useState<ICodeCityTreemapFileTooltip | undefined>()
    const treemapData = useMemo(
        () =>
            buildCodeCityTreemapData(
                props.files,
                metric,
                props.impactedFiles ?? [],
                props.compareFiles ?? [],
            ),
        [props.files, props.compareFiles, props.impactedFiles, metric],
    )
    const visiblePackages = useMemo(
        () =>
            selectedPackage === undefined
                ? treemapData.packages
                : treemapData.packages.filter((packageItem): boolean =>
                    packageItem.name === selectedPackage,
                ),
        [selectedPackage, treemapData.packages],
    )
    const summary = useMemo(
        (): ICodeCityTreemapViewSummary => resolveViewSummary(visiblePackages),
        [visiblePackages],
    )
    const issueSummary = summary.issueSummary
    const issueSummaryText = `Issues: ${issueSummary.totalIssues} in ${issueSummary.filesWithIssues} files`
    const metricLabel = resolveMetricLabel(metric)
    const hasIssueHeatmap = issueSummary.maxIssuesPerFile > 0
    const comparisonSummary = treemapData.comparisonSummary
    const hasComparison = comparisonSummary.hasComparisonData
    const comparisonSummaryText = hasComparison
        ? resolveComparisonSummaryLabel(comparisonSummary, comparisonLabel)
        : undefined
    const selectorId = `${DEFAULT_METRIC_SELECTOR_ID}-${title.toLowerCase().replaceAll(" ", "-")}`
    const impactSummary = summary.impactSummary
    const impactSummaryText = `Changed: ${impactSummary.changed}, Impacted: ${impactSummary.impacted}, Ripple: ${impactSummary.ripple}`
    const showBackButton = selectedPackage !== undefined
    const summaryText = `Packages: ${summary.packageCount}, Files: ${summary.files}, LOC: ${summary.loc}`
    const breadcrumbText = selectedPackage === undefined
        ? "All packages"
        : `All packages / ${selectedPackage}`
    const tooltipTitle = hoveredFile === undefined
        ? "Hover a file for quick metrics and quick link."
        : `File details for ${hoveredFile.fileName}`

    const handleResetSelection = (): void => {
        setSelectedPackage(undefined)
        setHoveredFile(undefined)
    }
    const handleMetricChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setMetric(resolveMetricByValue(event.target.value))
    }
    const handlePackageSelect = (packageName: string): void => {
        const canSelect = treemapData.packages.some(
            (packageItem): boolean => packageItem.name === packageName,
        )
        if (canSelect === false) {
            return
        }

        setSelectedPackage(packageName)
        setHoveredFile(undefined)
    }
    const handleFileHover = (payload?: ICodeCityTreemapFileTooltip): void => {
        setHoveredFile(payload)
    }
    const metricRangeText = `Min ${treemapData.metricRange.min} — Max ${treemapData.metricRange.max}`

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

    if (visiblePackages.length === 0) {
        return (
            <Card aria-label={title}>
                <CardHeader>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-foreground-500">No files for selected package.</p>
                    <Button onPress={handleResetSelection}>Back</Button>
                </CardHeader>
                <CardBody>
                    <p>{emptyStateLabel}</p>
                </CardBody>
            </Card>
        )
    }

    const handleTreemapNodeClick = (node: ICodeCityTreemapTreemapNodePayload): void => {
        if (node.name === undefined || node.name.length === 0) {
            return
        }
        if ((node.children?.length ?? 0) === 0) {
            return
        }

        handlePackageSelect(node.name)
    }

    return (
        <Card aria-label={title}>
            <CardHeader>
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-foreground-500">{summaryText}</p>
                    <p aria-label="Code city breadcrumb" className="text-xs text-foreground-500">
                        {breadcrumbText}
                    </p>
                    <p className="text-sm text-foreground-500">Color metric: {metricLabel}</p>
                    <div className="flex flex-wrap items-end gap-2">
                        {showBackButton ? (
                            <Button onPress={handleResetSelection} size="sm">
                                Back
                            </Button>
                        ) : null}
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
                    {hasComparison ? (
                        <div
                            aria-label="Comparison summary"
                            className="text-xs text-foreground-500"
                        >
                            {comparisonSummaryText}
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
                            data={visiblePackages as unknown as ReadonlyArray<Record<string, unknown>>}
                            dataKey="value"
                            nameKey="name"
                            stroke="hsl(var(--nextui-colors-defaultBorder))"
                            fill="hsl(var(--nextui-colors-success-500))"
                            content={(contentProps): ReactElement => {
                                return renderTreemapCell({
                                    ...contentProps,
                                    onPackageSelect: handlePackageSelect,
                                    onFileHover: handleFileHover,
                                    fileLink: props.fileLink,
                                })
                            }}
                            onClick={(node): void => {
                                handleTreemapNodeClick(
                                    node as unknown as ICodeCityTreemapTreemapNodePayload,
                                )
                            }}
                        />
                    </ResponsiveContainer>
                </div>
                <div
                    aria-label="Code city file tooltip"
                    className="mt-3 rounded-md border border-default-200 bg-default-50 p-3"
                >
                    <p className="mb-1 text-xs text-foreground-500">{tooltipTitle}</p>
                    {hoveredFile === undefined ? null : (
                        <div className="space-y-1 text-sm text-foreground-500">
                            <p>
                                <span className="font-semibold">File:</span> {hoveredFile.fileName}
                            </p>
                            <p>
                                <span className="font-semibold">Path:</span> {hoveredFile.path}
                            </p>
                            <p>
                                <span className="font-semibold">LOC:</span> {hoveredFile.loc}
                            </p>
                            <p>
                                <span className="font-semibold">Complexity:</span>{" "}
                                {resolveNumberLabel(hoveredFile.complexity)}
                            </p>
                            <p>
                                <span className="font-semibold">Coverage:</span>{" "}
                                {resolveCoverageLabel(hoveredFile.coverage)}
                            </p>
                            <p>
                                <span className="font-semibold">Last review:</span>{" "}
                                {resolveLastReviewLabel(hoveredFile.lastReviewAt)}
                            </p>
                            <p>
                                <span className="font-semibold">Issue count:</span>{" "}
                                {hoveredFile.issueCount}
                            </p>
                            {hoveredFile.comparisonDelta === undefined ? null : (
                                <p>
                                    <span className="font-semibold">LOC delta:</span>{" "}
                                    {formatComparisonDeltaLabel(hoveredFile.comparisonDelta)}
                                </p>
                            )}
                            {hoveredFile.fileLink === undefined ? null : (
                                <a
                                    href={hoveredFile.fileLink}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    Open file
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </CardBody>
        </Card>
    )
}
