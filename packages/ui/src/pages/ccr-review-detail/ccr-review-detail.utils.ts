/**
 * Утилиты страницы детального просмотра CCR review.
 *
 * Содержит функции расчёта risk score, маппинга данных для визуализации,
 * построения impact analysis seeds, review history heat entries и форматирования.
 */

import type { ICodeCityTreemapFileDescriptor } from "@/components/graphs/codecity-treemap"
import type { IImpactAnalysisSeed } from "@/components/graphs/impact-analysis-panel"
import type { ICcrDiffFile, ICcrRowData } from "@/pages/ccr-data"

import type {
    IFileNeighborhoodDetails,
    IReviewHistoryHeatEntry,
    IReviewRiskIndicator,
    ISafeGuardTraceItem,
    TReviewDecision,
    TReviewRiskLevel,
} from "./ccr-review-detail.types"

/**
 * Максимум связанных файлов для каждого impact seed.
 */
const MAX_RELATED_FILES = 3

/**
 * Максимум соседних файлов на один файл в review контексте.
 */
const MAX_NEIGHBORHOOD_FILES = 4

/**
 * Максимум зависимостей на файл в окружении.
 */
const MAX_FILE_DEPENDENCIES = 5

/**
 * Формирует сообщение для quick action «Explain this file».
 *
 * @param ccr - Данные CCR, для которой строится сообщение.
 * @returns Текст промпта с указанием файла для фокуса.
 */
function buildExplainMessage(ccr: ICcrRowData): string {
    const fileHint =
        ccr.attachedFiles.length > 0 ? `Focus on ${ccr.attachedFiles[0]}` : "Focus on touched files"

    return `Please explain the current diff for ${ccr.id} in ${ccr.repository}. ${fileHint}.`
}

/**
 * Формирует сообщение для quick action «Summarize changes».
 *
 * @param ccr - Данные CCR, для которой строится сообщение.
 * @returns Текст промпта с запросом на суммирование изменений и рисков.
 */
function buildSummaryMessage(ccr: ICcrRowData): string {
    return `Please summarize the key changes and risks in ${ccr.id}: ${ccr.title}.`
}

/**
 * Подсчитывает количество issue (комментариев) в файле диффа.
 *
 * @param file - Файл диффа с массивом строк.
 * @returns Суммарное количество комментариев по всем строкам файла.
 */
function resolveDiffIssueCount(file: ICcrDiffFile): number {
    return file.lines.reduce((issueCount, line): number => {
        return issueCount + (line.comments?.length ?? 0)
    }, 0)
}

/**
 * Подсчитывает количество изменённых строк (additions + deletions) в файле диффа.
 *
 * @param file - Файл диффа с массивом строк.
 * @returns Количество строк, отличных от context.
 */
function resolveDiffChangedLineCount(file: ICcrDiffFile): number {
    return file.lines.reduce((changedLineCount, line): number => {
        if (line.type === "context") {
            return changedLineCount
        }
        return changedLineCount + 1
    }, 0)
}

/**
 * Строит массив дескрипторов файлов для CodeCity treemap из diff-файлов.
 *
 * Нормализует LOC, complexity и coverage на основе количества изменённых строк
 * и issue для каждого файла.
 *
 * @param diffFiles - Массив файлов диффа.
 * @param lastReviewAt - Временная метка последнего review (ISO 8601).
 * @returns Массив дескрипторов для treemap-визуализации.
 */
function buildReviewContextTreemapFiles(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
    lastReviewAt: string,
): ReadonlyArray<ICodeCityTreemapFileDescriptor> {
    return diffFiles.map((file, index): ICodeCityTreemapFileDescriptor => {
        const changedLineCount = resolveDiffChangedLineCount(file)
        const issueCount = resolveDiffIssueCount(file)
        const normalizedLoc = Math.max(file.lines.length, 24)
        const normalizedComplexity = Math.min(
            40,
            Math.max(8, 6 + Math.round(changedLineCount * 1.4)),
        )
        const normalizedCoverage = Math.min(95, Math.max(45, 90 - changedLineCount))

        return {
            churn: Math.max(1, changedLineCount * 2),
            complexity: normalizedComplexity,
            coverage: normalizedCoverage,
            id: `review-context-${String(index + 1).padStart(2, "0")}`,
            issueCount,
            lastReviewAt,
            loc: normalizedLoc,
            path: file.filePath,
        }
    })
}

/**
 * Извлекает директорию из пути к файлу.
 *
 * @param filePath - Полный путь к файлу.
 * @returns Путь к директории или "root", если файл в корне.
 */
function resolvePathDirectory(filePath: string): string {
    const separatorIndex = filePath.lastIndexOf("/")
    if (separatorIndex < 1) {
        return "root"
    }
    return filePath.slice(0, separatorIndex)
}

/**
 * Строит массив impact analysis seeds из diff-файлов.
 *
 * Для каждого файла определяет связанные файлы, affected consumers,
 * affected tests и вычисляет risk score на основе changed lines и issue count.
 *
 * @param diffFiles - Массив файлов диффа.
 * @param fileIdByPath - Маппинг путей к файлам на их идентификаторы в treemap.
 * @returns Массив seeds для impact analysis визуализации.
 */
function buildReviewImpactSeeds(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
    fileIdByPath: Readonly<Record<string, string>>,
): ReadonlyArray<IImpactAnalysisSeed> {
    return diffFiles.map((file, index): IImpactAnalysisSeed => {
        const changedLineCount = resolveDiffChangedLineCount(file)
        const issueCount = resolveDiffIssueCount(file)
        const relatedFiles = diffFiles
            .map((entry): string => entry.filePath)
            .filter((path): boolean => path !== file.filePath)
            .slice(0, MAX_RELATED_FILES)

        return {
            affectedConsumers: relatedFiles.map((filePath): string => {
                return `${resolvePathDirectory(filePath)} consumer`
            }),
            affectedFiles: relatedFiles,
            affectedTests: relatedFiles.map((filePath): string => {
                const normalizedPath = filePath.replace(/^src\//, "").replace(/\.tsx?$/, "")
                return `tests/${normalizedPath}.test.ts`
            }),
            fileId:
                fileIdByPath[file.filePath] ??
                `review-context-${String(index + 1).padStart(2, "0")}`,
            id: `impact-seed-${String(index + 1).padStart(2, "0")}`,
            label: file.filePath,
            riskScore: Math.min(95, Math.max(20, changedLineCount * 8 + issueCount * 12)),
        }
    })
}

/**
 * Строит маппинг файлов к их соседям в текущем diff-контексте.
 *
 * Соседи определяются по общей директории и позиционной близости в списке файлов.
 * Максимум 4 соседа на файл.
 *
 * @param diffFiles - Массив файлов диффа.
 * @returns Маппинг пути файла к массиву путей его соседей.
 */
function buildReviewNeighborhoodByPath(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
): Readonly<Record<string, ReadonlyArray<string>>> {
    const allPaths = diffFiles.map((file): string => file.filePath)

    return diffFiles.reduce((mapping, file, index): Record<string, ReadonlyArray<string>> => {
        const currentDirectory = resolvePathDirectory(file.filePath)
        const directoryNeighbors = allPaths.filter((candidatePath): boolean => {
            if (candidatePath === file.filePath) {
                return false
            }
            return resolvePathDirectory(candidatePath) === currentDirectory
        })
        const positionalNeighbors = [allPaths[index - 1], allPaths[index + 1]].filter(
            (candidate): candidate is string =>
                candidate !== undefined && candidate !== file.filePath,
        )
        const orderedNeighbors = [...directoryNeighbors, ...positionalNeighbors].filter(
            (candidatePath, candidateIndex, candidates): boolean =>
                candidates.indexOf(candidatePath) === candidateIndex,
        )

        return {
            ...mapping,
            [file.filePath]: orderedNeighbors.slice(0, MAX_NEIGHBORHOOD_FILES),
        }
    }, {})
}

/**
 * Строит детальную информацию об окружении каждого файла в diff-контексте.
 *
 * Для каждого файла определяет зависимости (sibling-файлы в той же директории
 * плюс baseline-зависимости) и формирует описания последних изменений.
 *
 * @param diffFiles - Массив файлов диффа.
 * @returns Маппинг пути файла к деталям его окружения.
 */
function buildFileNeighborhoodDetails(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
): Readonly<Record<string, IFileNeighborhoodDetails>> {
    const allPaths = diffFiles.map((file): string => file.filePath)

    return diffFiles.reduce((mapping, file): Record<string, IFileNeighborhoodDetails> => {
        const directory = resolvePathDirectory(file.filePath)
        const siblingDependencies = allPaths.filter((candidatePath): boolean => {
            if (candidatePath === file.filePath) {
                return false
            }
            return resolvePathDirectory(candidatePath) === directory
        })
        const baselineDependencies = [
            `${directory}/index.ts`,
            "src/shared/review-context.ts",
        ].filter((dependencyPath): boolean => dependencyPath !== file.filePath)
        const dependencies = [...siblingDependencies, ...baselineDependencies].filter(
            (dependencyPath, dependencyIndex, dependencyList): boolean =>
                dependencyList.indexOf(dependencyPath) === dependencyIndex,
        )
        const changedLineCount = resolveDiffChangedLineCount(file)
        const issueCount = resolveDiffIssueCount(file)
        const recentChanges = [
            `Updated ${String(changedLineCount)} changed lines in current CCR.`,
            `Reviewed comments: ${String(issueCount)} items in last review iteration.`,
            `Latest review touched ${directory} dependency neighborhood.`,
        ]

        return {
            ...mapping,
            [file.filePath]: {
                dependencies: dependencies.slice(0, MAX_FILE_DEPENDENCIES),
                recentChanges,
            },
        }
    }, {})
}

/**
 * Строит массив записей тепловой карты истории review.
 *
 * Для каждого файла рассчитывает приблизительное количество review
 * по трём временным окнам (7d, 30d, 90d) на основе changed lines и issue count.
 *
 * @param diffFiles - Массив файлов диффа.
 * @returns Массив записей тепловой карты.
 */
function buildReviewHistoryHeatEntries(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
): ReadonlyArray<IReviewHistoryHeatEntry> {
    return diffFiles.map((file): IReviewHistoryHeatEntry => {
        const changedLineCount = resolveDiffChangedLineCount(file)
        const issueCount = resolveDiffIssueCount(file)
        const shortWindowReviews = Math.max(1, Math.floor(changedLineCount / 2) + issueCount)
        const mediumWindowReviews = Math.max(
            shortWindowReviews,
            shortWindowReviews + Math.floor(changedLineCount / 3),
        )
        const longWindowReviews = Math.max(
            mediumWindowReviews,
            mediumWindowReviews + Math.floor(changedLineCount / 2) + 1,
        )

        return {
            filePath: file.filePath,
            reviewsByWindow: {
                "30d": mediumWindowReviews,
                "7d": shortWindowReviews,
                "90d": longWindowReviews,
            },
        }
    })
}

/**
 * Рассчитывает HSL-цвет для ячейки тепловой карты истории review.
 *
 * Цвет интерполируется от холодного (низкая активность) к тёплому (высокая).
 * При нулевом максимуме возвращает нейтральный цвет.
 *
 * @param activityCount - Количество review для данного файла.
 * @param maxActivityCount - Максимальное количество review по всем файлам.
 * @returns CSS HSL-строка цвета.
 */
function resolveReviewHistoryHeatColor(activityCount: number, maxActivityCount: number): string {
    if (maxActivityCount <= 0) {
        return "hsl(210, 40%, 92%)"
    }
    const clampedRatio = Math.min(1, Math.max(0, activityCount / maxActivityCount))
    const hue = 42 - Math.round(clampedRatio * 42)
    const saturation = 76
    const lightness = 78 - Math.round(clampedRatio * 36)
    return `hsl(${String(hue)}, ${String(saturation)}%, ${String(lightness)}%)`
}

/**
 * Маппит уровень риска review на цвет Chip-компонента.
 *
 * @param level - Уровень риска review.
 * @returns Цвет Chip: danger, warning, primary или success.
 */
function mapReviewRiskChipColor(
    level: TReviewRiskLevel,
): "danger" | "primary" | "success" | "warning" {
    if (level === "critical") {
        return "danger"
    }
    if (level === "high") {
        return "warning"
    }
    if (level === "medium") {
        return "primary"
    }
    return "success"
}

/**
 * Рассчитывает комплексный индикатор риска review.
 *
 * Учитывает количество изменённых строк, issue count, историю review
 * и средний impact risk. Возвращает уровень (critical/high/medium/low),
 * числовую оценку (0-100) и список причин.
 *
 * @param diffFiles - Массив файлов диффа.
 * @param historyEntries - Записи тепловой карты истории review.
 * @param impactSeeds - Seeds для impact analysis.
 * @returns Индикатор риска с уровнем, оценкой и причинами.
 */
function resolveReviewRiskIndicator(
    diffFiles: ReadonlyArray<ICcrDiffFile>,
    historyEntries: ReadonlyArray<IReviewHistoryHeatEntry>,
    impactSeeds: ReadonlyArray<IImpactAnalysisSeed>,
): IReviewRiskIndicator {
    const changedLines = diffFiles.reduce((total, file): number => {
        return total + resolveDiffChangedLineCount(file)
    }, 0)
    const issueCount = diffFiles.reduce((total, file): number => {
        return total + resolveDiffIssueCount(file)
    }, 0)
    const maxHistoryActivity = historyEntries.reduce((maxValue, entry): number => {
        return Math.max(maxValue, entry.reviewsByWindow["30d"])
    }, 0)
    const averageImpactRisk =
        impactSeeds.length === 0
            ? 0
            : Math.round(
                  impactSeeds.reduce((total, seed): number => total + seed.riskScore, 0) /
                      impactSeeds.length,
              )
    const score = Math.min(
        100,
        changedLines * 2 +
            issueCount * 9 +
            maxHistoryActivity * 2 +
            Math.round(averageImpactRisk * 0.35),
    )

    if (score >= 80) {
        return {
            level: "critical",
            reasons: [
                `High blast radius: ${String(changedLines)} changed lines across CCR files.`,
                `Historical review pressure: peak ${String(maxHistoryActivity)} reviews in 30d window.`,
                `Impact model average risk: ${String(averageImpactRisk)}.`,
            ],
            score,
        }
    }
    if (score >= 60) {
        return {
            level: "high",
            reasons: [
                `Review findings volume is elevated: ${String(issueCount)} issue signals.`,
                `Impact model average risk: ${String(averageImpactRisk)}.`,
                `Historical review pressure: peak ${String(maxHistoryActivity)} reviews.`,
            ],
            score,
        }
    }
    if (score >= 40) {
        return {
            level: "medium",
            reasons: [
                `Moderate blast radius from ${String(changedLines)} changed lines.`,
                `Issue signals detected: ${String(issueCount)}.`,
                `History trend remains active (${String(maxHistoryActivity)} reviews).`,
            ],
            score,
        }
    }
    return {
        level: "low",
        reasons: [
            `Contained blast radius with ${String(changedLines)} changed lines.`,
            `Limited issue signals: ${String(issueCount)}.`,
            `Historical activity is stable (${String(maxHistoryActivity)} reviews).`,
        ],
        score,
    }
}

/**
 * Маппит решение review на цвет и label для badge-компонента.
 *
 * @param reviewDecision - Текущее решение по review.
 * @returns Объект с цветом badge и текстовой меткой.
 */
function mapReviewDecisionBadge(reviewDecision: TReviewDecision): {
    readonly color: "danger" | "primary" | "success"
    readonly label: string
} {
    if (reviewDecision === "approved") {
        return {
            color: "success",
            label: "Approved",
        }
    }

    if (reviewDecision === "rejected") {
        return {
            color: "danger",
            label: "Request changes",
        }
    }

    return {
        color: "primary",
        label: "In progress",
    }
}

/**
 * Форматирует ISO-строку даты в локализованный короткий формат.
 *
 * @param rawTimestamp - Строка даты в формате ISO 8601.
 * @returns Отформатированная строка (dd/mm hh:mm) или "—" при невалидной дате.
 */
function formatFeedbackTimestamp(rawTimestamp: string): string {
    const date = new Date(rawTimestamp)
    if (Number.isNaN(date.getTime())) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
    })
}

/**
 * Строит демонстрационные SafeGuard trace items из данных CCR.
 *
 * Создаёт три trace-записи с различными сценариями прохождения pipeline:
 * одна видимая, две скрытые (по dedup и severity).
 *
 * @param ccr - Данные CCR.
 * @returns Массив trace-записей SafeGuard pipeline.
 */
function buildSafeGuardTraceItems(ccr: ICcrRowData): ReadonlyArray<ISafeGuardTraceItem> {
    const primaryFile = ccr.attachedFiles[0] ?? "unknown-file.ts"
    const secondaryFile = ccr.attachedFiles[1] ?? primaryFile

    return [
        {
            finalDecision: "shown",
            filePath: primaryFile,
            id: "SG-001",
            remark: "Missing tenant context validation for review deep-link.",
            steps: [
                {
                    filterId: "dedup",
                    reason: "Unique fingerprint not seen in this CCR.",
                    status: "passed",
                },
                {
                    filterId: "hallucination",
                    reason: "Matched with changed lines and file ownership metadata.",
                    status: "passed",
                },
                {
                    filterId: "severity",
                    reason: "Severity = high, above policy threshold (medium).",
                    status: "applied",
                },
            ],
        },
        {
            finalDecision: "hidden",
            filePath: primaryFile,
            hiddenReason: "Filtered by dedup: same finding already present in SG-001.",
            id: "SG-002",
            remark: "Potential tenant mismatch in deep-link fallback branch.",
            steps: [
                {
                    filterId: "dedup",
                    reason: "Duplicate fingerprint matched SG-001, keeping canonical remark.",
                    status: "filtered_out",
                },
                {
                    filterId: "hallucination",
                    reason: "Skipped because item was removed by earlier dedup stage.",
                    status: "filtered_out",
                },
                {
                    filterId: "severity",
                    reason: "Skipped because item was removed by earlier dedup stage.",
                    status: "filtered_out",
                },
            ],
        },
        {
            finalDecision: "hidden",
            filePath: secondaryFile,
            hiddenReason: "Filtered by severity: low confidence minor style suggestion.",
            id: "SG-003",
            remark: "Rename helper to align with naming convention.",
            steps: [
                {
                    filterId: "dedup",
                    reason: "No duplicates found for this semantic signal.",
                    status: "passed",
                },
                {
                    filterId: "hallucination",
                    reason: "Context evidence exists in diff, signal accepted as valid.",
                    status: "passed",
                },
                {
                    filterId: "severity",
                    reason: "Severity below configured threshold (low < medium).",
                    status: "filtered_out",
                },
            ],
        },
    ]
}

export {
    buildExplainMessage,
    buildFileNeighborhoodDetails,
    buildReviewContextTreemapFiles,
    buildReviewHistoryHeatEntries,
    buildReviewImpactSeeds,
    buildReviewNeighborhoodByPath,
    buildSafeGuardTraceItems,
    buildSummaryMessage,
    formatFeedbackTimestamp,
    mapReviewDecisionBadge,
    mapReviewRiskChipColor,
    resolveDiffChangedLineCount,
    resolveDiffIssueCount,
    resolveReviewHistoryHeatColor,
    resolveReviewRiskIndicator,
}
