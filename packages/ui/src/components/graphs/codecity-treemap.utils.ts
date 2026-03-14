import type {
    ICodeCityBugHeatRange,
    ICodeCityTreemapImpactLevel,
    ICodeCityTreemapMetric,
} from "./codecity-treemap.constants"
import {
    CODE_CITY_COMPARISON_DELTA_COLOR_GROWTH,
    CODE_CITY_COMPARISON_DELTA_COLOR_SHRINK,
    CODE_CITY_IMPACT_COLOR,
    CODE_CITY_IMPACT_PRIORITIES,
    CODE_CITY_METRIC_LABEL_KEYS,
} from "./codecity-treemap.constants"

/**
 * Диапазон значений метрики (минимум/максимум).
 */
export interface ICodeCityTreemapMetricRange {
    readonly min: number
    readonly max: number
}

/**
 * Координаты точки для overlay-линий temporal coupling.
 */
export interface ICodeCityTreemapOverlayPoint {
    readonly x: number
    readonly y: number
}

/**
 * Сводка по CCR-влиянию по уровням.
 */
export interface ICodeCityTreemapImpactSummary {
    changed: number
    impacted: number
    ripple: number
}

/**
 * Сводка по количеству issue в файлах.
 */
export interface ICodeCityTreemapIssueSummary {
    readonly filesWithIssues: number
    readonly maxIssuesPerFile: number
    readonly totalIssues: number
}

/**
 * Сводка по bug introductions в файлах.
 */
export interface ICodeCityTreemapBugHeatSummary {
    readonly filesWithBugIntroductions: number
    readonly maxBugIntroductions: number
    readonly totalBugIntroductions: number
}

/**
 * Сводка по сравнению двух snapshot-ов.
 */
export interface ICodeCityTreemapComparisonSummary {
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

/**
 * Данные для tooltip при наведении на файл.
 */
export interface ICodeCityTreemapFileTooltip {
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

/**
 * Сводка текущего представления treemap.
 */
export interface ICodeCityTreemapViewSummary {
    readonly files: number
    readonly impactSummary: ICodeCityTreemapImpactSummary
    readonly issueSummary: ICodeCityTreemapIssueSummary
    readonly loc: number
    readonly packageCount: number
}

/**
 * Payload узла treemap из Recharts.
 */
export interface ICodeCityTreemapTreemapNodePayload {
    readonly children?: ReadonlyArray<unknown>
    readonly complexity?: number
    readonly color?: string
    readonly depth?: number
    readonly height?: number
    readonly id?: string
    readonly coverage?: number
    readonly impactType?: ICodeCityTreemapImpactLevel
    readonly issueHeatmapColor?: string
    readonly bugHeatColor?: string
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

/**
 * Линия temporal coupling между двумя файлами.
 */
export interface ICodeCityTreemapTemporalCouplingLine {
    readonly id: string
    readonly sourceFileId: string
    readonly targetFileId: string
    readonly sourcePoint: ICodeCityTreemapOverlayPoint
    readonly targetPoint: ICodeCityTreemapOverlayPoint
    readonly strength: number
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
    /** Частота bug introductions по диапазонам времени. */
    readonly bugIntroductions?: Partial<Record<ICodeCityBugHeatRange, number>>
    /** Общее количество строк (fallback при отсутствии LOC/complexity). */
    readonly size?: number
}

/**
 * Узел файла в иерархии treemap.
 */
export interface ICodeCityTreemapFileNode {
    /** Идентификатор файла. */
    readonly id: string
    /** Отображаемое имя файла. */
    readonly name: string
    /** Полный путь к файлу. */
    readonly path: string
    /** Количество найденных проблем в файле. */
    readonly issueCount: number
    /** Количество bug introductions в выбранном временном окне. */
    readonly bugIntroductions: number
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
    /** Цвет heatmap-оверлея по bug introductions. */
    readonly bugHeatColor?: string
    /** Цвет по метрике для узла. */
    readonly color: string
    /** Разница LOC относительно базового снимка. */
    readonly comparisonDelta?: number
}

/**
 * Узел пакета (группы файлов) в иерархии treemap.
 */
export interface ICodeCityTreemapPackageNode {
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

/**
 * Нормализует количество issue, отбрасывая невалидные значения.
 *
 * @param value - Сырое значение issue count.
 * @returns Нормализованное целое число >= 0.
 */
export function resolveIssueCount(value?: number): number {
    if (typeof value !== "number" || Number.isFinite(value) === false || value <= 0) {
        return 0
    }

    return Math.floor(value)
}

/**
 * Нормализует количество bug introductions, отбрасывая невалидные значения.
 *
 * @param value - Сырое значение bug introductions.
 * @returns Нормализованное целое число >= 0.
 */
export function resolveBugIntroductions(value: number | undefined): number {
    if (typeof value !== "number" || Number.isFinite(value) === false || value <= 0) {
        return 0
    }

    return Math.floor(value)
}

/**
 * Форматирует дельту LOC для отображения в UI.
 *
 * @param value - Числовое значение дельты.
 * @returns Строка с префиксом +/- или em-dash для невалидных значений.
 */
export function formatComparisonDeltaLabel(value: number | undefined): string {
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

/**
 * Определяет цвет маркера сравнения по знаку дельты.
 *
 * @param delta - Значение дельты LOC.
 * @returns Цвет для маркера или undefined если дельта нулевая/невалидная.
 */
export function resolveComparisonDeltaColor(delta: number | undefined): string | undefined {
    if (typeof delta !== "number" || Number.isNaN(delta) === true || delta === 0) {
        return undefined
    }

    return delta > 0
        ? CODE_CITY_COMPARISON_DELTA_COLOR_GROWTH
        : CODE_CITY_COMPARISON_DELTA_COLOR_SHRINK
}

/**
 * Вычисляет цвет heatmap-оверлея по плотности issue.
 *
 * @param issueCount - Количество issue в файле.
 * @param maxIssueCount - Максимальное количество issue среди всех файлов.
 * @returns HSL-строка цвета оверлея или undefined если нет issue.
 */
export function resolveIssueHeatmapColor(
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

/**
 * Вычисляет цвет heatmap-оверлея по частоте bug introductions.
 *
 * @param bugIntroductions - Количество bug introductions в файле.
 * @param maxBugIntroductions - Максимум среди всех файлов.
 * @returns HSL-строка цвета оверлея или undefined если нет bug introductions.
 */
export function resolveBugHeatOverlayColor(
    bugIntroductions: number,
    maxBugIntroductions: number,
): string | undefined {
    if (bugIntroductions <= 0 || maxBugIntroductions <= 0) {
        return undefined
    }

    const ratio = Math.max(0, Math.min(1, bugIntroductions / maxBugIntroductions))
    const hue = Math.round(48 - ratio * 48)

    return `hsla(${hue}, 94%, 56%, 0.48)`
}

/**
 * Форматирует дату последнего ревью для tooltip.
 *
 * @param lastReviewAt - ISO-строка даты.
 * @returns Локализованная дата или em-dash для невалидных значений.
 */
export function resolveLastReviewLabel(lastReviewAt: string | undefined): string {
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

/**
 * Форматирует значение покрытия для tooltip.
 *
 * @param coverage - Значение покрытия (0..100).
 * @returns Строка с процентом или em-dash для невалидных значений.
 */
export function resolveCoverageLabel(coverage: number | undefined): string {
    if (typeof coverage !== "number" || Number.isNaN(coverage)) {
        return "—"
    }

    const normalizedCoverage = Math.max(0, Math.min(100, coverage))

    return `${Math.round(normalizedCoverage * 10) / 10}%`
}

/**
 * Форматирует числовое значение для tooltip.
 *
 * @param value - Числовое значение.
 * @returns Строковое представление или em-dash для невалидных значений.
 */
export function resolveNumberLabel(value: number | undefined): string {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
        return "—"
    }

    if (Number.isInteger(value) === true) {
        return String(value)
    }

    return String(Math.round(value * 10) / 10)
}

/**
 * Нормализует силу temporal coupling связи.
 *
 * @param value - Сырое значение силы связи.
 * @returns Нормализованное значение >= 0.
 */
export function resolveTemporalCouplingStrength(value: number): number {
    if (Number.isFinite(value) === false || value <= 0) {
        return 0
    }

    return Math.max(0, value)
}

/**
 * Строит индекс центральных точек файлов для overlay-линий.
 *
 * @param packages - Узлы пакетов с файлами.
 * @returns Map из fileId в координаты точки.
 */
export function buildFileOverlayPoints(
    packages: ReadonlyArray<ICodeCityTreemapPackageNode>,
): Map<string, ICodeCityTreemapOverlayPoint> {
    const files = packages.flatMap(
        (packageNode): ReadonlyArray<ICodeCityTreemapFileNode> => packageNode.children,
    )
    const pointByFileId = new Map<string, ICodeCityTreemapOverlayPoint>()
    if (files.length === 0) {
        return pointByFileId
    }

    const columns = Math.min(4, files.length)
    const rows = Math.max(1, Math.ceil(files.length / columns))

    for (const [index, file] of files.entries()) {
        const column = index % columns
        const row = Math.floor(index / columns)
        const x = ((column + 0.5) / columns) * 100
        const y = ((row + 0.5) / rows) * 100
        pointByFileId.set(file.id, { x, y })
    }

    return pointByFileId
}

/**
 * Строит нормализованные линии temporal coupling между файлами.
 *
 * @param couplings - Исходные связи temporal coupling.
 * @param pointByFileId - Индекс координат файлов.
 * @returns Массив нормализованных линий с силой 0..1.
 */
export function buildTemporalCouplingLines(
    couplings: ReadonlyArray<{
        readonly sourceFileId: string
        readonly targetFileId: string
        readonly strength: number
    }>,
    pointByFileId: Map<string, ICodeCityTreemapOverlayPoint>,
): ReadonlyArray<ICodeCityTreemapTemporalCouplingLine> {
    if (couplings.length === 0 || pointByFileId.size === 0) {
        return []
    }

    const lines: ICodeCityTreemapTemporalCouplingLine[] = []
    const processedEdges = new Set<string>()
    let maxStrength = 0

    for (const coupling of couplings) {
        const sourceId = coupling.sourceFileId.trim()
        const targetId = coupling.targetFileId.trim()
        if (sourceId.length === 0 || targetId.length === 0 || sourceId === targetId) {
            continue
        }

        const edgeKey = `${sourceId}::${targetId}`
        if (processedEdges.has(edgeKey) === true) {
            continue
        }

        const sourcePoint = pointByFileId.get(sourceId)
        const targetPoint = pointByFileId.get(targetId)
        if (sourcePoint === undefined || targetPoint === undefined) {
            continue
        }

        const strength = resolveTemporalCouplingStrength(coupling.strength)
        if (strength <= 0) {
            continue
        }

        if (strength > maxStrength) {
            maxStrength = strength
        }

        processedEdges.add(edgeKey)
        lines.push({
            id: edgeKey,
            sourceFileId: sourceId,
            targetFileId: targetId,
            sourcePoint,
            targetPoint,
            strength,
        })
    }

    if (maxStrength <= 0) {
        return []
    }

    return lines.map(
        (line): ICodeCityTreemapTemporalCouplingLine => ({
            ...line,
            strength: line.strength / maxStrength,
        }),
    )
}

/**
 * Строит индекс уровней влияния CCR по fileId с разрешением конфликтов по приоритету.
 *
 * @param impactedFiles - Массив дескрипторов затронутых файлов.
 * @returns Map из fileId в уровень влияния.
 */
export function buildImpactedFileIndex(
    impactedFiles: ReadonlyArray<{
        readonly fileId: string
        readonly impactType: ICodeCityTreemapImpactLevel
    }>,
): Map<string, ICodeCityTreemapImpactLevel> {
    const impactByFileId = new Map<string, ICodeCityTreemapImpactLevel>()

    for (const entry of impactedFiles) {
        if (entry.fileId.trim().length === 0) {
            continue
        }

        const currentImpact = impactByFileId.get(entry.fileId)
        if (
            currentImpact === undefined ||
            CODE_CITY_IMPACT_PRIORITIES[entry.impactType] >
                CODE_CITY_IMPACT_PRIORITIES[currentImpact]
        ) {
            impactByFileId.set(entry.fileId, entry.impactType)
        }
    }

    return impactByFileId
}

/**
 * Строит индекс файлов baseline-среза для сравнения.
 *
 * @param files - Файлы baseline-среза.
 * @returns Map из fileId в дескриптор файла.
 */
export function buildComparisonFileIndex(
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

/**
 * Вычисляет сводку сравнения текущего среза с baseline.
 *
 * @param currentFiles - Текущие файлы.
 * @param comparisonFilesById - Индекс файлов baseline-среза.
 * @returns Сводка по добавленным, удалённым и изменённым файлам.
 */
export function resolveComparisonSummary(
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
            comparisonFileIds.has(file.id) &&
            file.comparisonDelta !== undefined &&
            file.comparisonDelta !== 0
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

/**
 * Вычисляет сводку CCR-влияния по пакетам.
 *
 * @param packages - Узлы пакетов.
 * @returns Сводка по уровням влияния.
 */
export function resolveImpactSummary(
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

/**
 * Определяет стиль обводки узла по уровню CCR-влияния.
 *
 * @param impactType - Уровень влияния узла.
 * @returns Объект стиля обводки (stroke, strokeWidth, strokeDasharray).
 */
export function resolveImpactStyle(impactType: ICodeCityTreemapImpactLevel | undefined): {
    readonly stroke: string
    readonly strokeWidth: number
    readonly strokeDasharray?: string
} {
    if (impactType === "changed") {
        return { stroke: CODE_CITY_IMPACT_COLOR.changed, strokeWidth: 2.5 }
    }
    if (impactType === "impacted") {
        return { stroke: CODE_CITY_IMPACT_COLOR.impacted, strokeWidth: 2.2 }
    }
    if (impactType === "ripple") {
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

/**
 * Определяет стиль обводки узла по уровню prediction risk.
 *
 * @param riskLevel - Уровень предсказанного риска.
 * @returns Объект стиля обводки или undefined если нет prediction.
 */
export function resolvePredictionStyle(
    riskLevel: TCodeCityTreemapPredictionRiskLevel | undefined,
):
    | { readonly stroke: string; readonly strokeWidth: number; readonly strokeDasharray?: string }
    | undefined {
    if (riskLevel === "high") {
        return {
            stroke: "hsl(348, 83%, 58%)",
            strokeWidth: 2.8,
            strokeDasharray: "6 3",
        }
    }
    if (riskLevel === "medium") {
        return {
            stroke: "hsl(35, 96%, 59%)",
            strokeWidth: 2.4,
        }
    }
    if (riskLevel === "low") {
        return {
            stroke: "hsl(212, 86%, 57%)",
            strokeWidth: 2,
        }
    }
    return undefined
}

/**
 * Определяет итоговый стиль обводки узла с приоритетом prediction over impact.
 *
 * @param impactType - Уровень CCR-влияния узла.
 * @param predictionRiskLevel - Уровень предсказанного риска.
 * @returns Объект стиля обводки.
 */
export function resolveOutlineStyle(
    impactType: ICodeCityTreemapImpactLevel | undefined,
    predictionRiskLevel: TCodeCityTreemapPredictionRiskLevel | undefined,
): { readonly stroke: string; readonly strokeWidth: number; readonly strokeDasharray?: string } {
    const predictionStyle = resolvePredictionStyle(predictionRiskLevel)
    if (predictionStyle !== undefined) {
        return predictionStyle
    }
    return resolveImpactStyle(impactType)
}

/**
 * Парсит строковое значение метрики, возвращая валидный тип.
 *
 * @param value - Строковое значение из DOM.
 * @returns Валидная метрика (fallback: complexity).
 */
export function resolveMetricByValue(value: string): ICodeCityTreemapMetric {
    if (value === "coverage" || value === "churn") {
        return value
    }

    return "complexity"
}

/**
 * Парсит строковое значение bug heat range, возвращая валидный тип.
 *
 * @param value - Строковое значение из DOM.
 * @returns Валидный диапазон (fallback: 30d).
 */
export function resolveBugHeatRange(value: string): ICodeCityBugHeatRange {
    if (value === "7d" || value === "90d") {
        return value
    }

    return "30d"
}

/**
 * Вычисляет диапазон значений метрики (min/max).
 *
 * @param values - Массив числовых значений.
 * @returns Объект с min и max.
 */
export function resolveMetricRange(values: ReadonlyArray<number>): ICodeCityTreemapMetricRange {
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

/**
 * Вычисляет сводку текущего представления (visible packages).
 *
 * @param packages - Видимые пакеты.
 * @returns Сводка по файлам, LOC, issues и impact.
 */
export function resolveViewSummary(
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

/**
 * Возвращает ключ локализации для метрики.
 *
 * @param metric - Тип метрики.
 * @returns Ключ локализации.
 */
export function resolveMetricLabelKey(metric: ICodeCityTreemapMetric): string {
    return CODE_CITY_METRIC_LABEL_KEYS[metric]
}

/**
 * Вычисляет цвет по значению метрики в заданном диапазоне.
 *
 * @param range - Диапазон значений метрики.
 * @param value - Значение метрики.
 * @returns HSL-строка цвета.
 */
export function resolveMetricColor(range: ICodeCityTreemapMetricRange, value: number): string {
    if (range.max <= range.min) {
        return "hsl(120, 80%, 44%)"
    }

    const ratio = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)))
    const hue = Math.round(120 - ratio * 120)

    return `hsl(${hue}, 78%, 44%)`
}

/**
 * Извлекает значение метрики из дескриптора файла.
 *
 * @param file - Дескриптор файла.
 * @param metric - Тип метрики.
 * @returns Числовое значение метрики (0 для невалидных).
 */
export function resolveTreemapFileMetricValue(
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

/**
 * Нормализует путь к файлу (trim + замена backslash на slash).
 *
 * @param rawPath - Исходный путь.
 * @returns Нормализованный путь.
 */
export function normalizePath(rawPath: string): string {
    return rawPath.trim().replaceAll("\\", "/")
}

/**
 * Извлекает название пакета (директории) из пути файла.
 *
 * @param filePath - Путь к файлу.
 * @returns Название пакета или "root" если нет директории.
 */
export function resolvePackageName(filePath: string): string {
    const normalizedPath = normalizePath(filePath)
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex <= 0) {
        return "root"
    }

    return normalizedPath.slice(0, separatorIndex)
}

/**
 * Извлекает имя файла из пути.
 *
 * @param filePath - Путь к файлу.
 * @returns Имя файла (последний сегмент пути).
 */
export function resolveFileName(filePath: string): string {
    const normalizedPath = normalizePath(filePath)
    const separatorIndex = normalizedPath.lastIndexOf("/")
    if (separatorIndex === -1) {
        return normalizedPath
    }

    return normalizedPath.slice(separatorIndex + 1)
}

/**
 * Определяет LOC для файла с fallback-цепочкой: loc -> size -> complexity -> 1.
 *
 * @param file - Дескриптор файла.
 * @returns Значение LOC >= 1.
 */
export function resolveFileLoc(file: ICodeCityTreemapFileDescriptor): number {
    const candidate = file.loc ?? file.size ?? file.complexity
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 1) {
        return Math.floor(candidate)
    }

    return 1
}

/**
 * Уровень предсказанного риска для prediction overlay.
 */
export type TCodeCityTreemapPredictionRiskLevel = "low" | "medium" | "high"

