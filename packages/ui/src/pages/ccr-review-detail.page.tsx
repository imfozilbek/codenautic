import { useMemo, useRef, useState, type ReactElement } from "react"

import {
    ChatPanel,
    type IChatPanelContext,
    type IChatPanelMessage,
} from "@/components/chat/chat-panel"
import { ChatThreadList, type IChatThread } from "@/components/chat/chat-thread-list"
import {
    CodeCityTreemap,
    type ICodeCityTreemapFileDescriptor,
    type ICodeCityTreemapImpactedFileDescriptor,
} from "@/components/graphs/codecity-treemap"
import {
    ImpactAnalysisPanel,
    type IImpactAnalysisSeed,
    type IImpactAnalysisSelection,
} from "@/components/graphs/impact-analysis-panel"
import { ReviewCommentThread } from "@/components/reviews/review-comment-thread"
import { CodeDiffViewer } from "@/components/reviews/code-diff-viewer"
import { Alert, Button, Card, CardBody, CardHeader, Chip, StyledLink } from "@/components/ui"
import { SseStreamViewer } from "@/components/streaming/sse-stream-viewer"
import type {
    ICcrWorkspaceContextResponse,
    ICcrWorkspaceDiffFile,
    ICcrWorkspaceReviewCommentThread,
} from "@/lib/api/endpoints/ccr-workspace.endpoint"
import { useCodeReview } from "@/lib/hooks/queries"
import { getUiActionPolicy, useUiRole } from "@/lib/permissions/ui-policy"
import {
    ccrToContextItem,
    getCcrDiffById,
    getCcrReviewThreadsById,
    type ICcrDiffFile,
    type IReviewCommentThread,
    type ICcrRowData,
} from "@/pages/ccr-data"

type TReviewDecision = "approved" | "pending" | "rejected"
type TThreadMessagesMap = Readonly<Record<string, ReadonlyArray<IChatPanelMessage>>>
type TSafeGuardFilterId = "dedup" | "hallucination" | "severity"
type TSafeGuardStepStatus = "applied" | "filtered_out" | "passed"
type TReviewerFeedbackReason = "duplicate" | "false_positive" | "irrelevant"
type TReviewerFeedbackStatus = "accepted" | "rejected"
type TReviewHistoryWindow = "7d" | "30d" | "90d"

interface IReviewHistoryHeatEntry {
    readonly filePath: string
    readonly reviewsByWindow: Readonly<Record<TReviewHistoryWindow, number>>
}

interface IFileNeighborhoodDetails {
    readonly dependencies: ReadonlyArray<string>
    readonly recentChanges: ReadonlyArray<string>
}

type TReviewRiskLevel = "low" | "medium" | "high" | "critical"

interface IReviewRiskIndicator {
    readonly level: TReviewRiskLevel
    readonly reasons: ReadonlyArray<string>
    readonly score: number
}

interface ISafeGuardTraceStep {
    /** Идентификатор фильтра SafeGuard. */
    readonly filterId: TSafeGuardFilterId
    /** Результат прохождения фильтра. */
    readonly status: TSafeGuardStepStatus
    /** Объяснение принятого решения. */
    readonly reason: string
}

interface ISafeGuardTraceItem {
    /** Идентификатор trace-записи. */
    readonly id: string
    /** Итоговый статус замечания после SafeGuard pipeline. */
    readonly finalDecision: "hidden" | "shown"
    /** Файл, к которому относится замечание. */
    readonly filePath: string
    /** Причина скрытия замечания, если применимо. */
    readonly hiddenReason?: string
    /** Краткое содержание замечания. */
    readonly remark: string
    /** Шаги pipeline по фильтрам. */
    readonly steps: ReadonlyArray<ISafeGuardTraceStep>
}

interface IReviewerFeedbackRecord {
    /** Время отправки feedback. */
    readonly createdAt: string
    /** Детализированный outcome или причина отказа. */
    readonly details: string
    /** Идентификатор feedback события. */
    readonly id: string
    /** Связанный remark id, если feedback смержен как duplicate. */
    readonly linkedTraceId?: string
    /** Причина из quick action. */
    readonly reason: TReviewerFeedbackReason
    /** Статус применения feedback. */
    readonly status: TReviewerFeedbackStatus
    /** Trace item, к которому относится feedback. */
    readonly traceId: string
}

const SAFEGUARD_FILTER_SEQUENCE: ReadonlyArray<TSafeGuardFilterId> = [
    "dedup",
    "hallucination",
    "severity",
]

const SAFEGUARD_FILTER_LABELS: Readonly<Record<TSafeGuardFilterId, string>> = {
    dedup: "dedup",
    hallucination: "hallucination",
    severity: "severity",
}

const FEEDBACK_REASON_LABELS: Readonly<Record<TReviewerFeedbackReason, string>> = {
    duplicate: "duplicate",
    false_positive: "false positive",
    irrelevant: "irrelevant",
}

const FEEDBACK_REJECTION_REASONS: Readonly<Record<TReviewerFeedbackReason, string>> = {
    duplicate: "No canonical finding was eligible for merge in the current safety window.",
    false_positive: "Evidence bundle confirms the finding and blocks false-positive dismissal.",
    irrelevant: "Rule is mandatory for the active policy and cannot be ignored.",
}

/** Свойства страницы диффа CCR. */
export interface ICcrReviewDetailPageProps {
    /** Данные CCR, для которой рендерится review context. */
    readonly ccr: ICcrRowData
    /** API-контекст review workspace (опционально). */
    readonly workspaceContext?: ICcrWorkspaceContextResponse
    /** SSE источник для дополнительного стриминга по CCR. */
    readonly streamSourceUrl?: string
}

function buildExplainMessage(ccr: ICcrRowData): string {
    const fileHint =
        ccr.attachedFiles.length > 0 ? `Focus on ${ccr.attachedFiles[0]}` : "Focus on touched files"

    return `Please explain the current diff for ${ccr.id} in ${ccr.repository}. ${fileHint}.`
}

function buildSummaryMessage(ccr: ICcrRowData): string {
    return `Please summarize the key changes and risks in ${ccr.id}: ${ccr.title}.`
}

function buildAttachedFilesText(files: ReadonlyArray<string>): string {
    if (files.length === 0) {
        return "No attached files"
    }

    return files.join(", ")
}

function resolveDiffIssueCount(file: ICcrDiffFile): number {
    return file.lines.reduce((issueCount, line): number => {
        return issueCount + (line.comments?.length ?? 0)
    }, 0)
}

function resolveDiffChangedLineCount(file: ICcrDiffFile): number {
    return file.lines.reduce((changedLineCount, line): number => {
        if (line.type === "context") {
            return changedLineCount
        }
        return changedLineCount + 1
    }, 0)
}

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

function resolvePathDirectory(filePath: string): string {
    const separatorIndex = filePath.lastIndexOf("/")
    if (separatorIndex < 1) {
        return "root"
    }
    return filePath.slice(0, separatorIndex)
}

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
            .slice(0, 3)

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
            [file.filePath]: orderedNeighbors.slice(0, 4),
        }
    }, {})
}

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
                dependencies: dependencies.slice(0, 5),
                recentChanges,
            },
        }
    }, {})
}

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

function getSafeGuardStepStatusLabel(status: TSafeGuardStepStatus): string {
    if (status === "applied") {
        return "applied"
    }
    if (status === "filtered_out") {
        return "filtered out"
    }
    return "passed"
}

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

/** Страница страницы отдельного CCR review с авто-подставленным контекстом чата. */
export function CcrReviewDetailPage(props: ICcrReviewDetailPageProps): ReactElement {
    const { ccr } = props
    const activeUiRole = useUiRole()
    const [reviewDecision, setReviewDecision] = useState<TReviewDecision>("pending")
    const [activeFilePath, setActiveFilePath] = useState<string | undefined>(ccr.attachedFiles[0])
    const [isReviewContextMiniMapExpanded, setReviewContextMiniMapExpanded] =
        useState<boolean>(false)
    const [threads, setThreads] = useState<ReadonlyArray<IChatThread>>([
        {
            ccr: ccr.id.replace("ccr-", ""),
            id: `${ccr.id}-thread-main`,
            repo: ccr.repository,
            title: `${ccr.id} main review`,
        },
    ])
    const [activeThreadId, setActiveThreadId] = useState<string>(`${ccr.id}-thread-main`)
    const [messagesByThread, setMessagesByThread] = useState<TThreadMessagesMap>({})
    const [selectedFeedbackReason, setSelectedFeedbackReason] =
        useState<TReviewerFeedbackReason>("false_positive")
    const [selectedReviewHistoryWindow, setSelectedReviewHistoryWindow] =
        useState<TReviewHistoryWindow>("30d")
    const [isReviewHistoryHeatmapEnabled, setReviewHistoryHeatmapEnabled] = useState<boolean>(false)
    const [impactFocusStatus, setImpactFocusStatus] = useState<string>(
        "No blast radius focus applied yet.",
    )
    const [feedbackHistory, setFeedbackHistory] = useState<ReadonlyArray<IReviewerFeedbackRecord>>([
        {
            createdAt: "2026-03-03T10:42:00Z",
            details: "Feedback accepted and scheduled for continuous-learning update.",
            id: "FDBK-001",
            reason: "duplicate",
            status: "accepted",
            traceId: "SG-002",
            linkedTraceId: "SG-001",
        },
        {
            createdAt: "2026-03-03T09:18:00Z",
            details: "Rule is mandatory for the active policy and cannot be ignored.",
            id: "FDBK-002",
            reason: "irrelevant",
            status: "rejected",
            traceId: "SG-001",
        },
    ])
    const nextMessageId = useRef(0)
    const nextThreadId = useRef(1)
    const nextFeedbackId = useRef(3)
    const contextItem = useMemo((): IChatPanelContext => {
        return ccrToContextItem(ccr)
    }, [ccr])
    const ccrDiffFiles = useMemo((): ReadonlyArray<ICcrDiffFile> => {
        const contextDiffFiles = props.workspaceContext?.diffFiles
        if (contextDiffFiles !== undefined && props.workspaceContext?.reviewId === ccr.id) {
            return contextDiffFiles.map((file): ICcrDiffFile => {
                const typedFile: ICcrWorkspaceDiffFile = file

                return {
                    filePath: typedFile.filePath,
                    language: typedFile.language,
                    lines: typedFile.lines,
                }
            })
        }

        return getCcrDiffById(ccr.id)
    }, [ccr.id, props.workspaceContext?.diffFiles, props.workspaceContext?.reviewId])
    const ccrReviewThreads = useMemo((): ReadonlyArray<IReviewCommentThread> => {
        const contextThreads = props.workspaceContext?.threads
        if (contextThreads !== undefined && props.workspaceContext?.reviewId === ccr.id) {
            return contextThreads.map((thread): IReviewCommentThread => {
                const typedThread: ICcrWorkspaceReviewCommentThread = thread

                return {
                    author: typedThread.author,
                    createdAt: typedThread.createdAt,
                    feedback: typedThread.feedback,
                    id: typedThread.id,
                    isResolved: typedThread.isResolved,
                    message: typedThread.message,
                    replies: typedThread.replies,
                }
            })
        }

        return getCcrReviewThreadsById(ccr.id)
    }, [ccr.id, props.workspaceContext?.reviewId, props.workspaceContext?.threads])
    const codeReview = useCodeReview({
        reviewId: ccr.id,
    })
    const reviewContextTreemapFiles = useMemo((): ReadonlyArray<ICodeCityTreemapFileDescriptor> => {
        return buildReviewContextTreemapFiles(ccrDiffFiles, ccr.updatedAt)
    }, [ccr.updatedAt, ccrDiffFiles])
    const reviewContextFileIdByPath = useMemo((): Readonly<Record<string, string>> => {
        const mapping: Record<string, string> = {}
        reviewContextTreemapFiles.forEach((file): void => {
            mapping[file.path] = file.id
        })
        return mapping
    }, [reviewContextTreemapFiles])
    const reviewContextFilePathById = useMemo((): Readonly<Record<string, string>> => {
        const mapping: Record<string, string> = {}
        reviewContextTreemapFiles.forEach((file): void => {
            mapping[file.id] = file.path
        })
        return mapping
    }, [reviewContextTreemapFiles])
    const reviewContextHighlightedFileId = useMemo((): string | undefined => {
        if (activeFilePath === undefined) {
            return undefined
        }
        return reviewContextFileIdByPath[activeFilePath]
    }, [activeFilePath, reviewContextFileIdByPath])
    const reviewContextImpactedFiles =
        useMemo((): ReadonlyArray<ICodeCityTreemapImpactedFileDescriptor> => {
            return ccr.attachedFiles
                .map(
                    (
                        attachedFilePath,
                        attachedIndex,
                    ): ICodeCityTreemapImpactedFileDescriptor | undefined => {
                        const fileId = reviewContextFileIdByPath[attachedFilePath]
                        if (fileId === undefined) {
                            return undefined
                        }

                        if (attachedIndex === 0) {
                            return {
                                fileId,
                                impactType: "changed",
                            }
                        }
                        if (attachedIndex === 1) {
                            return {
                                fileId,
                                impactType: "impacted",
                            }
                        }
                        return {
                            fileId,
                            impactType: "ripple",
                        }
                    },
                )
                .filter(
                    (descriptor): descriptor is ICodeCityTreemapImpactedFileDescriptor =>
                        descriptor !== undefined,
                )
        }, [ccr.attachedFiles, reviewContextFileIdByPath])
    const reviewImpactSeeds = useMemo((): ReadonlyArray<IImpactAnalysisSeed> => {
        return buildReviewImpactSeeds(ccrDiffFiles, reviewContextFileIdByPath)
    }, [ccrDiffFiles, reviewContextFileIdByPath])
    const reviewNeighborhoodByPath = useMemo((): Readonly<
        Record<string, ReadonlyArray<string>>
    > => {
        return buildReviewNeighborhoodByPath(ccrDiffFiles)
    }, [ccrDiffFiles])
    const fileNeighborhoodDetailsByPath = useMemo((): Readonly<
        Record<string, IFileNeighborhoodDetails>
    > => {
        return buildFileNeighborhoodDetails(ccrDiffFiles)
    }, [ccrDiffFiles])
    const reviewHistoryHeatEntries = useMemo((): ReadonlyArray<IReviewHistoryHeatEntry> => {
        return buildReviewHistoryHeatEntries(ccrDiffFiles)
    }, [ccrDiffFiles])
    const maxReviewHistoryActivity = useMemo((): number => {
        return reviewHistoryHeatEntries.reduce((maxValue, entry): number => {
            return Math.max(maxValue, entry.reviewsByWindow[selectedReviewHistoryWindow])
        }, 0)
    }, [reviewHistoryHeatEntries, selectedReviewHistoryWindow])
    const reviewHistoryColorByFileId = useMemo((): Readonly<Record<string, string>> => {
        if (isReviewHistoryHeatmapEnabled === false) {
            return {}
        }

        return reviewHistoryHeatEntries.reduce((mapping, entry): Record<string, string> => {
            const fileId = reviewContextFileIdByPath[entry.filePath]
            if (fileId === undefined) {
                return mapping
            }
            return {
                ...mapping,
                [fileId]: resolveReviewHistoryHeatColor(
                    entry.reviewsByWindow[selectedReviewHistoryWindow],
                    maxReviewHistoryActivity,
                ),
            }
        }, {})
    }, [
        isReviewHistoryHeatmapEnabled,
        maxReviewHistoryActivity,
        reviewContextFileIdByPath,
        reviewHistoryHeatEntries,
        selectedReviewHistoryWindow,
    ])
    const hottestReviewHistoryEntries = useMemo((): ReadonlyArray<IReviewHistoryHeatEntry> => {
        return [...reviewHistoryHeatEntries]
            .sort((leftEntry, rightEntry): number => {
                return (
                    rightEntry.reviewsByWindow[selectedReviewHistoryWindow] -
                    leftEntry.reviewsByWindow[selectedReviewHistoryWindow]
                )
            })
            .slice(0, 4)
    }, [reviewHistoryHeatEntries, selectedReviewHistoryWindow])
    const reviewRiskIndicator = useMemo((): IReviewRiskIndicator => {
        return resolveReviewRiskIndicator(ccrDiffFiles, reviewHistoryHeatEntries, reviewImpactSeeds)
    }, [ccrDiffFiles, reviewHistoryHeatEntries, reviewImpactSeeds])
    const activeNeighborhoodFiles = useMemo((): ReadonlyArray<string> => {
        if (activeFilePath === undefined) {
            return []
        }
        return reviewNeighborhoodByPath[activeFilePath] ?? []
    }, [activeFilePath, reviewNeighborhoodByPath])
    const activeNeighborhoodDetails = useMemo((): IFileNeighborhoodDetails | undefined => {
        if (activeFilePath === undefined) {
            return undefined
        }
        return fileNeighborhoodDetailsByPath[activeFilePath]
    }, [activeFilePath, fileNeighborhoodDetailsByPath])
    const safeGuardTraceItems = useMemo((): ReadonlyArray<ISafeGuardTraceItem> => {
        return buildSafeGuardTraceItems(ccr)
    }, [ccr])
    const [activeSafeGuardTraceId, setActiveSafeGuardTraceId] = useState<string>("")
    const visibleDiffFiles = useMemo((): ReadonlyArray<ICcrDiffFile> => {
        if (activeFilePath === undefined) {
            return ccrDiffFiles
        }

        const focusedFiles = ccrDiffFiles.filter(
            (file): boolean => file.filePath === activeFilePath,
        )
        if (focusedFiles.length === 0) {
            return ccrDiffFiles
        }

        return focusedFiles
    }, [activeFilePath, ccrDiffFiles])
    const activeMessages =
        activeThreadId.length === 0 ? [] : (messagesByThread[activeThreadId] ?? [])
    const decisionBadge = mapReviewDecisionBadge(reviewDecision)
    const activeSafeGuardTraceItem = useMemo((): ISafeGuardTraceItem | undefined => {
        const selectedTrace = safeGuardTraceItems.find((item): boolean => {
            return item.id === activeSafeGuardTraceId
        })
        return selectedTrace ?? safeGuardTraceItems[0]
    }, [activeSafeGuardTraceId, safeGuardTraceItems])
    const filteredOutTraceCount = useMemo((): number => {
        return safeGuardTraceItems.filter((item): boolean => item.finalDecision === "hidden").length
    }, [safeGuardTraceItems])
    const visibleTraceCount = safeGuardTraceItems.length - filteredOutTraceCount
    const reviewDecisionPolicy = useMemo(() => {
        return getUiActionPolicy(activeUiRole, "review.decision")
    }, [activeUiRole])
    const reviewFinishPolicy = useMemo(() => {
        return getUiActionPolicy(activeUiRole, "review.finish")
    }, [activeUiRole])
    const activeTraceFeedbackHistory = useMemo((): ReadonlyArray<IReviewerFeedbackRecord> => {
        if (activeSafeGuardTraceItem === undefined) {
            return []
        }

        return feedbackHistory.filter((feedbackRecord): boolean => {
            return (
                feedbackRecord.traceId === activeSafeGuardTraceItem.id ||
                feedbackRecord.linkedTraceId === activeSafeGuardTraceItem.id
            )
        })
    }, [activeSafeGuardTraceItem, feedbackHistory])
    const latestActiveTraceFeedback = activeTraceFeedbackHistory[0]

    const quickActions = useMemo(
        (): ReadonlyArray<{
            readonly id: string
            readonly label: string
            readonly message: string
        }> => [
            {
                id: "explain-this-file",
                label: "explain this file",
                message: buildExplainMessage(ccr),
            },
            {
                id: "summarize-changes",
                label: "summarize changes",
                message: buildSummaryMessage(ccr),
            },
        ],
        [ccr],
    )

    const handleSendMessage = (message: string): void => {
        const normalizedMessage = message.trim()
        if (normalizedMessage.length === 0 || activeThreadId.length === 0) {
            return
        }

        nextMessageId.current += 1
        setMessagesByThread((previousValue): TThreadMessagesMap => {
            const currentThreadMessages = previousValue[activeThreadId] ?? []
            const nextMessage: IChatPanelMessage = {
                content: normalizedMessage,
                createdAt: new Date().toISOString(),
                id: `ccr-message-${String(nextMessageId.current)}`,
                role: "user",
                sender: "You",
            }

            return {
                ...previousValue,
                [activeThreadId]: [...currentThreadMessages, nextMessage],
            }
        })
    }

    const handleNewThread = (): void => {
        nextThreadId.current += 1
        const nextThreadIdValue = `${ccr.id}-thread-${String(nextThreadId.current)}`
        const nextThread: IChatThread = {
            ccr: ccr.id.replace("ccr-", ""),
            id: nextThreadIdValue,
            repo: ccr.repository,
            title: `Follow-up ${String(nextThreadId.current)}`,
        }

        setThreads((previous): ReadonlyArray<IChatThread> => [...previous, nextThread])
        setActiveThreadId(nextThreadIdValue)
    }

    const handleCloseThread = (threadId: string): void => {
        setThreads((previous): ReadonlyArray<IChatThread> => {
            const nextThreads = previous.filter((thread): boolean => thread.id !== threadId)
            if (activeThreadId === threadId) {
                setActiveThreadId(nextThreads[0]?.id ?? "")
            }

            return nextThreads
        })
    }

    const handleArchiveThread = (threadId: string): void => {
        setThreads(
            (previous): ReadonlyArray<IChatThread> =>
                previous.map((thread): IChatThread => {
                    if (thread.id !== threadId) {
                        return thread
                    }

                    return {
                        ...thread,
                        isArchived: true,
                        title: `${thread.title} (archived)`,
                    }
                }),
        )
    }

    const handleSubmitReviewerFeedback = (status: TReviewerFeedbackStatus): void => {
        if (activeSafeGuardTraceItem === undefined) {
            return
        }

        const linkedTraceId =
            selectedFeedbackReason === "duplicate"
                ? safeGuardTraceItems.find((traceItem): boolean => {
                      return (
                          traceItem.finalDecision === "shown" &&
                          traceItem.id !== activeSafeGuardTraceItem.id
                      )
                  })?.id
                : undefined

        const details =
            status === "accepted"
                ? linkedTraceId === undefined
                    ? "Feedback accepted and scheduled for continuous-learning update."
                    : `Feedback accepted and linked with ${linkedTraceId}.`
                : FEEDBACK_REJECTION_REASONS[selectedFeedbackReason]

        nextFeedbackId.current += 1
        const feedbackRecord: IReviewerFeedbackRecord = {
            createdAt: new Date().toISOString(),
            details,
            id: `FDBK-${String(nextFeedbackId.current).padStart(3, "0")}`,
            linkedTraceId,
            reason: selectedFeedbackReason,
            status,
            traceId: activeSafeGuardTraceItem.id,
        }

        setFeedbackHistory((previous): ReadonlyArray<IReviewerFeedbackRecord> => {
            return [feedbackRecord, ...previous]
        })
    }

    const handleReviewDecisionChange = (nextDecision: TReviewDecision): void => {
        if (reviewDecisionPolicy.visibility !== "enabled") {
            return
        }

        setReviewDecision(nextDecision)
    }
    const handleReviewContextMiniMapSelect = (fileId: string): void => {
        const selectedFilePath = reviewContextFilePathById[fileId]
        if (selectedFilePath === undefined) {
            return
        }
        setActiveFilePath(selectedFilePath)
    }
    const handleApplyImpactFocus = (selection: IImpactAnalysisSelection): void => {
        setImpactFocusStatus(
            `Focused impact: ${selection.label} · risk ${String(selection.riskScore)} · blast radius ${String(selection.affectedFiles.length)} files.`,
        )
        const firstAffectedFile = selection.affectedFiles[0]
        if (firstAffectedFile === undefined) {
            return
        }
        setActiveFilePath(firstAffectedFile)
    }

    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm text-muted-foreground">CCR review</p>
                            <h1 className="text-2xl font-semibold text-foreground">{ccr.title}</h1>
                            <p className="text-sm text-foreground">
                                {ccr.id} · {ccr.repository} · {ccr.team} · {ccr.status}
                            </p>
                            {codeReview.codeReviewQuery.data?.summary === undefined ? null : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {codeReview.codeReviewQuery.data.summary}
                                </p>
                            )}
                            {codeReview.codeReviewQuery.error === null ||
                            codeReview.codeReviewQuery.error === undefined ? null : (
                                <p className="mt-1 text-xs text-warning">
                                    Live review summary is unavailable, showing workspace fallback
                                    data.
                                </p>
                            )}
                            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                Review decision: {decisionBadge.label}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {reviewDecisionPolicy.visibility === "hidden" ? null : (
                                <>
                                    <Button
                                        color="success"
                                        isDisabled={reviewDecisionPolicy.visibility === "disabled"}
                                        onPress={(): void => {
                                            handleReviewDecisionChange("approved")
                                        }}
                                        size="sm"
                                        type="button"
                                        variant={reviewDecision === "approved" ? "solid" : "light"}
                                    >
                                        Approve review
                                    </Button>
                                    <Button
                                        color="danger"
                                        isDisabled={reviewDecisionPolicy.visibility === "disabled"}
                                        onPress={(): void => {
                                            handleReviewDecisionChange("rejected")
                                        }}
                                        size="sm"
                                        type="button"
                                        variant={reviewDecision === "rejected" ? "solid" : "light"}
                                    >
                                        Request changes
                                    </Button>
                                    <Button
                                        color="primary"
                                        isDisabled={reviewDecisionPolicy.visibility === "disabled"}
                                        onPress={(): void => {
                                            handleReviewDecisionChange("pending")
                                        }}
                                        size="sm"
                                        type="button"
                                        variant={reviewDecision === "pending" ? "solid" : "light"}
                                    >
                                        Save as in progress
                                    </Button>
                                </>
                            )}
                            {reviewFinishPolicy.visibility ===
                            "hidden" ? null : reviewFinishPolicy.visibility === "disabled" ? (
                                <p className="text-sm text-muted-foreground">
                                    Finish review unavailable:{" "}
                                    {reviewFinishPolicy.reason ?? "insufficient role permissions"}
                                </p>
                            ) : (
                                <StyledLink
                                    className="text-sm"
                                    to="/reviews"
                                >
                                    Finish review
                                </StyledLink>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="space-y-2">
                    {reviewDecisionPolicy.reason === undefined ||
                    reviewDecisionPolicy.visibility === "enabled" ? null : (
                        <Alert color="warning" title="Role-based restriction" variant="flat">
                            {reviewDecisionPolicy.reason}
                        </Alert>
                    )}
                    <p className="text-sm text-foreground">
                        <strong>Assignee:</strong> {ccr.assignee}
                    </p>
                    <p className="text-sm text-foreground">
                        <strong>Comments:</strong> {ccr.comments}
                    </p>
                    <p className="text-sm text-foreground">
                        <strong>Updated:</strong> {ccr.updatedAt}
                    </p>
                    <p className="text-sm text-foreground">
                        <strong>Attached files:</strong> {buildAttachedFilesText(ccr.attachedFiles)}
                    </p>
                </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_420px]">
                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">Files tree</p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            {ccrDiffFiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No diff files attached.
                                </p>
                            ) : (
                                ccrDiffFiles.map((file): ReactElement => {
                                    const isActive = file.filePath === activeFilePath
                                    return (
                                        <button
                                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                                                isActive
                                                    ? "border-primary/30 bg-primary/10 text-on-primary"
                                                    : "border-border bg-surface text-foreground"
                                            }`}
                                            key={file.filePath}
                                            onClick={(): void => {
                                                setActiveFilePath(file.filePath)
                                            }}
                                            type="button"
                                        >
                                            {file.filePath}
                                        </button>
                                    )
                                })
                            )}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex w-full flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                    Review context sidebar
                                </p>
                                <Button
                                    aria-expanded={isReviewContextMiniMapExpanded}
                                    aria-label={
                                        isReviewContextMiniMapExpanded
                                            ? "Collapse review context mini-map"
                                            : "Expand review context mini-map"
                                    }
                                    size="sm"
                                    type="button"
                                    variant="flat"
                                    onPress={(): void => {
                                        setReviewContextMiniMapExpanded(
                                            isReviewContextMiniMapExpanded === false,
                                        )
                                    }}
                                >
                                    {isReviewContextMiniMapExpanded ? "Collapse" : "Expand"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                CodeCity mini-map highlights CCR context and syncs with active diff
                                file.
                            </p>
                            <CodeCityTreemap
                                files={reviewContextTreemapFiles}
                                height={isReviewContextMiniMapExpanded ? "320px" : "180px"}
                                highlightedFileId={reviewContextHighlightedFileId}
                                impactedFiles={reviewContextImpactedFiles}
                                onFileSelect={handleReviewContextMiniMapSelect}
                                title={
                                    isReviewContextMiniMapExpanded
                                        ? "CCR context CodeCity map (expanded)"
                                        : "CCR context CodeCity mini-map"
                                }
                            />
                            <p
                                aria-label="Review context map status"
                                className="text-xs text-muted-foreground"
                            >
                                {isReviewContextMiniMapExpanded
                                    ? "Expanded CodeCity context map is active."
                                    : "Mini-map mode is active. Click expand for detailed context."}
                            </p>
                        </CardBody>
                    </Card>
                </aside>

                <div className="min-w-0 space-y-4">
                    <CodeDiffViewer files={visibleDiffFiles} />
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                CCR impact city view
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Full CodeCity view with highlighted CCR files, blast radius
                                controls, and neighborhood context for focused navigation.
                            </p>
                            <CodeCityTreemap
                                fileColorById={reviewHistoryColorByFileId}
                                files={reviewContextTreemapFiles}
                                height="420px"
                                highlightedFileId={reviewContextHighlightedFileId}
                                impactedFiles={reviewContextImpactedFiles}
                                onFileSelect={handleReviewContextMiniMapSelect}
                                title="CCR impact CodeCity view"
                            />
                            <div className="flex flex-wrap items-end gap-2">
                                <Button
                                    aria-label={
                                        isReviewHistoryHeatmapEnabled
                                            ? "Hide review history heatmap"
                                            : "Show review history heatmap"
                                    }
                                    size="sm"
                                    type="button"
                                    variant="flat"
                                    onPress={(): void => {
                                        setReviewHistoryHeatmapEnabled(
                                            isReviewHistoryHeatmapEnabled === false,
                                        )
                                    }}
                                >
                                    {isReviewHistoryHeatmapEnabled
                                        ? "Hide review history heatmap"
                                        : "Show review history heatmap"}
                                </Button>
                                <label
                                    className="text-xs text-foreground"
                                    htmlFor="review-history-window"
                                >
                                    Review history window
                                </label>
                                <select
                                    aria-label="Review history window"
                                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                                    id="review-history-window"
                                    value={selectedReviewHistoryWindow}
                                    onChange={(event): void => {
                                        const nextWindow = event.currentTarget.value
                                        if (
                                            nextWindow === "7d" ||
                                            nextWindow === "30d" ||
                                            nextWindow === "90d"
                                        ) {
                                            setSelectedReviewHistoryWindow(nextWindow)
                                        }
                                    }}
                                >
                                    <option value="7d">7d</option>
                                    <option value="30d">30d</option>
                                    <option value="90d">90d</option>
                                </select>
                            </div>
                            <Alert
                                color={isReviewHistoryHeatmapEnabled ? "success" : "primary"}
                                title="Review history heatmap"
                                variant="flat"
                            >
                                {isReviewHistoryHeatmapEnabled
                                    ? `Review history heatmap is enabled. Window ${selectedReviewHistoryWindow}.`
                                    : "Review history heatmap is disabled."}
                            </Alert>
                            <ul aria-label="Review history heatmap list" className="space-y-1">
                                {hottestReviewHistoryEntries.map(
                                    (entry): ReactElement => (
                                        <li
                                            className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
                                            key={`review-history-${entry.filePath}`}
                                        >
                                            <span className="font-semibold">{entry.filePath}</span>{" "}
                                            · reviews{" "}
                                            {String(
                                                entry.reviewsByWindow[selectedReviewHistoryWindow],
                                            )}
                                            {entry.filePath === activeFilePath ? " · focused" : ""}
                                        </li>
                                    ),
                                )}
                            </ul>
                            <ImpactAnalysisPanel
                                onApplyImpact={handleApplyImpactFocus}
                                seeds={reviewImpactSeeds}
                            />
                            <Alert color="primary" title="Blast radius status" variant="flat">
                                {impactFocusStatus}
                            </Alert>
                            <div className="rounded-lg border border-border bg-surface p-3">
                                <p className="text-sm font-semibold text-foreground">
                                    File neighborhood panel
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Focused file: {activeFilePath ?? "none selected"}
                                </p>
                                {activeNeighborhoodFiles.length === 0 ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        No neighboring files resolved for current selection.
                                    </p>
                                ) : (
                                    <ul
                                        aria-label="Active file neighborhood list"
                                        className="mt-2 space-y-1"
                                    >
                                        {activeNeighborhoodFiles.map(
                                            (filePath): ReactElement => (
                                                <li key={filePath}>
                                                    <button
                                                        aria-label={`Open neighborhood file ${filePath}`}
                                                        className="w-full rounded border border-border bg-surface px-2 py-1 text-left text-xs text-foreground hover:bg-surface-muted"
                                                        type="button"
                                                        onClick={(): void => {
                                                            setActiveFilePath(filePath)
                                                        }}
                                                    >
                                                        {filePath}
                                                    </button>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                                <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    <div className="rounded border border-border bg-surface p-2">
                                        <p className="text-xs font-semibold text-foreground">
                                            Dependencies
                                        </p>
                                        <ul
                                            aria-label="Neighborhood dependency list"
                                            className="mt-1 space-y-1 text-xs text-foreground"
                                        >
                                            {(activeNeighborhoodDetails?.dependencies.length ??
                                                0) === 0 ? (
                                                <li>none</li>
                                            ) : (
                                                activeNeighborhoodDetails?.dependencies.map(
                                                    (dependencyPath): ReactElement => (
                                                        <li key={`dependency-${dependencyPath}`}>
                                                            {dependencyPath}
                                                        </li>
                                                    ),
                                                )
                                            )}
                                        </ul>
                                    </div>
                                    <div className="rounded border border-border bg-surface p-2">
                                        <p className="text-xs font-semibold text-foreground">
                                            Recent changes
                                        </p>
                                        <ul
                                            aria-label="Neighborhood recent changes list"
                                            className="mt-1 space-y-1 text-xs text-foreground"
                                        >
                                            {(activeNeighborhoodDetails?.recentChanges.length ??
                                                0) === 0 ? (
                                                <li>none</li>
                                            ) : (
                                                activeNeighborhoodDetails?.recentChanges.map(
                                                    (changeRecord): ReactElement => (
                                                        <li key={`recent-change-${changeRecord}`}>
                                                            {changeRecord}
                                                        </li>
                                                    ),
                                                )
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                    {props.streamSourceUrl === undefined ? null : (
                        <SseStreamViewer
                            autoStart={false}
                            eventSourceUrl={props.streamSourceUrl}
                            title={`Live review stream · ${ccr.id}`}
                            maxReconnectAttempts={2}
                        />
                    )}
                    <ReviewCommentThread threads={ccrReviewThreads} />
                </div>

                <aside className="min-w-0 space-y-4">
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                Review risk indicator
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Chip
                                    aria-label={`Review risk level ${reviewRiskIndicator.level}`}
                                    color={mapReviewRiskChipColor(reviewRiskIndicator.level)}
                                    size="sm"
                                    variant="flat"
                                >
                                    {reviewRiskIndicator.level.toUpperCase()}
                                </Chip>
                                <p className="text-xs text-foreground">
                                    Risk score: {String(reviewRiskIndicator.score)}
                                </p>
                            </div>
                            <ul
                                aria-label="Review risk drivers list"
                                className="space-y-1 text-xs text-foreground"
                            >
                                {reviewRiskIndicator.reasons.map(
                                    (reason): ReactElement => (
                                        <li key={`risk-reason-${reason}`}>{reason}</li>
                                    ),
                                )}
                            </ul>
                        </CardBody>
                    </Card>
                    <Alert color={decisionBadge.color}>
                        Review status: <strong>{decisionBadge.label}</strong>. Use actions in the
                        header to finalize this CCR.
                    </Alert>
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                SafeGuard decision trace
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-sm text-foreground">
                                Applied filters:{" "}
                                {SAFEGUARD_FILTER_SEQUENCE.map((filter): string => {
                                    return SAFEGUARD_FILTER_LABELS[filter]
                                }).join(", ")}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Chip size="sm" variant="flat">
                                    Visible: {visibleTraceCount}
                                </Chip>
                                <Chip size="sm" variant="flat">
                                    Filtered out: {filteredOutTraceCount}
                                </Chip>
                            </div>
                            <ul aria-label="SafeGuard trace list" className="space-y-2">
                                {safeGuardTraceItems.map((traceItem): ReactElement => {
                                    const isActive = activeSafeGuardTraceItem?.id === traceItem.id
                                    return (
                                        <li key={traceItem.id}>
                                            <button
                                                aria-label={`Open trace for ${traceItem.id}`}
                                                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                                                    isActive
                                                        ? "border-primary/30 bg-primary/10 text-on-primary"
                                                        : "border-border bg-surface text-foreground hover:bg-surface"
                                                }`}
                                                type="button"
                                                onClick={(): void => {
                                                    setActiveSafeGuardTraceId(traceItem.id)
                                                }}
                                            >
                                                <p className="font-semibold">{traceItem.id}</p>
                                                <p className="truncate">{traceItem.remark}</p>
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    {traceItem.filePath}
                                                </p>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                            {activeSafeGuardTraceItem === undefined ? null : (
                                <div className="rounded-lg border border-border bg-surface p-3">
                                    <p className="text-sm font-semibold text-foreground">
                                        {activeSafeGuardTraceItem.id}:{" "}
                                        {activeSafeGuardTraceItem.remark}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Decision:{" "}
                                        {activeSafeGuardTraceItem.finalDecision === "shown"
                                            ? "shown"
                                            : "filtered out"}
                                    </p>
                                    {activeSafeGuardTraceItem.hiddenReason === undefined ? null : (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Hidden reason: {activeSafeGuardTraceItem.hiddenReason}
                                        </p>
                                    )}
                                    <ul
                                        aria-label="SafeGuard pipeline details"
                                        className="mt-2 space-y-2 text-xs text-foreground"
                                    >
                                        {activeSafeGuardTraceItem.steps.map(
                                            (step): ReactElement => (
                                                <li
                                                    className="rounded-md border border-border bg-surface p-2"
                                                    key={`${activeSafeGuardTraceItem.id}-${step.filterId}`}
                                                >
                                                    <p className="font-semibold">
                                                        {SAFEGUARD_FILTER_LABELS[step.filterId]} —{" "}
                                                        {getSafeGuardStepStatusLabel(step.status)}
                                                    </p>
                                                    <p>{step.reason}</p>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                Reviewer feedback learning loop
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-sm text-foreground">
                                Submit feedback in two clicks and track whether it was accepted or
                                rejected.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(["false_positive", "irrelevant", "duplicate"] as const).map(
                                    (reason): ReactElement => {
                                        const isSelected = selectedFeedbackReason === reason
                                        return (
                                            <Button
                                                key={reason}
                                                aria-label={`Quick action ${FEEDBACK_REASON_LABELS[reason]}`}
                                                size="sm"
                                                type="button"
                                                variant={isSelected ? "solid" : "flat"}
                                                onPress={(): void => {
                                                    setSelectedFeedbackReason(reason)
                                                }}
                                            >
                                                {FEEDBACK_REASON_LABELS[reason]}
                                            </Button>
                                        )
                                    },
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    aria-label="Accept feedback"
                                    color="success"
                                    size="sm"
                                    type="button"
                                    onPress={(): void => {
                                        handleSubmitReviewerFeedback("accepted")
                                    }}
                                >
                                    Accept feedback
                                </Button>
                                <Button
                                    aria-label="Reject feedback"
                                    color="danger"
                                    size="sm"
                                    type="button"
                                    onPress={(): void => {
                                        handleSubmitReviewerFeedback("rejected")
                                    }}
                                >
                                    Reject feedback
                                </Button>
                            </div>
                            {latestActiveTraceFeedback === undefined ? (
                                <Alert color="warning" title="No feedback yet" variant="flat">
                                    Select a reason and submit feedback for current SafeGuard trace.
                                </Alert>
                            ) : (
                                <div className="rounded-lg border border-border bg-surface p-3 text-xs text-foreground">
                                    <p>
                                        Feedback status:{" "}
                                        <strong>{latestActiveTraceFeedback.status}</strong>
                                    </p>
                                    <p>
                                        Latest reason:{" "}
                                        <strong>
                                            {
                                                FEEDBACK_REASON_LABELS[
                                                    latestActiveTraceFeedback.reason
                                                ]
                                            }
                                        </strong>
                                    </p>
                                    {latestActiveTraceFeedback.status === "rejected" ? (
                                        <p>Rejection reason: {latestActiveTraceFeedback.details}</p>
                                    ) : (
                                        <p>Applied outcome: {latestActiveTraceFeedback.details}</p>
                                    )}
                                    {latestActiveTraceFeedback.linkedTraceId ===
                                    undefined ? null : (
                                        <p>
                                            Linked to {latestActiveTraceFeedback.linkedTraceId}{" "}
                                            history.
                                        </p>
                                    )}
                                </div>
                            )}
                            <ul aria-label="Feedback history list" className="space-y-2">
                                {activeTraceFeedbackHistory.map(
                                    (feedbackRecord): ReactElement => (
                                        <li
                                            className="rounded-md border border-border bg-surface p-2 text-xs text-foreground"
                                            key={feedbackRecord.id}
                                        >
                                            <p className="font-semibold">
                                                {feedbackRecord.id} · {feedbackRecord.status}
                                            </p>
                                            <p>
                                                reason:{" "}
                                                {FEEDBACK_REASON_LABELS[feedbackRecord.reason]}
                                            </p>
                                            <p>
                                                time:{" "}
                                                {formatFeedbackTimestamp(feedbackRecord.createdAt)}
                                            </p>
                                            <p>{feedbackRecord.details}</p>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader>
                            <p className="text-sm font-semibold text-foreground">
                                Conversation threads
                            </p>
                        </CardHeader>
                        <CardBody className="p-0">
                            <ChatThreadList
                                activeThreadId={activeThreadId}
                                onArchiveThread={handleArchiveThread}
                                onCloseThread={handleCloseThread}
                                onNewThread={handleNewThread}
                                onSelectThread={setActiveThreadId}
                                threads={threads}
                            />
                        </CardBody>
                    </Card>
                    <ChatPanel
                        activeContextId={contextItem.id}
                        className="!static !inset-auto !z-auto !w-full !max-w-none !translate-x-0 !transform-none !border !border-border !shadow-none"
                        contextItems={[contextItem]}
                        emptyStateText={`Ask anything about ${ccr.id} diff. Quick actions are available below.`}
                        inputAriaLabel="Type a review question"
                        isOpen
                        maxMessageLength={2500}
                        messageListAriaLabel={`${ccr.id} chat messages`}
                        messages={activeMessages}
                        onSendMessage={handleSendMessage}
                        panelAriaLabel={`Conversation for ${ccr.id}`}
                        placeholder={`Ask about ${ccr.id} changes...`}
                        quickActions={quickActions}
                        title={`Conversation · ${ccr.id}`}
                    />
                </aside>
            </div>
        </section>
    )
}
