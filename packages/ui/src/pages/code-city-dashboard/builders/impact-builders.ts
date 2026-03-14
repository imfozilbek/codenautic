import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { IChangeRiskGaugePoint } from "@/components/graphs/change-risk-gauge"
import type { ICityImpactOverlayEntry } from "@/components/graphs/city-impact-overlay"
import type { ICityRefactoringOverlayEntry } from "@/components/graphs/city-refactoring-overlay"
import type { IRefactoringTargetDescriptor } from "@/components/graphs/refactoring-dashboard"
import type { IRefactoringTimelineTask } from "@/components/graphs/refactoring-timeline"
import type { IImpactAnalysisSeed } from "@/components/graphs/impact-analysis-panel"
import type { IImpactGraphEdge, IImpactGraphNode } from "@/components/graphs/impact-graph-view"
import type { IWhatIfOption } from "@/components/graphs/what-if-panel"
import type { IHealthTrendPoint } from "@/components/graphs/health-trend-chart"

/**
 * Максимум refactoring-таргетов для отображения.
 */
const MAX_REFACTORING_TARGETS = 6

/**
 * Максимум overlay entries (refactoring, impact, timeline).
 */
const MAX_OVERLAY_ENTRIES = 5

/**
 * Максимум impact seeds / graph nodes / what-if options.
 */
const MAX_IMPACT_SEEDS = 6

/**
 * Количество top seeds для расчёта среднего risk score.
 */
const RISK_AVERAGE_SAMPLE_SIZE = 3

/**
 * Формирует список refactoring targets с приоритетами ROI/risk/effort.
 *
 * @param files Файлы текущего профиля.
 * @returns Список приоритетных таргетов для dashboard.
 */
export function buildRefactoringTargets(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IRefactoringTargetDescriptor> {
    const targets = files.map((file): IRefactoringTargetDescriptor => {
        const bugCount = file.bugIntroductions?.["30d"] ?? 0
        const complexity = file.complexity ?? 0
        const churn = file.churn ?? 0
        const loc = file.loc ?? 0
        const moduleName = file.path.split("/")[1] ?? "core"

        return {
            description: `Complexity ${String(complexity)}, churn ${String(churn)}, bugs(30d) ${String(bugCount)}`,
            effortScore: Math.max(1, Math.round(loc / 40 + complexity / 8)),
            fileId: file.id,
            id: `refactor-${file.id}`,
            module: moduleName,
            riskScore: Math.max(1, Math.min(99, Math.round(bugCount * 12 + churn * 6))),
            roiScore: Math.max(1, Math.round(complexity * 1.2 + bugCount * 10)),
            title: file.path,
        }
    })

    return [...targets]
        .sort((leftTarget, rightTarget): number => rightTarget.roiScore - leftTarget.roiScore)
        .slice(0, MAX_REFACTORING_TARGETS)
}

/**
 * Формирует overlay-слой приоритетов рефакторинга для CodeCity.
 *
 * @param targets Приоритизированные refactoring targets.
 * @returns Дескрипторы overlay-элементов.
 */
export function buildCityRefactoringOverlayEntries(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
): ReadonlyArray<ICityRefactoringOverlayEntry> {
    return targets
        .slice(0, MAX_OVERLAY_ENTRIES)
        .map((target, index): ICityRefactoringOverlayEntry => {
            const priority: ICityRefactoringOverlayEntry["priority"] =
                index === 0 ? "critical" : index < 3 ? "high" : "medium"

            return {
                details: `ROI ${String(target.roiScore)} · Risk ${String(target.riskScore)} · Effort ${String(target.effortScore)}`,
                fileId: target.fileId,
                label: target.title,
                priority,
            }
        })
}

/**
 * Формирует timeline задачи для плана рефакторинга.
 *
 * @param targets Приоритизированные refactoring targets.
 * @returns Список задач с зависимостями.
 */
export function buildRefactoringTimelineTasks(
    targets: ReadonlyArray<IRefactoringTargetDescriptor>,
): ReadonlyArray<IRefactoringTimelineTask> {
    return targets
        .slice(0, MAX_OVERLAY_ENTRIES)
        .map((target, index, sourceTargets): IRefactoringTimelineTask => {
            const previousTarget = sourceTargets[index - 1]
            const previousPreviousTarget = sourceTargets[index - 2]
            const dependencies: Array<string> = []

            if (previousTarget !== undefined) {
                dependencies.push(previousTarget.title)
            }
            if (index >= 3 && previousPreviousTarget !== undefined) {
                dependencies.push(previousPreviousTarget.title)
            }

            return {
                dependencies,
                durationWeeks: Math.max(1, Math.min(6, Math.round(target.effortScore / 2))),
                fileId: target.fileId,
                id: `timeline-${target.id}`,
                startWeek: index * 2 + 1,
                title: target.title,
            }
        })
}

/**
 * Формирует seeds для impact analysis панели.
 *
 * @param files Файлы текущего профиля.
 * @returns Набор seed-элементов для blast radius.
 */
export function buildImpactAnalysisSeeds(
    files: ReadonlyArray<ICodeCityTreemapFileDescriptor>,
): ReadonlyArray<IImpactAnalysisSeed> {
    return files.slice(0, MAX_IMPACT_SEEDS).map((file, index, sourceFiles): IImpactAnalysisSeed => {
        const nextFile = sourceFiles[index + 1] ?? sourceFiles[0]
        const secondNextFile = sourceFiles[index + 2] ?? sourceFiles[1] ?? nextFile
        const bugCount = file.bugIntroductions?.["30d"] ?? 0
        const complexity = file.complexity ?? 0

        return {
            affectedConsumers: [
                `${file.path.split("/")[1] ?? "core"}-consumer`,
                `${file.path.split("/")[2] ?? "runtime"}-worker`,
            ],
            affectedFiles: [nextFile?.path ?? file.path, secondNextFile?.path ?? file.path].filter(
                (path): boolean => path.length > 0,
            ),
            affectedTests: [
                `tests/${file.path.split("/").slice(-1)[0] ?? "module"}.test.ts`,
                `tests/${nextFile?.path.split("/").slice(-1)[0] ?? "module"}.test.ts`,
            ],
            fileId: file.id,
            id: `impact-${file.id}`,
            label: file.path,
            riskScore: Math.max(1, Math.min(99, Math.round(complexity * 1.5 + bugCount * 9))),
        }
    })
}

/**
 * Формирует ripple overlay entries для CodeCity impact view.
 *
 * @param seeds Набор impact seeds.
 * @returns Overlay дескрипторы с интенсивностью.
 */
export function buildCityImpactOverlayEntries(
    seeds: ReadonlyArray<IImpactAnalysisSeed>,
): ReadonlyArray<ICityImpactOverlayEntry> {
    return seeds.slice(0, MAX_OVERLAY_ENTRIES).map((seed): ICityImpactOverlayEntry => {
        return {
            details: `Affected files ${String(seed.affectedFiles.length)} · Tests ${String(seed.affectedTests.length)} · Consumers ${String(seed.affectedConsumers.length)}`,
            fileId: seed.fileId,
            intensity: Math.max(1, Math.min(99, seed.riskScore)),
            label: seed.label,
        }
    })
}

/**
 * Формирует модель для change risk gauge.
 *
 * @param seeds Impact seeds текущего профиля.
 * @param healthTrend Исторический тренд health score.
 * @returns Текущий риск и historical points.
 */
export function buildChangeRiskGaugeModel(
    seeds: ReadonlyArray<IImpactAnalysisSeed>,
    healthTrend: ReadonlyArray<IHealthTrendPoint>,
): {
    readonly currentScore: number
    readonly historicalPoints: ReadonlyArray<IChangeRiskGaugePoint>
} {
    const currentScore =
        seeds.length === 0
            ? 0
            : Math.round(
                  seeds
                      .slice(0, RISK_AVERAGE_SAMPLE_SIZE)
                      .reduce((total, seed): number => total + seed.riskScore, 0) /
                      Math.min(RISK_AVERAGE_SAMPLE_SIZE, seeds.length),
              )

    const historicalPoints = healthTrend.slice(-3).map((point): IChangeRiskGaugePoint => {
        const riskFromHealth = Math.max(0, Math.min(100, 100 - point.healthScore))
        const date = new Date(point.timestamp)
        return {
            label: `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`,
            score: riskFromHealth,
        }
    })

    return {
        currentScore,
        historicalPoints,
    }
}

/**
 * Формирует impact graph модель (nodes + edges).
 *
 * @param seeds Impact seeds.
 * @returns Граф propagation.
 */
export function buildImpactGraphModel(seeds: ReadonlyArray<IImpactAnalysisSeed>): {
    readonly nodes: ReadonlyArray<IImpactGraphNode>
    readonly edges: ReadonlyArray<IImpactGraphEdge>
} {
    const nodes = seeds.slice(0, MAX_IMPACT_SEEDS).map((seed, index): IImpactGraphNode => {
        return {
            depth: index === 0 ? 0 : 1,
            id: seed.fileId,
            impactScore: seed.riskScore,
            label: seed.label,
        }
    })

    const edges: Array<IImpactGraphEdge> = []
    for (let index = 0; index < nodes.length - 1; index += 1) {
        const sourceNode = nodes[index]
        const targetNode = nodes[index + 1]
        if (sourceNode !== undefined && targetNode !== undefined) {
            edges.push({
                id: `impact-edge-${sourceNode.id}-${targetNode.id}`,
                sourceId: sourceNode.id,
                targetId: targetNode.id,
            })
        }
    }

    return {
        edges,
        nodes,
    }
}

/**
 * Формирует what-if options на основе impact seeds.
 *
 * @param seeds Impact seeds текущего профиля.
 * @returns Опции multi-file сценария.
 */
export function buildWhatIfOptions(
    seeds: ReadonlyArray<IImpactAnalysisSeed>,
): ReadonlyArray<IWhatIfOption> {
    return seeds.slice(0, MAX_IMPACT_SEEDS).map((seed): IWhatIfOption => {
        return {
            affectedCount:
                seed.affectedFiles.length +
                seed.affectedTests.length +
                seed.affectedConsumers.length,
            fileId: seed.fileId,
            id: `what-if-${seed.id}`,
            impactScore: seed.riskScore,
            label: seed.label,
        }
    })
}
