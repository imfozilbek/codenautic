import { useMemo, useRef, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
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
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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

import type {
    IFileNeighborhoodDetails,
    IReviewerFeedbackRecord,
    IReviewHistoryHeatEntry,
    IReviewRiskIndicator,
    ISafeGuardTraceItem,
    TReviewDecision,
    TReviewerFeedbackReason,
    TReviewerFeedbackStatus,
    TReviewHistoryWindow,
    TSafeGuardFilterId,
    TSafeGuardStepStatus,
    TThreadMessagesMap,
} from "./ccr-review-detail/ccr-review-detail.types"
import {
    FEEDBACK_REJECTION_REASONS,
    SAFEGUARD_FILTER_SEQUENCE,
} from "./ccr-review-detail/ccr-review-detail.constants"
import {
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
    resolveReviewHistoryHeatColor,
    resolveReviewRiskIndicator,
} from "./ccr-review-detail/ccr-review-detail.utils"

/** Свойства страницы диффа CCR. */
export interface ICcrReviewDetailPageProps {
    /** Данные CCR, для которой рендерится review context. */
    readonly ccr: ICcrRowData
    /** API-контекст review workspace (опционально). */
    readonly workspaceContext?: ICcrWorkspaceContextResponse
    /** SSE источник для дополнительного стриминга по CCR. */
    readonly streamSourceUrl?: string
}

/**
 * Максимум отображаемых hottest записей истории review.
 */
const MAX_HOTTEST_REVIEW_HISTORY_ENTRIES = 4

/** Страница страницы отдельного CCR review с авто-подставленным контекстом чата. */
export function CcrReviewDetailPage(props: ICcrReviewDetailPageProps): ReactElement {
    const { ccr } = props
    const { t } = useTranslation(["reviews"])
    const { td } = useDynamicTranslation(["reviews"])
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
    const [impactFocusStatus, setImpactFocusStatus] = useState<string>("")
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
            .slice(0, MAX_HOTTEST_REVIEW_HISTORY_ENTRIES)
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

    const translatedDecisionLabels = useMemo(
        (): Readonly<Record<TReviewDecision, string>> => ({
            approved: t("reviews:detail.decisionApproved"),
            pending: t("reviews:detail.decisionInProgress"),
            rejected: t("reviews:detail.decisionRequestChanges"),
        }),
        [t],
    )
    const translatedSafeGuardStepLabels = useMemo(
        (): Readonly<Record<TSafeGuardStepStatus, string>> => ({
            applied: t("reviews:detail.stepApplied"),
            filtered_out: t("reviews:detail.stepFilteredOut"),
            passed: t("reviews:detail.stepPassed"),
        }),
        [t],
    )
    const translatedFilterLabels = useMemo(
        (): Readonly<Record<TSafeGuardFilterId, string>> => ({
            dedup: t("reviews:detail.filterDedup"),
            hallucination: t("reviews:detail.filterHallucination"),
            severity: t("reviews:detail.filterSeverity"),
        }),
        [t],
    )
    const translatedFeedbackReasonLabels = useMemo(
        (): Readonly<Record<TReviewerFeedbackReason, string>> => ({
            duplicate: t("reviews:detail.reasonDuplicate"),
            false_positive: t("reviews:detail.reasonFalsePositive"),
            irrelevant: t("reviews:detail.reasonIrrelevant"),
        }),
        [t],
    )

    const quickActions = useMemo(
        (): ReadonlyArray<{
            readonly id: string
            readonly label: string
            readonly message: string
        }> => [
            {
                id: "explain-this-file",
                label: t("reviews:detail.quickActionExplainFile"),
                message: buildExplainMessage(ccr),
            },
            {
                id: "summarize-changes",
                label: t("reviews:detail.quickActionSummarizeChanges"),
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
                            <p className="text-sm text-muted-foreground">
                                {t("reviews:detail.ccrReview")}
                            </p>
                            <h1 className={TYPOGRAPHY.pageTitle}>{ccr.title}</h1>
                            <p className={TYPOGRAPHY.body}>
                                {ccr.id} · {ccr.repository} · {ccr.team} · {ccr.status}
                            </p>
                            {codeReview.codeReviewQuery.data?.summary === undefined ? null : (
                                <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                    {codeReview.codeReviewQuery.data.summary}
                                </p>
                            )}
                            {codeReview.codeReviewQuery.error === null ||
                            codeReview.codeReviewQuery.error === undefined ? null : (
                                <p className="mt-1 text-xs text-warning">
                                    {t("reviews:detail.liveReviewUnavailable")}
                                </p>
                            )}
                            <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                                {t("reviews:detail.reviewDecisionLabel")}{" "}
                                {translatedDecisionLabels[reviewDecision]}
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
                                        {t("reviews:detail.approveReview")}
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
                                        {t("reviews:detail.requestChanges")}
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
                                        {t("reviews:detail.saveAsInProgress")}
                                    </Button>
                                </>
                            )}
                            {reviewFinishPolicy.visibility ===
                            "hidden" ? null : reviewFinishPolicy.visibility === "disabled" ? (
                                <p className="text-sm text-muted-foreground">
                                    {t("reviews:detail.finishReviewUnavailable")}{" "}
                                    {reviewFinishPolicy.reason ??
                                        t("reviews:detail.insufficientRolePermissions")}
                                </p>
                            ) : (
                                <StyledLink className="text-sm" to="/reviews">
                                    {t("reviews:detail.finishReview")}
                                </StyledLink>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="space-y-2">
                    {reviewDecisionPolicy.reason === undefined ||
                    reviewDecisionPolicy.visibility === "enabled" ? null : (
                        <Alert
                            color="warning"
                            title={t("reviews:detail.roleBasedRestriction")}
                            variant="flat"
                        >
                            {reviewDecisionPolicy.reason}
                        </Alert>
                    )}
                    <p className={TYPOGRAPHY.body}>
                        <strong>{t("reviews:detail.assignee")}</strong> {ccr.assignee}
                    </p>
                    <p className={TYPOGRAPHY.body}>
                        <strong>{t("reviews:detail.comments")}</strong> {ccr.comments}
                    </p>
                    <p className={TYPOGRAPHY.body}>
                        <strong>{t("reviews:detail.updated")}</strong> {ccr.updatedAt}
                    </p>
                    <p className={TYPOGRAPHY.body}>
                        <strong>{t("reviews:detail.attachedFiles")}</strong>{" "}
                        {ccr.attachedFiles.length === 0
                            ? t("reviews:detail.noAttachedFiles")
                            : ccr.attachedFiles.join(", ")}
                    </p>
                </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_420px]">
                <aside className="space-y-4">
                    <Card>
                        <CardHeader>
                            <p className={TYPOGRAPHY.cardTitle}>{t("reviews:detail.filesTree")}</p>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            {ccrDiffFiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t("reviews:detail.noDiffFiles")}
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
                                <p className={TYPOGRAPHY.cardTitle}>
                                    {t("reviews:detail.reviewContextSidebar")}
                                </p>
                                <Button
                                    aria-expanded={isReviewContextMiniMapExpanded}
                                    aria-label={
                                        isReviewContextMiniMapExpanded
                                            ? t("reviews:detail.collapseReviewContextMiniMap")
                                            : t("reviews:detail.expandReviewContextMiniMap")
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
                                    {isReviewContextMiniMapExpanded
                                        ? t("reviews:detail.collapse")
                                        : t("reviews:detail.expand")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className={TYPOGRAPHY.captionMuted}>
                                {t("reviews:detail.codeCityMiniMapHint")}
                            </p>
                            <CodeCityTreemap
                                files={reviewContextTreemapFiles}
                                height={isReviewContextMiniMapExpanded ? "320px" : "180px"}
                                highlightedFileId={reviewContextHighlightedFileId}
                                impactedFiles={reviewContextImpactedFiles}
                                onFileSelect={handleReviewContextMiniMapSelect}
                                title={
                                    isReviewContextMiniMapExpanded
                                        ? t("reviews:detail.codeCityMapExpanded")
                                        : t("reviews:detail.codeCityMiniMap")
                                }
                            />
                            <p
                                aria-label={t("reviews:ariaLabel.detail.reviewContextMapStatus")}
                                className={TYPOGRAPHY.captionMuted}
                            >
                                {isReviewContextMiniMapExpanded
                                    ? t("reviews:detail.expandedMapActive")
                                    : t("reviews:detail.miniMapActive")}
                            </p>
                        </CardBody>
                    </Card>
                </aside>

                <div className="min-w-0 space-y-4">
                    <CodeDiffViewer files={visibleDiffFiles} />
                    <Card>
                        <CardHeader>
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("reviews:detail.ccrImpactCityView")}
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className={TYPOGRAPHY.captionMuted}>
                                {t("reviews:detail.ccrImpactCityViewHint")}
                            </p>
                            <CodeCityTreemap
                                fileColorById={reviewHistoryColorByFileId}
                                files={reviewContextTreemapFiles}
                                height="420px"
                                highlightedFileId={reviewContextHighlightedFileId}
                                impactedFiles={reviewContextImpactedFiles}
                                onFileSelect={handleReviewContextMiniMapSelect}
                                title={t("reviews:detail.ccrImpactCodeCityView")}
                            />
                            <div className="flex flex-wrap items-end gap-2">
                                <Button
                                    aria-label={
                                        isReviewHistoryHeatmapEnabled
                                            ? t("reviews:detail.hideReviewHistoryHeatmap")
                                            : t("reviews:detail.showReviewHistoryHeatmap")
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
                                        ? t("reviews:detail.hideReviewHistoryHeatmap")
                                        : t("reviews:detail.showReviewHistoryHeatmap")}
                                </Button>
                                <label
                                    className="text-xs text-foreground"
                                    htmlFor="review-history-window"
                                >
                                    {t("reviews:detail.reviewHistoryWindow")}
                                </label>
                                <select
                                    aria-label={t("reviews:detail.reviewHistoryWindow")}
                                    className={NATIVE_FORM.select}
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
                                title={t("reviews:detail.reviewHistoryHeatmapTitle")}
                                variant="flat"
                            >
                                {isReviewHistoryHeatmapEnabled
                                    ? t("reviews:detail.heatmapEnabled", {
                                          window: selectedReviewHistoryWindow,
                                      })
                                    : t("reviews:detail.heatmapDisabled")}
                            </Alert>
                            <ul
                                aria-label={t("reviews:ariaLabel.detail.reviewHistoryHeatmapList")}
                                className="space-y-1"
                            >
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
                                            {entry.filePath === activeFilePath
                                                ? ` ${t("reviews:detail.focused")}`
                                                : ""}
                                        </li>
                                    ),
                                )}
                            </ul>
                            <ImpactAnalysisPanel
                                onApplyImpact={handleApplyImpactFocus}
                                seeds={reviewImpactSeeds}
                            />
                            <Alert
                                color="primary"
                                title={t("reviews:detail.blastRadiusStatus")}
                                variant="flat"
                            >
                                {impactFocusStatus.length === 0
                                    ? t("reviews:detail.noBlastRadiusFocus")
                                    : impactFocusStatus}
                            </Alert>
                            <div className="rounded-lg border border-border bg-surface p-3">
                                <p className={TYPOGRAPHY.cardTitle}>
                                    {t("reviews:detail.fileNeighborhoodPanel")}
                                </p>
                                <p className={TYPOGRAPHY.captionMuted}>
                                    {t("reviews:detail.focusedFile")}{" "}
                                    {activeFilePath ?? t("reviews:detail.noneSelected")}
                                </p>
                                {activeNeighborhoodFiles.length === 0 ? (
                                    <p className={`mt-2 ${TYPOGRAPHY.captionMuted}`}>
                                        {t("reviews:detail.noNeighboringFiles")}
                                    </p>
                                ) : (
                                    <ul
                                        aria-label={t(
                                            "reviews:ariaLabel.detail.activeFileNeighborhoodList",
                                        )}
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
                                            {t("reviews:detail.dependencies")}
                                        </p>
                                        <ul
                                            aria-label={t(
                                                "reviews:ariaLabel.detail.neighborhoodDependencyList",
                                            )}
                                            className="mt-1 space-y-1 text-xs text-foreground"
                                        >
                                            {(activeNeighborhoodDetails?.dependencies.length ??
                                                0) === 0 ? (
                                                <li>{t("reviews:detail.none")}</li>
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
                                            {t("reviews:detail.recentChanges")}
                                        </p>
                                        <ul
                                            aria-label={t(
                                                "reviews:ariaLabel.detail.neighborhoodRecentChangesList",
                                            )}
                                            className="mt-1 space-y-1 text-xs text-foreground"
                                        >
                                            {(activeNeighborhoodDetails?.recentChanges.length ??
                                                0) === 0 ? (
                                                <li>{t("reviews:detail.none")}</li>
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
                            title={`${t("reviews:detail.liveReviewStreamTitle")} · ${ccr.id}`}
                            maxReconnectAttempts={2}
                        />
                    )}
                    <ReviewCommentThread threads={ccrReviewThreads} />
                </div>

                <aside className="min-w-0 space-y-4">
                    <Card>
                        <CardHeader>
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("reviews:detail.reviewRiskIndicator")}
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
                                    {t("reviews:detail.riskScore")}{" "}
                                    {String(reviewRiskIndicator.score)}
                                </p>
                            </div>
                            <ul
                                aria-label={t("reviews:ariaLabel.detail.reviewRiskDriversList")}
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
                        {t("reviews:detail.reviewStatusMessage")}{" "}
                        <strong>{translatedDecisionLabels[reviewDecision]}</strong>.{" "}
                        {t("reviews:detail.reviewStatusHint")}
                    </Alert>
                    <Card>
                        <CardHeader>
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("reviews:detail.safeGuardDecisionTrace")}
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className={TYPOGRAPHY.body}>
                                {t("reviews:detail.appliedFilters")}{" "}
                                {SAFEGUARD_FILTER_SEQUENCE.map((filter): string => {
                                    return translatedFilterLabels[filter]
                                }).join(", ")}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Chip size="sm" variant="flat">
                                    {t("reviews:detail.visible")} {visibleTraceCount}
                                </Chip>
                                <Chip size="sm" variant="flat">
                                    {t("reviews:detail.filteredOut")} {filteredOutTraceCount}
                                </Chip>
                            </div>
                            <ul
                                aria-label={t("reviews:ariaLabel.detail.safeGuardTraceList")}
                                className="space-y-2"
                            >
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
                                    <p className={TYPOGRAPHY.cardTitle}>
                                        {activeSafeGuardTraceItem.id}:{" "}
                                        {activeSafeGuardTraceItem.remark}
                                    </p>
                                    <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                        {t("reviews:detail.decisionLabel")}{" "}
                                        {activeSafeGuardTraceItem.finalDecision === "shown"
                                            ? t("reviews:detail.decisionShown")
                                            : t("reviews:detail.decisionFilteredOut")}
                                    </p>
                                    {activeSafeGuardTraceItem.hiddenReason === undefined ? null : (
                                        <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                                            {t("reviews:detail.hiddenReason")}{" "}
                                            {activeSafeGuardTraceItem.hiddenReason}
                                        </p>
                                    )}
                                    <ul
                                        aria-label={t(
                                            "reviews:ariaLabel.detail.safeGuardPipelineDetails",
                                        )}
                                        className="mt-2 space-y-2 text-xs text-foreground"
                                    >
                                        {activeSafeGuardTraceItem.steps.map(
                                            (step): ReactElement => (
                                                <li
                                                    className="rounded-md border border-border bg-surface p-2"
                                                    key={`${activeSafeGuardTraceItem.id}-${step.filterId}`}
                                                >
                                                    <p className="font-semibold">
                                                        {translatedFilterLabels[step.filterId]} —{" "}
                                                        {translatedSafeGuardStepLabels[step.status]}
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
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("reviews:detail.reviewerFeedbackLearningLoop")}
                            </p>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <p className="text-sm text-foreground">
                                {t("reviews:detail.feedbackHint")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(["false_positive", "irrelevant", "duplicate"] as const).map(
                                    (reason): ReactElement => {
                                        const isSelected = selectedFeedbackReason === reason
                                        return (
                                            <Button
                                                key={reason}
                                                aria-label={td(
                                                    "reviews:detail.quickActionAriaLabel",
                                                    {
                                                        reason: translatedFeedbackReasonLabels[
                                                            reason
                                                        ],
                                                    },
                                                )}
                                                size="sm"
                                                type="button"
                                                color="primary"
                                                variant={isSelected ? "solid" : "flat"}
                                                onPress={(): void => {
                                                    setSelectedFeedbackReason(reason)
                                                }}
                                            >
                                                {translatedFeedbackReasonLabels[reason]}
                                            </Button>
                                        )
                                    },
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    aria-label={t("reviews:detail.acceptFeedback")}
                                    color="success"
                                    size="sm"
                                    type="button"
                                    onPress={(): void => {
                                        handleSubmitReviewerFeedback("accepted")
                                    }}
                                >
                                    {t("reviews:detail.acceptFeedback")}
                                </Button>
                                <Button
                                    aria-label={t("reviews:detail.rejectFeedback")}
                                    color="danger"
                                    size="sm"
                                    type="button"
                                    onPress={(): void => {
                                        handleSubmitReviewerFeedback("rejected")
                                    }}
                                >
                                    {t("reviews:detail.rejectFeedback")}
                                </Button>
                            </div>
                            {latestActiveTraceFeedback === undefined ? (
                                <Alert
                                    color="warning"
                                    title={t("reviews:detail.noFeedbackYetTitle")}
                                    variant="flat"
                                >
                                    {t("reviews:detail.noFeedbackYetHint")}
                                </Alert>
                            ) : (
                                <div className="rounded-lg border border-border bg-surface p-3 text-xs text-foreground">
                                    <p>
                                        {t("reviews:detail.feedbackStatusLabel")}{" "}
                                        <strong>{latestActiveTraceFeedback.status}</strong>
                                    </p>
                                    <p>
                                        {t("reviews:detail.latestReasonLabel")}{" "}
                                        <strong>
                                            {
                                                translatedFeedbackReasonLabels[
                                                    latestActiveTraceFeedback.reason
                                                ]
                                            }
                                        </strong>
                                    </p>
                                    {latestActiveTraceFeedback.status === "rejected" ? (
                                        <p>
                                            {t("reviews:detail.rejectionReasonLabel")}{" "}
                                            {latestActiveTraceFeedback.details}
                                        </p>
                                    ) : (
                                        <p>
                                            {t("reviews:detail.appliedOutcomeLabel")}{" "}
                                            {latestActiveTraceFeedback.details}
                                        </p>
                                    )}
                                    {latestActiveTraceFeedback.linkedTraceId ===
                                    undefined ? null : (
                                        <p>
                                            {t("reviews:detail.linkedTo", {
                                                traceId: latestActiveTraceFeedback.linkedTraceId,
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                            <ul
                                aria-label={t("reviews:ariaLabel.detail.feedbackHistoryList")}
                                className="space-y-2"
                            >
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
                                                {t("reviews:detail.feedbackReasonLabel")}{" "}
                                                {
                                                    translatedFeedbackReasonLabels[
                                                        feedbackRecord.reason
                                                    ]
                                                }
                                            </p>
                                            <p>
                                                {t("reviews:detail.feedbackTimeLabel")}{" "}
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
                            <p className={TYPOGRAPHY.cardTitle}>
                                {t("reviews:detail.conversationThreads")}
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
                        emptyStateText={t("reviews:detail.chatEmptyState", { ccrId: ccr.id })}
                        inputAriaLabel={t("reviews:detail.chatInputAriaLabel")}
                        isOpen
                        maxMessageLength={2500}
                        messageListAriaLabel={td("reviews:detail.chatMessagesAriaLabel", {
                            ccrId: ccr.id,
                        })}
                        messages={activeMessages}
                        onSendMessage={handleSendMessage}
                        panelAriaLabel={t("reviews:detail.chatPanelAriaLabel", { ccrId: ccr.id })}
                        placeholder={t("reviews:detail.chatPlaceholder", { ccrId: ccr.id })}
                        quickActions={quickActions}
                        title={`${t("reviews:detail.chatTitle")} · ${ccr.id}`}
                    />
                </aside>
            </div>
        </section>
    )
}
