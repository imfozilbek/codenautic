import type { ICodeCityTreemapFileDescriptor } from "@/components/codecity/codecity-treemap"
import type {
    ISprintComparisonMetric,
    ISprintComparisonSnapshot,
} from "@/components/team-analytics/sprint-comparison-view"
import type { IDistrictTrendIndicatorEntry } from "@/components/codecity/district-trend-indicators"
import type { IAchievementPanelEntry } from "@/components/team-analytics/achievements-panel"
import type { ITeamLeaderboardEntry } from "@/components/team-analytics/team-leaderboard"
import type {
    ISprintSummaryCardModel,
    ISprintSummaryMetric,
} from "@/components/team-analytics/sprint-summary-card"
import type { ITrendTimelineEntry } from "@/components/predictions/trend-timeline-widget"
import type { IHealthTrendPoint } from "@/components/codecity/health-trend-chart"

/**
 * Максимум файлов-кандидатов для sprint comparison snapshot.
 */
const MAX_SPRINT_CANDIDATE_FILES = 3

/**
 * Максимум достижений для sprint achievement panel.
 */
const MAX_SPRINT_ACHIEVEMENTS = 4

/**
 * Максимум связанных файлов в achievement/focus контексте.
 */
const MAX_RELATED_FILE_IDS = 3

/**
 * Длина даты в ISO-строке (YYYY-MM-DD).
 */
const ISO_DATE_LENGTH = 10

import type {
    ICodeCityDashboardContributorDescriptor,
    ICodeCityDashboardOwnershipDescriptor,
} from "../code-city-dashboard-types"
import { resolveDistrictName } from "../code-city-dashboard-utils"

/**
 * Вычисляет improvement score на основе sprint-метрик.
 *
 * @param metrics Метрики сравнения sprint.
 * @returns Числовой improvement score.
 */
export function calculateSprintImprovementScore(
    metrics: ReadonlyArray<ISprintComparisonMetric>,
): number {
    const weightedChange = metrics.reduce((total, metric): number => {
        const beforeValue = Math.max(metric.beforeValue, 1)
        if (metric.label === "Coverage") {
            return total + ((metric.afterValue - metric.beforeValue) / beforeValue) * 100
        }
        return total + ((metric.beforeValue - metric.afterValue) / beforeValue) * 100
    }, 0)
    return Math.max(0, Math.round(weightedChange / Math.max(metrics.length, 1)))
}

/**
 * Формирует side-by-side sprint snapshots для CodeCity comparison.
 *
 * @param files Файлы текущего профиля.
 * @returns Набор before/after snapshot-ов.
 */
export function buildSprintComparisonSnapshots(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<ISprintComparisonSnapshot> {
    const candidateFiles = files.slice(0, MAX_SPRINT_CANDIDATE_FILES)
    return candidateFiles.map((file, index): ISprintComparisonSnapshot => {
        const beforeComplexity = Math.max(1, Math.round((file.complexity ?? 0) + 4 + index))
        const afterComplexity = Math.max(1, beforeComplexity - 2 - index)
        const beforeCoverage = Math.max(1, Math.round(68 - (file.complexity ?? 0) / 2 - index))
        const afterCoverage = Math.min(100, beforeCoverage + 4 + index)
        const beforeChurn = Math.max(1, (file.churn ?? 0) + 5 + index)
        const afterChurn = Math.max(1, beforeChurn - 2)
        const metrics: ReadonlyArray<ISprintComparisonMetric> = [
            {
                afterValue: afterComplexity,
                beforeValue: beforeComplexity,
                label: "Complexity",
            },
            {
                afterValue: afterCoverage,
                beforeValue: beforeCoverage,
                label: "Coverage",
            },
            {
                afterValue: afterChurn,
                beforeValue: beforeChurn,
                label: "Churn",
            },
        ]

        return {
            fileId: file.id,
            id: `sprint-comparison-${String(index)}-${file.id}`,
            improvementScore: calculateSprintImprovementScore(metrics),
            metrics,
            title: `Sprint ${String(12 - index)} vs ${String(11 - index)}`,
        }
    })
}

/**
 * Формирует district-level trend indicators для CodeCity.
 *
 * @param files Файлы текущего профиля.
 * @returns District entries с направлением тренда и delta.
 */
export function buildDistrictTrendIndicators(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IDistrictTrendIndicatorEntry> {
    const aggregatedDistricts = new Map<
        string,
        {
            complexity: number
            churn: number
            bugIntroductions: number
            fileIds: string[]
            primaryFileId: string
        }
    >()

    for (const file of files) {
        const districtId = resolveDistrictName(file.path)
        const existingDistrict = aggregatedDistricts.get(districtId)
        const bugIntroductions = file.bugIntroductions?.["30d"] ?? 0
        if (existingDistrict === undefined) {
            aggregatedDistricts.set(districtId, {
                bugIntroductions,
                churn: file.churn ?? 0,
                complexity: file.complexity ?? 0,
                fileIds: [file.id],
                primaryFileId: file.id,
            })
            continue
        }

        existingDistrict.complexity += file.complexity ?? 0
        existingDistrict.churn += file.churn ?? 0
        existingDistrict.bugIntroductions += bugIntroductions
        if (existingDistrict.fileIds.includes(file.id) === false) {
            existingDistrict.fileIds.push(file.id)
        }
    }

    const sortedDistrictIds = Array.from(aggregatedDistricts.keys()).sort(
        (leftDistrictId, rightDistrictId): number => {
            return leftDistrictId.localeCompare(rightDistrictId)
        },
    )

    return sortedDistrictIds
        .map((districtId, index): IDistrictTrendIndicatorEntry | undefined => {
            const district = aggregatedDistricts.get(districtId)
            if (district === undefined) {
                return undefined
            }

            const baselineRisk =
                district.complexity +
                district.churn * 0.6 +
                district.bugIntroductions * 8 +
                district.fileIds.length * 2
            const trendShiftRatio = index % 3 === 0 ? 0.16 : index % 3 === 1 ? -0.12 : 0.02
            const currentRisk = Math.max(1, baselineRisk * (1 - trendShiftRatio))
            const deltaPercentage = Math.round(
                ((baselineRisk - currentRisk) / Math.max(baselineRisk, 1)) * 100,
            )
            const trend: IDistrictTrendIndicatorEntry["trend"] =
                deltaPercentage >= 4 ? "improving" : deltaPercentage <= -4 ? "degrading" : "stable"

            return {
                affectedFileIds: district.fileIds,
                deltaPercentage,
                districtId,
                districtLabel: districtId,
                fileCount: district.fileIds.length,
                primaryFileId: district.primaryFileId,
                trend,
            }
        })
        .filter((entry): entry is IDistrictTrendIndicatorEntry => entry !== undefined)
        .sort((leftEntry, rightEntry): number => {
            const deltaDistance =
                Math.abs(rightEntry.deltaPercentage) - Math.abs(leftEntry.deltaPercentage)
            if (deltaDistance !== 0) {
                return deltaDistance
            }
            return leftEntry.districtLabel.localeCompare(rightEntry.districtLabel)
        })
}

/**
 * Определяет badge достижения по проценту улучшения.
 *
 * @param improvementPercent Процент улучшения.
 * @returns Тип badge.
 */
function resolveAchievementBadge(improvementPercent: number): IAchievementPanelEntry["badge"] {
    if (improvementPercent >= 18) {
        return "gold"
    }
    if (improvementPercent >= 12) {
        return "silver"
    }
    return "bronze"
}

/**
 * Формирует sprint achievements для gamification-панели.
 *
 * @param files Файлы текущего профиля.
 * @returns Набор достижений по модулям.
 */
export function buildSprintAchievements(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IAchievementPanelEntry> {
    return files
        .slice(0, MAX_SPRINT_ACHIEVEMENTS)
        .map((file, index): IAchievementPanelEntry => {
            const districtName = resolveDistrictName(file.path)
            const baseComplexity = Math.max(1, file.complexity ?? 1)
            const complexityReduction = Math.max(
                6,
                Math.min(24, Math.round(baseComplexity / (index + 2) + 8)),
            )
            const churnReduction = Math.max(4, Math.round(((file.churn ?? 0) + index + 3) / 2))
            const improvementPercent = Math.max(complexityReduction, churnReduction)
            const relatedFileIds = files
                .filter((candidateFile): boolean => {
                    return resolveDistrictName(candidateFile.path) === districtName
                })
                .slice(0, MAX_RELATED_FILE_IDS)
                .map((candidateFile): string => candidateFile.id)
            const normalizedRelatedFileIds = relatedFileIds.length > 0 ? relatedFileIds : [file.id]

            return {
                badge: resolveAchievementBadge(improvementPercent),
                fileId: file.id,
                id: `achievement-${String(index)}-${file.id}`,
                improvementPercent,
                relatedFileIds: normalizedRelatedFileIds,
                summary:
                    `Reduced complexity in module ${districtName} by ` +
                    `${String(complexityReduction)}%. Churn also improved by ` +
                    `${String(churnReduction)}%.`,
                title: `Reduced complexity in ${districtName} by ${String(complexityReduction)}%`,
            }
        })
        .sort((leftAchievement, rightAchievement): number => {
            if (rightAchievement.improvementPercent !== leftAchievement.improvementPercent) {
                return rightAchievement.improvementPercent - leftAchievement.improvementPercent
            }
            return leftAchievement.title.localeCompare(rightAchievement.title)
        })
}

/**
 * Clamp для leaderboard score значения.
 *
 * @param value Исходное значение.
 * @returns Ограниченное значение (1-180).
 */
function clampLeaderboardScore(value: number): number {
    return Math.max(1, Math.min(180, value))
}

/**
 * Формирует leaderboard-команду для gamification ранжирования.
 *
 * @param files Файлы текущего профиля.
 * @param contributors Контрибьюторы репозитория.
 * @param ownership Маппинг file -> owner.
 * @returns Набор leaderboard entries.
 */
export function buildTeamLeaderboardEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<ITeamLeaderboardEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const fileIdsByOwner = new Map<string, string[]>()
    for (const relation of ownership) {
        if (fileById.has(relation.fileId) === false) {
            continue
        }
        const ownerFileIds = fileIdsByOwner.get(relation.ownerId)
        if (ownerFileIds === undefined) {
            fileIdsByOwner.set(relation.ownerId, [relation.fileId])
            continue
        }
        if (ownerFileIds.includes(relation.fileId) === false) {
            ownerFileIds.push(relation.fileId)
        }
    }

    return contributors
        .map((contributor): ITeamLeaderboardEntry => {
            const ownerFileIds = fileIdsByOwner.get(contributor.ownerId) ?? []
            const normalizedFileIds =
                ownerFileIds.length > 0 ? ownerFileIds : files[0] === undefined ? [] : [files[0].id]
            const primaryFileId =
                normalizedFileIds[0] ?? files[0]?.id ?? `leaderboard-${contributor.ownerId}`
            const ownerFiles = normalizedFileIds
                .map((fileId): ICodeCityTreemapFileDescriptor | undefined => fileById.get(fileId))
                .filter((file): file is ICodeCityTreemapFileDescriptor => file !== undefined)
            const fileCount = Math.max(1, normalizedFileIds.length)
            const totalComplexity = ownerFiles.reduce((sum, file): number => {
                return sum + (file.complexity ?? 0)
            }, 0)
            const totalChurn = ownerFiles.reduce((sum, file): number => {
                return sum + (file.churn ?? 0)
            }, 0)
            const totalBugIntroductions = ownerFiles.reduce((sum, file): number => {
                return sum + (file.bugIntroductions?.["30d"] ?? 0)
            }, 0)
            const avgComplexity = totalComplexity / fileCount
            const avgChurn = totalChurn / fileCount
            const avgBugIntroductions = totalBugIntroductions / fileCount
            const qualityMonth = clampLeaderboardScore(
                Math.round(100 - avgComplexity * 3 - avgChurn * 1.2 - avgBugIntroductions * 6),
            )
            const qualitySprint = clampLeaderboardScore(
                Math.round(qualityMonth + 3 + contributor.commitCount / 25),
            )
            const qualityQuarter = clampLeaderboardScore(Math.round(qualityMonth - 4))
            const velocityMonth = clampLeaderboardScore(
                Math.round(contributor.commitCount * 1.1 + fileCount * 4),
            )
            const velocitySprint = clampLeaderboardScore(Math.round(velocityMonth + 8))
            const velocityQuarter = clampLeaderboardScore(Math.round(velocityMonth - 6))
            const ownershipMonth = clampLeaderboardScore(
                Math.round(fileCount * 12 + contributor.commitCount * 0.6),
            )
            const ownershipSprint = clampLeaderboardScore(Math.round(ownershipMonth + 4))
            const ownershipQuarter = clampLeaderboardScore(Math.round(ownershipMonth + 10))

            return {
                fileIds: normalizedFileIds,
                ownerId: contributor.ownerId,
                ownerName: contributor.ownerName,
                ownership: {
                    month: ownershipMonth,
                    quarter: ownershipQuarter,
                    sprint: ownershipSprint,
                },
                primaryFileId,
                quality: {
                    month: qualityMonth,
                    quarter: qualityQuarter,
                    sprint: qualitySprint,
                },
                velocity: {
                    month: velocityMonth,
                    quarter: velocityQuarter,
                    sprint: velocitySprint,
                },
            }
        })
        .sort((leftEntry, rightEntry): number => {
            if (rightEntry.quality.sprint !== leftEntry.quality.sprint) {
                return rightEntry.quality.sprint - leftEntry.quality.sprint
            }
            return leftEntry.ownerName.localeCompare(rightEntry.ownerName)
        })
}

/**
 * Вычисляет delta по конкретной sprint-метрике.
 *
 * @param snapshots Sprint comparison snapshots.
 * @param label Лейбл метрики.
 * @returns Средняя delta в процентах.
 */
function calculateSprintMetricDelta(
    snapshots: ReadonlyArray<ISprintComparisonSnapshot>,
    label: ISprintComparisonMetric["label"],
): number {
    const deltas = snapshots
        .map((snapshot): number | undefined => {
            const metric = snapshot.metrics.find((entry): boolean => entry.label === label)
            if (metric === undefined) {
                return undefined
            }
            const denominator = Math.max(metric.beforeValue, 1)
            if (label === "Coverage") {
                return Math.round(((metric.afterValue - metric.beforeValue) / denominator) * 100)
            }
            return Math.round(((metric.beforeValue - metric.afterValue) / denominator) * 100)
        })
        .filter((entry): entry is number => entry !== undefined)
    if (deltas.length === 0) {
        return 0
    }
    return Math.round(deltas.reduce((sum, value): number => sum + value, 0) / deltas.length)
}

/**
 * Формирует sprint summary card модель для gamification карточки.
 *
 * @param files Файлы текущего профиля.
 * @param snapshots Sprint comparison snapshots.
 * @param achievements Sprint achievements.
 * @param districtTrends District trend indicators.
 * @returns Сводная карточка спринта.
 */
export function buildSprintSummaryCardModel(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    snapshots: ReadonlyArray<ISprintComparisonSnapshot>,
    achievements: ReadonlyArray<IAchievementPanelEntry>,
    districtTrends: ReadonlyArray<IDistrictTrendIndicatorEntry>,
): ISprintSummaryCardModel {
    const complexityAverage =
        files.length === 0
            ? 0
            : files.reduce((sum, file): number => sum + (file.complexity ?? 0), 0) / files.length
    const churnTotal = files.reduce((sum, file): number => sum + (file.churn ?? 0), 0)
    const complexityDelta = calculateSprintMetricDelta(snapshots, "Complexity")
    const churnDelta = calculateSprintMetricDelta(snapshots, "Churn")
    const coverageDelta = calculateSprintMetricDelta(snapshots, "Coverage")
    const districtTrendDelta =
        districtTrends.length === 0
            ? 0
            : Math.round(
                  districtTrends.reduce((sum, entry): number => sum + entry.deltaPercentage, 0) /
                      districtTrends.length,
              )
    const baseScore =
        complexityDelta * 0.35 +
        churnDelta * 0.25 +
        coverageDelta * 0.25 +
        districtTrendDelta * 0.15 +
        achievements.length * 2
    const overallImprovementScore = Math.max(1, Math.min(99, Math.round(baseScore)))
    const primarySnapshot = snapshots[0]
    const focusFileId = primarySnapshot?.fileId ?? files[0]?.id
    const topImprovingDistricts = districtTrends.filter(
        (entry): boolean => entry.deltaPercentage > 0,
    )
    const focusedDistrict = topImprovingDistricts[0]
    const metrics: ReadonlyArray<ISprintSummaryMetric> = [
        {
            deltaPercent: complexityDelta,
            focusFileId,
            focusFileIds: focusFileId === undefined ? [] : [focusFileId],
            id: "complexity",
            label: "Complexity",
            value: `Avg complexity ${complexityAverage.toFixed(1)}`,
        },
        {
            deltaPercent: churnDelta,
            focusFileId,
            focusFileIds: focusFileId === undefined ? [] : [focusFileId],
            id: "churn",
            label: "Churn",
            value: `Churn volume ${String(churnTotal)}`,
        },
        {
            deltaPercent: coverageDelta,
            focusFileId: focusedDistrict?.primaryFileId,
            focusFileIds: focusedDistrict?.affectedFileIds ?? [],
            id: "coverage",
            label: "Coverage",
            value: `${String(topImprovingDistricts.length)} districts improving`,
        },
    ]

    return {
        achievementsCount: achievements.length,
        metrics,
        overallImprovementScore,
        sprintLabel: primarySnapshot?.title ?? "Sprint summary",
    }
}

/**
 * Формирует sprint-over-sprint timeline с sparkline метриками.
 *
 * @param files Файлы текущего профиля.
 * @param healthTrend История health score.
 * @param snapshots Sprint comparison snapshots.
 * @returns Timeline entries для виджета трендов.
 */
export function buildTrendTimelineEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
    snapshots: ReadonlyArray<ISprintComparisonSnapshot>,
): ReadonlyArray<ITrendTimelineEntry> {
    const entryCount = Math.min(4, Math.max(healthTrend.length - 2, 1))
    return Array.from({ length: entryCount }, (_, index): ITrendTimelineEntry | undefined => {
        const sliceStart = Math.max(0, healthTrend.length - (index + 4))
        const pointsSlice = healthTrend.slice(sliceStart, sliceStart + 4)
        if (pointsSlice.length === 0) {
            return undefined
        }
        const firstPoint = pointsSlice[0]
        const lastPoint = pointsSlice[pointsSlice.length - 1]
        const previousScore = firstPoint?.healthScore ?? lastPoint?.healthScore ?? 0
        const currentScore = lastPoint?.healthScore ?? previousScore
        const scoreDelta = Math.round(currentScore - previousScore)
        const snapshot = snapshots[index]
        const focusFileId = snapshot?.fileId ?? files[index]?.id
        const focusDistrictName =
            focusFileId === undefined
                ? undefined
                : resolveDistrictName(
                      files.find((file): boolean => file.id === focusFileId)?.path ?? "",
                  )
        const focusFileIds =
            focusDistrictName === undefined
                ? []
                : files
                      .filter((candidateFile): boolean => {
                          return resolveDistrictName(candidateFile.path) === focusDistrictName
                      })
                      .slice(0, MAX_RELATED_FILE_IDS)
                      .map((candidateFile): string => candidateFile.id)
        const normalizedFocusFileIds =
            focusFileIds.length > 0 ? focusFileIds : focusFileId === undefined ? [] : [focusFileId]

        return {
            focusFileId,
            focusFileIds: normalizedFocusFileIds,
            id: `trend-timeline-${String(index)}`,
            metrics: [
                {
                    label: "Complexity",
                    points: pointsSlice.map((point, pointIndex): number => {
                        return Math.max(1, Math.round((100 - point.healthScore) / 3 + pointIndex))
                    }),
                },
                {
                    label: "Coverage",
                    points: pointsSlice.map((point): number => {
                        return Math.max(1, Math.round(point.healthScore * 0.9))
                    }),
                },
                {
                    label: "Churn",
                    points: pointsSlice.map((point, pointIndex): number => {
                        return Math.max(
                            1,
                            Math.round((120 - point.healthScore) / 4 + pointIndex * 2),
                        )
                    }),
                },
            ],
            sprintLabel: snapshot?.title ?? `Sprint ${String(12 - index)}`,
            startedAt: (lastPoint?.timestamp ?? "").slice(0, ISO_DATE_LENGTH),
            summary:
                scoreDelta >= 0
                    ? `Quality improved by ${String(scoreDelta)} points since the start of this sprint window.`
                    : `Quality dropped by ${String(Math.abs(scoreDelta))} points and requires deeper comparison.`,
        }
    }).filter((entry): entry is ITrendTimelineEntry => entry !== undefined)
}
