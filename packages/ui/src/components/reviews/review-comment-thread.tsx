import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { TYPOGRAPHY } from "@/lib/constants/typography"
import type { IReviewCommentThread, TReviewCommentFeedback } from "@/pages/ccr-data"

interface IReviewCommentThreadProps {
    /** Набор root-комментариев. */
    readonly threads: ReadonlyArray<IReviewCommentThread>
}

interface IReviewCommentNodeProps {
    readonly comment: IReviewCommentThread
    readonly depth: number
    readonly onAddReply: (commentId: string, message: string) => void
    readonly onToggleResolve: (commentId: string) => void
    readonly onSetFeedback: (commentId: string, next: TReviewCommentFeedback | undefined) => void
}

function mapCommentTree(
    comments: ReadonlyArray<IReviewCommentThread>,
    commentId: string,
    mutate: (comment: IReviewCommentThread) => IReviewCommentThread,
): ReadonlyArray<IReviewCommentThread> {
    let changed = false

    const nextComments = comments.map((comment): IReviewCommentThread => {
        if (comment.id === commentId) {
            changed = true
            return mutate(comment)
        }

        if (comment.replies.length === 0) {
            return comment
        }

        const nextReplies = mapCommentTree(comment.replies, commentId, mutate)
        if (nextReplies === comment.replies) {
            return comment
        }

        changed = true

        return {
            ...comment,
            replies: nextReplies,
        }
    })

    return changed ? nextComments : comments
}

function createReply(id: string, author: string, message: string): IReviewCommentThread {
    return {
        author,
        createdAt: "Now",
        id,
        isResolved: false,
        message,
        replies: [],
    }
}

function ReviewCommentNode(props: IReviewCommentNodeProps): ReactElement {
    const { t } = useTranslation(["reviews"])
    const [replyText, setReplyText] = useState("")
    const [isReplyOpen, setIsReplyOpen] = useState(false)

    const resolveButtonLabel = useMemo(
        () =>
            props.comment.isResolved
                ? t("reviews:commentThread.markUnresolved")
                : t("reviews:commentThread.resolve"),
        [props.comment.isResolved, t],
    )
    const isLiked = props.comment.feedback === "like"
    const isDisliked = props.comment.feedback === "dislike"
    const leftPadding = `${props.depth * 20}px`

    const toggleResolve = (): void => {
        props.onToggleResolve(props.comment.id)
    }

    const addReply = (): void => {
        const message = replyText.trim()
        if (message.length === 0) {
            return
        }

        props.onAddReply(props.comment.id, message)
        setReplyText("")
        setIsReplyOpen(false)
    }

    const toggleLike = (): void => {
        props.onSetFeedback(props.comment.id, isLiked ? undefined : "like")
    }

    const toggleDislike = (): void => {
        props.onSetFeedback(props.comment.id, isDisliked ? undefined : "dislike")
    }

    return (
        <li className="space-y-2" style={{ paddingLeft: leftPadding }}>
            <article className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className={TYPOGRAPHY.cardTitle}>
                            {props.comment.author}
                        </p>
                        <p className={TYPOGRAPHY.captionMuted}>{props.comment.createdAt}</p>
                    </div>
                    {props.comment.isResolved ? (
                        <span className="rounded border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                            {t("reviews:commentThread.resolved")}
                        </span>
                    ) : null}
                </div>
                <p className="mt-2 text-sm text-foreground">{props.comment.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        onClick={toggleResolve}
                        aria-label={resolveButtonLabel}
                    >
                        {resolveButtonLabel}
                    </button>
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        aria-label={t("reviews:commentThread.likeAriaLabel", { author: props.comment.author })}
                        onClick={toggleLike}
                    >
                        {isLiked ? t("reviews:commentThread.liked") : t("reviews:commentThread.like")}
                    </button>
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        aria-label={t("reviews:commentThread.dislikeAriaLabel", { author: props.comment.author })}
                        onClick={toggleDislike}
                    >
                        {isDisliked ? t("reviews:commentThread.disliked") : t("reviews:commentThread.dislike")}
                    </button>
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        aria-label={t("reviews:commentThread.replyAriaLabel", { author: props.comment.author })}
                        onClick={(): void => {
                            setIsReplyOpen((previousValue): boolean => !previousValue)
                        }}
                    >
                        {t("reviews:commentThread.reply")}
                    </button>
                </div>
                {isReplyOpen ? (
                    <div className="mt-3 space-y-2">
                        <textarea
                            aria-label={t("reviews:commentThread.replyTextareaAriaLabel", { author: props.comment.author })}
                            className="min-h-16 w-full rounded border border-border px-2 py-1 text-sm"
                            value={replyText}
                            onChange={(event): void => {
                                setReplyText(event.currentTarget.value)
                            }}
                        />
                        <button
                            className="rounded bg-foreground px-3 py-1.5 text-xs text-background"
                            type="button"
                            onClick={addReply}
                        >
                            {t("reviews:commentThread.addReply")}
                        </button>
                    </div>
                ) : null}
            </article>
            {props.comment.replies.length === 0 ? null : (
                <ul className="mt-2 space-y-2">
                    {props.comment.replies.map(
                        (reply): ReactElement => (
                            <ReviewCommentNode
                                comment={reply}
                                depth={props.depth + 1}
                                onAddReply={props.onAddReply}
                                onSetFeedback={props.onSetFeedback}
                                onToggleResolve={props.onToggleResolve}
                                key={reply.id}
                            />
                        ),
                    )}
                </ul>
            )}
        </li>
    )
}

/** Компонент review thread с вложенными ответами и действиями. */
export function ReviewCommentThread(props: IReviewCommentThreadProps): ReactElement {
    const { t } = useTranslation(["reviews"])
    const [threads, setThreads] = useState<ReadonlyArray<IReviewCommentThread>>(props.threads)
    const replyIdCounter = useRef(0)

    useEffect((): void => {
        setThreads(props.threads)
    }, [props.threads])

    const handleToggleResolve = (commentId: string): void => {
        setThreads((previous): ReadonlyArray<IReviewCommentThread> => {
            return mapCommentTree(previous, commentId, (comment): IReviewCommentThread => {
                return {
                    ...comment,
                    isResolved: !comment.isResolved,
                }
            })
        })
    }

    const handleSetFeedback = (
        commentId: string,
        next: TReviewCommentFeedback | undefined,
    ): void => {
        setThreads((previous): ReadonlyArray<IReviewCommentThread> => {
            return mapCommentTree(previous, commentId, (comment): IReviewCommentThread => {
                return {
                    ...comment,
                    feedback: next,
                }
            })
        })
    }

    const handleAddReply = (commentId: string, message: string): void => {
        replyIdCounter.current += 1
        const reply = createReply(`reply-${String(replyIdCounter.current)}`, "You", message)

        setThreads((previous): ReadonlyArray<IReviewCommentThread> => {
            return mapCommentTree(previous, commentId, (comment): IReviewCommentThread => {
                return {
                    ...comment,
                    replies: [...comment.replies, reply],
                }
            })
        })
    }

    if (props.threads.length === 0) {
        return (
            <section className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
                {t("reviews:commentThread.noCommentsYet")}
            </section>
        )
    }

    if (threads.length === 0) {
        return (
            <section className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
                {t("reviews:commentThread.noComments")}
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{t("reviews:commentThread.sectionTitle")}</h2>
            <ul className="space-y-3">
                {threads.map(
                    (thread): ReactElement => (
                        <ReviewCommentNode
                            comment={thread}
                            depth={0}
                            onAddReply={handleAddReply}
                            onSetFeedback={handleSetFeedback}
                            onToggleResolve={handleToggleResolve}
                            key={thread.id}
                        />
                    ),
                )}
            </ul>
        </section>
    )
}
