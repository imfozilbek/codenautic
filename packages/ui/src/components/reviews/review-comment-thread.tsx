import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"

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

function buildActionLabel(comment: IReviewCommentThread, action: "resolved" | "reply"): string {
    if (action === "resolved") {
        return comment.isResolved ? "Mark unresolved" : "Resolve"
    }

    return "Reply"
}

function ReviewCommentNode(props: IReviewCommentNodeProps): ReactElement {
    const [replyText, setReplyText] = useState("")
    const [isReplyOpen, setIsReplyOpen] = useState(false)

    const resolveButtonLabel = useMemo(
        () => buildActionLabel(props.comment, "resolved"),
        [props.comment.isResolved],
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
            <article className="rounded-lg border border-border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {props.comment.author}
                        </p>
                        <p className="text-xs text-muted-foreground">{props.comment.createdAt}</p>
                    </div>
                    {props.comment.isResolved ? (
                        <span className="rounded border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                            Resolved
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
                        aria-label={`Like comment from ${props.comment.author}`}
                        onClick={toggleLike}
                    >
                        {isLiked ? "👍 Liked" : "👍 Like"}
                    </button>
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        aria-label={`Dislike comment from ${props.comment.author}`}
                        onClick={toggleDislike}
                    >
                        {isDisliked ? "👎 Disliked" : "👎 Dislike"}
                    </button>
                    <button
                        className="rounded border border-border px-2 py-1 text-xs"
                        type="button"
                        aria-label={`Reply to ${props.comment.author}`}
                        onClick={(): void => {
                            setIsReplyOpen((previousValue): boolean => !previousValue)
                        }}
                    >
                        Reply
                    </button>
                </div>
                {isReplyOpen ? (
                    <div className="mt-3 space-y-2">
                        <textarea
                            aria-label={`Reply textarea for ${props.comment.author}`}
                            className="min-h-16 w-full rounded border border-border px-2 py-1 text-sm"
                            value={replyText}
                            onChange={(event): void => {
                                setReplyText(event.currentTarget.value)
                            }}
                        />
                        <button
                            className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white"
                            type="button"
                            onClick={addReply}
                        >
                            Add reply
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
                No review comments yet.
            </section>
        )
    }

    if (threads.length === 0) {
        return (
            <section className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
                No review comments.
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Review comments</h2>
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
