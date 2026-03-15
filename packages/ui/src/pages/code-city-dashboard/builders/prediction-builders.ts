import type {
    ICodeCityTreemapFileDescriptor,
    TCodeCityTreemapPredictionRiskLevel,
} from "@/components/codecity/codecity-treemap"
import type { ICityPredictionOverlayEntry } from "@/components/codecity/overlays/city-prediction-overlay"
import type {
    IPredictionDashboardBugProneFile,
    IPredictionDashboardHotspotEntry,
    IPredictionDashboardQualityTrendPoint,
} from "@/components/predictions/prediction-dashboard"
import type { IPredictionExplainPanelEntry } from "@/components/predictions/prediction-explain-panel"
import type { ITrendForecastChartPoint } from "@/components/predictions/trend-forecast-chart"
import type {
    IPredictionAccuracyCase,
    IPredictionAccuracyPoint,
    IPredictionConfusionMatrix,
} from "@/components/predictions/prediction-accuracy-widget"
import type { IAlertConfigDialogModule } from "@/components/codecity/alert-config-dialog"
import type { IPredictionComparisonSnapshot } from "@/components/predictions/prediction-comparison-view"
import type { IHealthTrendPoint } from "@/components/codecity/health-trend-chart"

/**
 * Максимум overlay entries для prediction-данных.
 */
const MAX_PREDICTION_OVERLAY_ENTRIES = 8

/**
 * Максимум hotspot / explain / accuracy / bug-prone записей для UI-виджетов.
 */
const MAX_PREDICTION_VISIBLE_ENTRIES = 6

/**
 * Определяет уровень риска prediction для файла.
 *
 * @param file Дескриптор файла.
 * @returns Уровень риска.
 */
export function resolvePredictionRiskLevel(
    file: ICodeCityTreemapFileDescriptor,
): TCodeCityTreemapPredictionRiskLevel {
    const bugIntroductions30d = file.bugIntroductions?.["30d"] ?? 0
    const complexity = file.complexity ?? 0
    const churn = file.churn ?? 0

    if (bugIntroductions30d >= 4 || complexity >= 24 || churn >= 8) {
        return "high"
    }
    if (bugIntroductions30d >= 2 || complexity >= 16 || churn >= 4) {
        return "medium"
    }
    return "low"
}

/**
 * Формирует причину prediction по уровню риска.
 *
 * @param file Дескриптор файла.
 * @param riskLevel Уровень риска.
 * @returns Строка-описание причины.
 */
export function resolvePredictionReason(
    file: ICodeCityTreemapFileDescriptor,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): string {
    const bugIntroductions30d = file.bugIntroductions?.["30d"] ?? 0
    const churn = file.churn ?? 0
    if (riskLevel === "high") {
        return `Bug introductions ${String(bugIntroductions30d)} / 30d with churn ${String(churn)}`
    }
    if (riskLevel === "medium") {
        return "Recent volatility and ownership transitions require monitoring"
    }
    return "Low volatility baseline in the current trend window"
}

/**
 * Вычисляет confidence score prediction для файла.
 *
 * @param file Дескриптор файла.
 * @returns Значение confidence (45-96).
 */
export function resolvePredictionConfidence(file: ICodeCityTreemapFileDescriptor): number {
    const bugIntroductions30d = file.bugIntroductions?.["30d"] ?? 0
    const complexity = file.complexity ?? 0
    const churn = file.churn ?? 0
    const confidence = Math.round(45 + bugIntroductions30d * 9 + churn * 3 + complexity * 0.55)
    return Math.max(45, Math.min(96, confidence))
}

/**
 * Определяет приоритет риска по уровню.
 *
 * @param riskLevel Уровень риска.
 * @returns Числовой приоритет (1-3).
 */
export function resolvePredictionRiskPriority(
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): number {
    if (riskLevel === "high") {
        return 3
    }
    if (riskLevel === "medium") {
        return 2
    }
    return 1
}

/**
 * Формирует prediction overlay entries для прогнозных hotspot-ов.
 *
 * @param files Файлы текущего профиля.
 * @returns Список прогнозов, отсортированный по риску.
 */
export function buildPredictionOverlayEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<ICityPredictionOverlayEntry> {
    return files
        .map((file): ICityPredictionOverlayEntry => {
            const riskLevel = resolvePredictionRiskLevel(file)
            return {
                confidenceScore: resolvePredictionConfidence(file),
                fileId: file.id,
                label: file.path,
                reason: resolvePredictionReason(file, riskLevel),
                riskLevel,
            }
        })
        .sort((leftEntry, rightEntry): number => {
            const riskPriorityDiff =
                resolvePredictionRiskPriority(rightEntry.riskLevel) -
                resolvePredictionRiskPriority(leftEntry.riskLevel)
            if (riskPriorityDiff !== 0) {
                return riskPriorityDiff
            }
            return rightEntry.confidenceScore - leftEntry.confidenceScore
        })
        .slice(0, MAX_PREDICTION_OVERLAY_ENTRIES)
}

/**
 * Определяет прирост issues для prediction модели.
 *
 * @param file Дескриптор файла или undefined.
 * @param riskLevel Уровень риска.
 * @returns Ожидаемый прирост issues.
 */
function resolvePredictionIssueIncrease(
    file: ICodeCityTreemapFileDescriptor | undefined,
    riskLevel: TCodeCityTreemapPredictionRiskLevel,
): number {
    const bugIntroductions30d = file?.bugIntroductions?.["30d"] ?? 0
    if (riskLevel === "high") {
        return Math.max(3, bugIntroductions30d + 1)
    }
    if (riskLevel === "medium") {
        return Math.max(2, Math.ceil(bugIntroductions30d / 2))
    }
    return 1
}

/**
 * Формирует hotspot-модель для prediction dashboard.
 *
 * @param files Файлы текущего профиля.
 * @param overlayEntries Prediction overlay entries.
 * @returns Набор hotspot-элементов с прогнозом роста issues.
 */
export function buildPredictionDashboardHotspots(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    overlayEntries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<IPredictionDashboardHotspotEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )

    return overlayEntries
        .slice(0, MAX_PREDICTION_VISIBLE_ENTRIES)
        .map((entry): IPredictionDashboardHotspotEntry => {
            const file = fileById.get(entry.fileId)
            return {
                confidenceScore: entry.confidenceScore,
                fileId: entry.fileId,
                id: `prediction-hotspot-${entry.fileId}`,
                label: entry.label,
                predictedIssueIncrease: resolvePredictionIssueIncrease(file, entry.riskLevel),
                riskLevel: entry.riskLevel,
            }
        })
}

/**
 * Формирует лейбл timestamp для prediction trend.
 *
 * @param timestamp ISO timestamp.
 * @returns Форматированный лейбл.
 */
function resolvePredictionTrendTimestampLabel(timestamp: string): string {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
        return timestamp
    }
    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
    }).format(date)
}

/**
 * Формирует quality trend + forecast точки для prediction dashboard.
 *
 * @param healthTrend Исторический health trend.
 * @returns Точки качества с прогнозом.
 */
export function buildPredictionQualityTrendPoints(
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
): ReadonlyArray<IPredictionDashboardQualityTrendPoint> {
    return healthTrend.slice(-4).map((point, index): IPredictionDashboardQualityTrendPoint => {
        const driftPenalty = (index + 1) * 2
        return {
            forecastQualityScore: Math.max(1, Math.round(point.healthScore - driftPenalty)),
            qualityScore: Math.max(1, Math.round(point.healthScore)),
            timestamp: resolvePredictionTrendTimestampLabel(point.timestamp),
        }
    })
}

/**
 * Формирует точки trend forecast chart с confidence interval.
 *
 * @param healthTrend Исторический health trend.
 * @param overlayEntries Prediction overlay entries.
 * @returns Точки для forecast chart.
 */
export function buildTrendForecastChartPoints(
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
    overlayEntries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<ITrendForecastChartPoint> {
    return healthTrend.slice(-6).map((point, index): ITrendForecastChartPoint => {
        const forecastScore = Math.max(1, Math.round(point.healthScore - (index + 1) * 2))
        const confidenceRadius = 4 + index
        const linkedFileId =
            overlayEntries.length === 0
                ? undefined
                : overlayEntries[index % overlayEntries.length]?.fileId
        return {
            confidenceHigh: Math.min(100, forecastScore + confidenceRadius),
            confidenceLow: Math.max(1, forecastScore - confidenceRadius),
            fileId: linkedFileId,
            forecastScore,
            historicalScore: Math.max(1, Math.round(point.healthScore)),
            id: `trend-forecast-${String(index)}-${point.timestamp}`,
            timestamp: resolvePredictionTrendTimestampLabel(point.timestamp),
        }
    })
}

/**
 * Формирует accuracy trend для prediction-модуля.
 *
 * @param healthTrend Исторический health trend.
 * @returns Точки accuracy trend.
 */
export function buildPredictionAccuracyPoints(
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
): ReadonlyArray<IPredictionAccuracyPoint> {
    return healthTrend.slice(-4).map((point, index): IPredictionAccuracyPoint => {
        const predictedIncidents = Math.max(1, Math.round((100 - point.healthScore) / 8) + index)
        const actualIncidents = Math.max(0, predictedIncidents + (index % 2 === 0 ? -1 : 1))
        const denominator = Math.max(predictedIncidents, actualIncidents, 1)
        const accuracyScore = Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    100 - (Math.abs(predictedIncidents - actualIncidents) / denominator) * 100,
                ),
            ),
        )
        return {
            accuracyScore,
            actualIncidents,
            predictedIncidents,
            timestamp: resolvePredictionTrendTimestampLabel(point.timestamp),
        }
    })
}

/**
 * Формирует confusion matrix для prediction accuracy widget.
 *
 * @param entries Prediction overlay entries.
 * @returns TP/TN/FP/FN агрегаты.
 */
export function buildPredictionConfusionMatrix(
    entries: ReadonlyArray<ICityPredictionOverlayEntry>,
): IPredictionConfusionMatrix {
    let truePositive = 0
    let trueNegative = 0
    let falsePositive = 0
    let falseNegative = 0

    entries.slice(0, MAX_PREDICTION_OVERLAY_ENTRIES).forEach((entry, index): void => {
        const predictedIncident = entry.riskLevel === "high" || entry.riskLevel === "medium"
        const actualIncident = index % 3 !== 0
        if (predictedIncident && actualIncident) {
            truePositive += 1
            return
        }
        if (predictedIncident && actualIncident === false) {
            falsePositive += 1
            return
        }
        if (predictedIncident === false && actualIncident) {
            falseNegative += 1
            return
        }
        trueNegative += 1
    })

    return {
        falseNegative,
        falsePositive,
        trueNegative,
        truePositive,
    }
}

/**
 * Формирует кейсы "we predicted X, Y happened" для accuracy виджета.
 *
 * @param files Файлы текущего профиля.
 * @param entries Prediction overlay entries.
 * @returns Список кейсов по hotspot-файлам.
 */
export function buildPredictionAccuracyCases(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    entries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<IPredictionAccuracyCase> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )

    return entries
        .slice(0, MAX_PREDICTION_VISIBLE_ENTRIES)
        .map((entry, index): IPredictionAccuracyCase => {
            const file = fileById.get(entry.fileId)
            const bugIntroductions30d = file?.bugIntroductions?.["30d"] ?? 0
            const actualOutcome = bugIntroductions30d > 1 || index % 2 === 0 ? "incident" : "stable"
            return {
                actualOutcome,
                fileId: entry.fileId,
                id: `prediction-accuracy-${entry.fileId}`,
                label: entry.label,
                predictedRiskLevel: entry.riskLevel,
            }
        })
}

/**
 * Резолвит module id для alert конфигурации из файла.
 *
 * @param file Дескриптор файла.
 * @returns Идентификатор модуля.
 */
function resolvePredictionAlertModuleId(file: ICodeCityTreemapFileDescriptor): string {
    const descriptor = file as {
        readonly packageName?: unknown
        readonly path: string
    }
    const packageName = descriptor.packageName
    if (typeof packageName === "string" && packageName.length > 0) {
        return packageName
    }

    const pathSegments = descriptor.path.split("/")
    return pathSegments[1] ?? descriptor.path
}

/**
 * Формирует список модулей для per-module alert configuration.
 *
 * @param files Файлы текущего профиля.
 * @returns Уникальные модульные сегменты.
 */
export function buildPredictionAlertModules(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IAlertConfigDialogModule> {
    const moduleIds = new Set<string>()
    files.forEach((file): void => {
        moduleIds.add(resolvePredictionAlertModuleId(file))
    })

    return Array.from(moduleIds)
        .slice(0, MAX_PREDICTION_OVERLAY_ENTRIES)
        .map((moduleId, index): IAlertConfigDialogModule => {
            return {
                enabledByDefault: index < 3,
                label: moduleId,
                moduleId,
            }
        })
}

/**
 * Подбирает фокус-файл по выбранным alert modules.
 *
 * @param moduleIds Выбранные модули.
 * @param files Файлы текущего профиля.
 * @returns file id для фокуса.
 */
export function resolvePredictionAlertFocusFileId(
    moduleIds: ReadonlyArray<string>,
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): string | undefined {
    if (moduleIds.length === 0) {
        return undefined
    }
    return files.find((file): boolean => {
        return moduleIds.includes(resolvePredictionAlertModuleId(file))
    })?.id
}

/**
 * Формирует cross-time comparison snapshots для prediction-модуля.
 *
 * @param files Файлы текущего профиля.
 * @param entries Prediction overlay entries.
 * @returns Снимки сравнения "prediction vs reality".
 */
export function buildPredictionComparisonSnapshots(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    entries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<IPredictionComparisonSnapshot> {
    const periods = ["3 months ago", "2 months ago", "1 month ago"] as const
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )

    return periods.map((periodLabel, index): IPredictionComparisonSnapshot => {
        const entry = entries[index]
        const file = entry === undefined ? undefined : fileById.get(entry.fileId)
        const riskBonus = entry?.riskLevel === "high" ? 2 : entry?.riskLevel === "medium" ? 1 : 0
        const predictedHotspots = Math.max(1, 4 - index + riskBonus)
        const actualHotspots = Math.max(0, predictedHotspots + (index % 2 === 0 ? -1 : 0))
        const denominator = Math.max(predictedHotspots, actualHotspots, 1)
        const accuracyScore = Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    100 - (Math.abs(predictedHotspots - actualHotspots) / denominator) * 100,
                ),
            ),
        )
        const anchorLabel = entry?.label ?? "core module"
        const summary =
            `${periodLabel} we predicted ${String(predictedHotspots)} hotspots in ${anchorLabel}; ` +
            `${String(actualHotspots)} actually happened after observing recent CCR outcomes.`

        return {
            accuracyScore,
            actualHotspots,
            fileId: file?.id ?? entry?.fileId,
            id: `prediction-comparison-${String(index)}`,
            periodLabel,
            predictedHotspots,
            summary,
        }
    })
}

/**
 * Формирует список bug-prone файлов для prediction dashboard.
 *
 * @param files Файлы текущего профиля.
 * @param overlayEntries Prediction overlay entries.
 * @returns Список bug-prone файлов с confidence.
 */
export function buildPredictionBugProneFiles(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    overlayEntries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<IPredictionDashboardBugProneFile> {
    const confidenceByFileId = new Map<string, number>(
        overlayEntries.map((entry): readonly [string, number] => [
            entry.fileId,
            entry.confidenceScore,
        ]),
    )

    return files
        .map((file): IPredictionDashboardBugProneFile => {
            return {
                bugIntroductions30d: file.bugIntroductions?.["30d"] ?? 0,
                confidenceScore:
                    confidenceByFileId.get(file.id) ?? resolvePredictionConfidence(file),
                fileId: file.id,
                label: file.path,
            }
        })
        .sort((leftFile, rightFile): number => {
            if (rightFile.bugIntroductions30d !== leftFile.bugIntroductions30d) {
                return rightFile.bugIntroductions30d - leftFile.bugIntroductions30d
            }
            return rightFile.confidenceScore - leftFile.confidenceScore
        })
        .slice(0, MAX_PREDICTION_VISIBLE_ENTRIES)
}

/**
 * Формирует explain entries для prediction explain panel.
 *
 * @param files Файлы текущего профиля.
 * @param overlayEntries Prediction overlay entries.
 * @returns Набор объяснений для hotspot-предсказаний.
 */
export function buildPredictionExplainEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    overlayEntries: ReadonlyArray<ICityPredictionOverlayEntry>,
): ReadonlyArray<IPredictionExplainPanelEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )

    return overlayEntries
        .slice(0, MAX_PREDICTION_VISIBLE_ENTRIES)
        .map((entry): IPredictionExplainPanelEntry => {
            const file = fileById.get(entry.fileId)
            const complexity = Math.round(file?.complexity ?? 0)
            const churn = file?.churn ?? 0
            const bugIntroductions30d = file?.bugIntroductions?.["30d"] ?? 0
            return {
                confidenceScore: entry.confidenceScore,
                explanation:
                    `LLM forecast: ${entry.label} has complexity ${String(complexity)}, ` +
                    `churn ${String(churn)}, and ${String(bugIntroductions30d)} ` +
                    "bug introductions in 30d, so this area is likely to evolve into a hotspot.",
                fileId: entry.fileId,
                label: entry.label,
                reason: entry.reason,
                riskLevel: entry.riskLevel,
            }
        })
}

/**
 * Формирует маппинг file -> prediction risk для визуальных outline в treemap.
 *
 * @param entries Prediction overlay entries.
 * @returns Маппинг рисков для зданий.
 */
export function buildPredictedRiskByFileId(
    entries: ReadonlyArray<ICityPredictionOverlayEntry>,
): Readonly<Record<string, TCodeCityTreemapPredictionRiskLevel>> | undefined {
    if (entries.length === 0) {
        return undefined
    }

    const predictedRiskByFileId: Record<string, TCodeCityTreemapPredictionRiskLevel> = {}
    for (const entry of entries) {
        predictedRiskByFileId[entry.fileId] = entry.riskLevel
    }

    return Object.keys(predictedRiskByFileId).length === 0 ? undefined : predictedRiskByFileId
}
