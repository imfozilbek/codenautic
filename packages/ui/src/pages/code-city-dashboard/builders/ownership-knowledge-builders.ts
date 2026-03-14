import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { ICityOwnershipOverlayOwnerEntry } from "@/components/graphs/city-ownership-overlay"
import type { ICityBusFactorOverlayEntry } from "@/components/graphs/city-bus-factor-overlay"
import type { IBusFactorTrendSeries } from "@/components/graphs/bus-factor-trend-chart"
import type { IKnowledgeSiloPanelEntry } from "@/components/graphs/knowledge-silo-panel"
import type {
    IKnowledgeMapExportDistrictRiskEntry,
    IKnowledgeMapExportModel,
    IKnowledgeMapExportOwnerLegendEntry,
    IKnowledgeMapExportSiloEntry,
} from "@/components/graphs/knowledge-map-export"
import type {
    IContributorCollaborationEdge,
    IContributorCollaborationNode,
} from "@/components/graphs/contributor-collaboration-graph"
import type {
    IOwnershipTransitionEvent,
    TOwnershipTransitionHandoffSeverity,
} from "@/components/graphs/ownership-transition-widget"

import type {
    TCodeCityDashboardMetric,
    ICodeCityDashboardContributorDescriptor,
    ICodeCityDashboardOwnershipDescriptor,
    ICodeCityDashboardContributorCollaborationDescriptor,
    ICodeCityDashboardRepositoryProfile,
} from "../code-city-dashboard-types"
import { resolveDistrictName, resolveDashboardMetricLabel } from "../code-city-dashboard-utils"

/**
 * Максимум серий тренда bus factor для графика.
 */
const MAX_BUS_FACTOR_TREND_SERIES = 5

/**
 * Максимум событий ownership transition для отображения.
 */
const MAX_OWNERSHIP_TRANSITION_EVENTS = 6

/**
 * Формирует ownership legend entries для overlay по данным профиля.
 *
 * @param files Файлы текущего профиля.
 * @param contributors Справочник владельцев.
 * @param ownership Маппинг файлов на владельцев.
 * @returns Готовые ownership entries для UI.
 */
export function buildOwnershipOverlayEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<ICityOwnershipOverlayOwnerEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const contributorById = new Map<string, ICodeCityDashboardContributorDescriptor>(
        contributors.map(
            (contributor): readonly [string, ICodeCityDashboardContributorDescriptor] => [
                contributor.ownerId,
                contributor,
            ],
        ),
    )
    const fileIdsByOwner = new Map<string, string[]>()

    for (const relation of ownership) {
        if (fileById.has(relation.fileId) === false) {
            continue
        }
        const ownerFiles = fileIdsByOwner.get(relation.ownerId)
        if (ownerFiles === undefined) {
            fileIdsByOwner.set(relation.ownerId, [relation.fileId])
            continue
        }
        ownerFiles.push(relation.fileId)
    }

    return Array.from(fileIdsByOwner.entries())
        .map(([ownerId, fileIds]): ICityOwnershipOverlayOwnerEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributor = contributorById.get(ownerId)

            return {
                color: contributor?.color ?? "#334155",
                fileIds,
                ownerAvatarUrl: contributor?.ownerAvatarUrl,
                ownerId,
                ownerName: contributor?.ownerName ?? ownerId,
                primaryFileId,
            }
        })
        .filter((entry): entry is ICityOwnershipOverlayOwnerEntry => entry !== undefined)
        .sort(
            (leftOwner, rightOwner): number => rightOwner.fileIds.length - leftOwner.fileIds.length,
        )
}

/**
 * Формирует мапу цветов для раскраски зданий по owner.
 *
 * @param ownershipEntries Элементы ownership overlay.
 * @param isEnabled Флаг активности ownership режима.
 * @returns Record fileId -> color для treemap или undefined.
 */
export function buildOwnershipFileColorById(
    ownershipEntries: ReadonlyArray<ICityOwnershipOverlayOwnerEntry>,
    isEnabled: boolean,
): Readonly<Record<string, string>> | undefined {
    if (isEnabled === false) {
        return undefined
    }

    const colorByFileId: Record<string, string> = {}
    for (const owner of ownershipEntries) {
        for (const fileId of owner.fileIds) {
            colorByFileId[fileId] = owner.color
        }
    }

    return Object.keys(colorByFileId).length === 0 ? undefined : colorByFileId
}

/**
 * Определяет цвет district по bus factor значению.
 *
 * @param busFactor Значение bus factor.
 * @returns Hex-цвет.
 */
function resolveBusFactorDistrictColor(busFactor: number): string {
    if (busFactor <= 1) {
        return "#dc2626"
    }
    if (busFactor === 2) {
        return "#d97706"
    }
    return "#15803d"
}

/**
 * Формирует district-level bus factor модель для CodeCity overlay.
 *
 * @param files Файлы текущего профиля.
 * @param ownership Маппинг владения файлами.
 * @returns Список district entries с риском bus factor.
 */
export function buildBusFactorOverlayEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<ICityBusFactorOverlayEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const fileIdsByDistrict = new Map<string, string[]>()
    const ownerIdsByDistrict = new Map<string, Set<string>>()

    for (const relation of ownership) {
        const file = fileById.get(relation.fileId)
        if (file === undefined) {
            continue
        }

        const districtId = resolveDistrictName(file.path)
        const districtFileIds = fileIdsByDistrict.get(districtId)
        if (districtFileIds === undefined) {
            fileIdsByDistrict.set(districtId, [file.id])
        } else if (districtFileIds.includes(file.id) === false) {
            districtFileIds.push(file.id)
        }

        const districtOwnerIds = ownerIdsByDistrict.get(districtId)
        if (districtOwnerIds === undefined) {
            ownerIdsByDistrict.set(districtId, new Set<string>([relation.ownerId]))
        } else {
            districtOwnerIds.add(relation.ownerId)
        }
    }

    return Array.from(fileIdsByDistrict.entries())
        .map(([districtId, fileIds]): ICityBusFactorOverlayEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributorCount = ownerIdsByDistrict.get(districtId)?.size ?? 0
            const busFactor = Math.max(1, contributorCount)

            return {
                busFactor,
                districtId,
                districtLabel: districtId,
                fileCount: fileIds.length,
                fileIds,
                primaryFileId,
            }
        })
        .filter((entry): entry is ICityBusFactorOverlayEntry => entry !== undefined)
        .sort((leftEntry, rightEntry): number => {
            if (leftEntry.busFactor !== rightEntry.busFactor) {
                return leftEntry.busFactor - rightEntry.busFactor
            }
            return rightEntry.fileCount - leftEntry.fileCount
        })
}

/**
 * Формирует цветовую карту district -> color для bus factor overlay.
 *
 * @param entries District bus factor entries.
 * @returns Color map для package-level раскраски.
 */
export function buildBusFactorPackageColorByName(
    entries: ReadonlyArray<ICityBusFactorOverlayEntry>,
): Readonly<Record<string, string>> | undefined {
    const packageColorByName: Record<string, string> = {}
    for (const entry of entries) {
        packageColorByName[entry.districtId] = resolveBusFactorDistrictColor(entry.busFactor)
    }
    return Object.keys(packageColorByName).length === 0 ? undefined : packageColorByName
}

/**
 * Clamp для bus factor значения.
 *
 * @param value Исходное значение.
 * @returns Ограниченное значение (1-10).
 */
function clampBusFactorValue(value: number): number {
    return Math.max(1, Math.min(10, value))
}

/**
 * Формирует series для line chart тренда bus factor по модулям.
 *
 * @param entries District bus factor entries.
 * @returns Набор module-series с timeline и аннотациями team changes.
 */
export function buildBusFactorTrendSeries(
    entries: ReadonlyArray<ICityBusFactorOverlayEntry>,
): ReadonlyArray<IBusFactorTrendSeries> {
    const timeline = [
        "2025-10-20T00:00:00.000Z",
        "2025-11-15T00:00:00.000Z",
        "2025-12-20T00:00:00.000Z",
        "2026-01-18T00:00:00.000Z",
        "2026-02-01T00:00:00.000Z",
    ] as const

    return entries
        .slice(0, MAX_BUS_FACTOR_TREND_SERIES)
        .map((entry, index): IBusFactorTrendSeries => {
            const baseBusFactor = clampBusFactorValue(entry.busFactor)
            const points = timeline.map((timestamp, pointIndex) => {
                const pointValue = (() => {
                    if (pointIndex === 0) {
                        return clampBusFactorValue(baseBusFactor + 1)
                    }
                    if (pointIndex === 1) {
                        return baseBusFactor
                    }
                    if (pointIndex === 2) {
                        return clampBusFactorValue(baseBusFactor - 1)
                    }
                    if (pointIndex === 3) {
                        return clampBusFactorValue(baseBusFactor - 1 + (index % 2))
                    }
                    return baseBusFactor
                })()

                const annotation = (() => {
                    if (pointIndex === 1) {
                        return "Team rotation"
                    }
                    if (pointIndex === 3 && index % 2 === 1) {
                        return "New maintainer onboarded"
                    }
                    return undefined
                })()

                return {
                    annotation,
                    busFactor: pointValue,
                    timestamp,
                }
            })

            return {
                moduleId: entry.districtId,
                moduleLabel: entry.districtLabel,
                points,
                primaryFileId: entry.primaryFileId,
            }
        })
}

/**
 * Формирует knowledge silo entries с агрегированным risk score.
 *
 * @param files Файлы текущего профиля.
 * @param ownership Маппинг владения файлами.
 * @returns Список silo entries, отсортированный по риску.
 */
export function buildKnowledgeSiloPanelEntries(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<IKnowledgeSiloPanelEntry> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const fileIdsBySilo = new Map<string, string[]>()
    const ownerIdsBySilo = new Map<string, Set<string>>()
    const complexityBySilo = new Map<string, number>()
    const churnBySilo = new Map<string, number>()

    for (const relation of ownership) {
        const file = fileById.get(relation.fileId)
        if (file === undefined) {
            continue
        }

        const siloId = resolveDistrictName(file.path)
        const siloFileIds = fileIdsBySilo.get(siloId)
        if (siloFileIds === undefined) {
            fileIdsBySilo.set(siloId, [file.id])
            complexityBySilo.set(siloId, file.complexity ?? 0)
            churnBySilo.set(siloId, file.churn ?? 0)
        } else if (siloFileIds.includes(file.id) === false) {
            siloFileIds.push(file.id)
            complexityBySilo.set(
                siloId,
                (complexityBySilo.get(siloId) ?? 0) + (file.complexity ?? 0),
            )
            churnBySilo.set(siloId, (churnBySilo.get(siloId) ?? 0) + (file.churn ?? 0))
        }

        const siloOwnerIds = ownerIdsBySilo.get(siloId)
        if (siloOwnerIds === undefined) {
            ownerIdsBySilo.set(siloId, new Set<string>([relation.ownerId]))
        } else {
            siloOwnerIds.add(relation.ownerId)
        }
    }

    return Array.from(fileIdsBySilo.entries())
        .map(([siloId, fileIds]): IKnowledgeSiloPanelEntry | undefined => {
            const primaryFileId = fileIds[0]
            if (primaryFileId === undefined) {
                return undefined
            }
            const contributorCount = ownerIdsBySilo.get(siloId)?.size ?? 0
            const ownershipRisk = contributorCount <= 1 ? 65 : contributorCount === 2 ? 40 : 18
            const complexityRisk = Math.min(20, Math.round((complexityBySilo.get(siloId) ?? 0) / 2))
            const churnRisk = Math.min(14, Math.round((churnBySilo.get(siloId) ?? 0) * 2))
            const riskScore = Math.max(1, Math.min(99, ownershipRisk + complexityRisk + churnRisk))

            return {
                contributorCount: Math.max(1, contributorCount),
                fileCount: fileIds.length,
                fileIds,
                primaryFileId,
                riskScore,
                siloId,
                siloLabel: siloId,
            }
        })
        .filter((entry): entry is IKnowledgeSiloPanelEntry => entry !== undefined)
        .sort((leftEntry, rightEntry): number => rightEntry.riskScore - leftEntry.riskScore)
}

/**
 * Определяет лейбл риска bus factor.
 *
 * @param busFactor Значение bus factor.
 * @returns Лейбл риска.
 */
function resolveKnowledgeMapBusFactorRiskLabel(busFactor: number): string {
    if (busFactor <= 1) {
        return "Critical"
    }
    if (busFactor === 2) {
        return "Elevated"
    }
    return "Healthy"
}

/**
 * Формирует модель knowledge map export (legend + metadata).
 *
 * @param profile Текущий профиль репозитория.
 * @param metric Активная метрика dashboard.
 * @param ownershipEntries Ownership legend entries.
 * @param busFactorEntries District bus factor entries.
 * @param knowledgeSiloEntries Knowledge silo summary entries.
 * @returns Snapshot модель экспорта.
 */
export function buildKnowledgeMapExportModel(
    profile: ICodeCityDashboardRepositoryProfile,
    metric: TCodeCityDashboardMetric,
    ownershipEntries: ReadonlyArray<ICityOwnershipOverlayOwnerEntry>,
    busFactorEntries: ReadonlyArray<ICityBusFactorOverlayEntry>,
    knowledgeSiloEntries: ReadonlyArray<IKnowledgeSiloPanelEntry>,
): IKnowledgeMapExportModel {
    return {
        metadata: {
            generatedAt: new Date().toISOString(),
            metricLabel: resolveDashboardMetricLabel(metric),
            repositoryId: profile.id,
            repositoryLabel: profile.label,
            totalContributors: profile.contributors.length,
            totalFiles: profile.files.length,
        },
        districts: busFactorEntries.map((entry): IKnowledgeMapExportDistrictRiskEntry => {
            return {
                busFactor: entry.busFactor,
                districtLabel: entry.districtLabel,
                riskLabel: resolveKnowledgeMapBusFactorRiskLabel(entry.busFactor),
            }
        }),
        owners: ownershipEntries.map((entry): IKnowledgeMapExportOwnerLegendEntry => {
            return {
                color: entry.color,
                fileCount: entry.fileIds.length,
                ownerName: entry.ownerName,
            }
        }),
        silos: knowledgeSiloEntries.map((entry): IKnowledgeMapExportSiloEntry => {
            return {
                contributorCount: entry.contributorCount,
                fileCount: entry.fileCount,
                riskScore: entry.riskScore,
                siloLabel: entry.siloLabel,
            }
        }),
    }
}

/**
 * Формирует узлы графа контрибьюторов для contributor collaboration view.
 *
 * @param contributors Справочник контрибьюторов.
 * @returns Нормализованные graph nodes.
 */
export function buildContributorGraphNodes(
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
): ReadonlyArray<IContributorCollaborationNode> {
    return contributors.map((entry): IContributorCollaborationNode => {
        return {
            commitCount: entry.commitCount,
            contributorId: entry.ownerId,
            label: entry.ownerName,
        }
    })
}

/**
 * Формирует ребра совместной работы для contributor graph.
 *
 * @param collaborations Co-authoring связи профиля.
 * @returns Graph edges.
 */
export function buildContributorGraphEdges(
    collaborations: ReadonlyArray<ICodeCityDashboardContributorCollaborationDescriptor>,
): ReadonlyArray<IContributorCollaborationEdge> {
    return collaborations.map((entry): IContributorCollaborationEdge => {
        return {
            coAuthorCount: entry.coAuthorCount,
            sourceContributorId: entry.sourceOwnerId,
            targetContributorId: entry.targetOwnerId,
        }
    })
}

/**
 * Определяет severity handoff по характеристикам файла.
 *
 * @param file Дескриптор файла.
 * @returns Severity уровень.
 */
function resolveOwnershipTransitionSeverity(
    file: ICodeCityTreemapFileDescriptor,
): TOwnershipTransitionHandoffSeverity {
    const bugCount = file.bugIntroductions?.["30d"] ?? 0
    const complexity = file.complexity ?? 0

    if (bugCount >= 5 || complexity >= 30) {
        return "critical"
    }
    if (bugCount >= 2 || complexity >= 18) {
        return "watch"
    }
    return "smooth"
}

/**
 * Формирует причину ownership transition.
 *
 * @param severity Severity уровень.
 * @param scopeType Тип scope (file/module).
 * @returns Описание причины.
 */
function resolveOwnershipTransitionReason(
    severity: TOwnershipTransitionHandoffSeverity,
    scopeType: IOwnershipTransitionEvent["scopeType"],
): string {
    if (severity === "critical") {
        return scopeType === "module"
            ? "Module transfer with high regression exposure. Schedule pair handoff."
            : "High-risk file transfer. Add shadow review for first follow-up CCR."
    }
    if (severity === "watch") {
        return "Moderate handoff risk. Keep checklist and reviewer rotation active."
    }
    return "Low-friction transition completed after planned knowledge sync."
}

/**
 * Определяет "from" owner id для transition event.
 *
 * @param contributors Контрибьюторы.
 * @param currentOwnerId Текущий owner id.
 * @param index Индекс в массиве.
 * @returns Owner id предыдущего владельца.
 */
function resolveOwnershipTransitionFromOwnerId(
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
    currentOwnerId: string,
    index: number,
): string {
    if (contributors.length === 0) {
        return currentOwnerId
    }

    const firstCandidate = contributors[(index + 1) % contributors.length]?.ownerId
    if (firstCandidate !== undefined && firstCandidate !== currentOwnerId) {
        return firstCandidate
    }

    const secondCandidate = contributors[(index + 2) % contributors.length]?.ownerId
    if (secondCandidate !== undefined) {
        return secondCandidate
    }

    return currentOwnerId
}

/**
 * Формирует дату ownership transition.
 *
 * @param index Индекс события.
 * @returns ISO timestamp.
 */
function resolveOwnershipTransitionDate(index: number): string {
    const month = 10 + index
    const day = 6 + index * 5
    return new Date(Date.UTC(2025, month, day)).toISOString()
}

/**
 * Формирует timeline переходов ownership для файлов/модулей.
 *
 * @param files Файлы текущего профиля.
 * @param contributors Справочник владельцев.
 * @param ownership Маппинг владения файлами.
 * @returns Отсортированный список handoff-событий.
 */
export function buildOwnershipTransitionEvents(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
    contributors: ReadonlyArray<ICodeCityDashboardContributorDescriptor>,
    ownership: ReadonlyArray<ICodeCityDashboardOwnershipDescriptor>,
): ReadonlyArray<IOwnershipTransitionEvent> {
    const fileById = new Map<string, ICodeCityTreemapFileDescriptor>(
        files.map((file): readonly [string, ICodeCityTreemapFileDescriptor] => [file.id, file]),
    )
    const contributorById = new Map<string, ICodeCityDashboardContributorDescriptor>(
        contributors.map(
            (contributor): readonly [string, ICodeCityDashboardContributorDescriptor] => [
                contributor.ownerId,
                contributor,
            ],
        ),
    )

    return ownership
        .slice(0, MAX_OWNERSHIP_TRANSITION_EVENTS)
        .map((entry, index): IOwnershipTransitionEvent | undefined => {
            const file = fileById.get(entry.fileId)
            if (file === undefined) {
                return undefined
            }

            const scopeType: IOwnershipTransitionEvent["scopeType"] =
                index % 2 === 0 ? "file" : "module"
            const scopeLabel = scopeType === "module" ? resolveDistrictName(file.path) : file.path
            const toOwner = contributorById.get(entry.ownerId)
            const fromOwnerId = resolveOwnershipTransitionFromOwnerId(
                contributors,
                entry.ownerId,
                index,
            )
            const fromOwner = contributorById.get(fromOwnerId)
            const handoffSeverity = resolveOwnershipTransitionSeverity(file)

            return {
                changedAt: resolveOwnershipTransitionDate(index),
                fileId: file.id,
                fromOwnerName: fromOwner?.ownerName ?? fromOwnerId,
                handoffSeverity,
                id: `ownership-transition-${file.id}-${String(index)}`,
                reason: resolveOwnershipTransitionReason(handoffSeverity, scopeType),
                scopeLabel,
                scopeType,
                toOwnerId: entry.ownerId,
                toOwnerName: toOwner?.ownerName ?? entry.ownerId,
            }
        })
        .filter((event): event is IOwnershipTransitionEvent => event !== undefined)
        .sort((leftEvent, rightEvent): number => {
            return rightEvent.changedAt.localeCompare(leftEvent.changedAt)
        })
}
