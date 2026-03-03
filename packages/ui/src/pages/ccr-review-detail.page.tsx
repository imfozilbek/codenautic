import { useMemo, useRef, useState, type ReactElement } from "react"
import { Link } from "@tanstack/react-router"

import { Card, CardBody, CardHeader } from "@/components/ui"
import { ChatPanel, type IChatPanelContext, type IChatPanelMessage } from "@/components/chat/chat-panel"
import { CodeDiffViewer } from "@/components/reviews/code-diff-viewer"
import { ReviewCommentThread } from "@/components/reviews/review-comment-thread"
import {
    ccrToContextItem,
    getCcrDiffById,
    getCcrReviewThreadsById,
    type ICcrDiffFile,
    type IReviewCommentThread,
    type ICcrRowData,
} from "@/pages/ccr-data"

/** Свойства страницы диффа CCR. */
export interface ICcrReviewDetailPageProps {
    /** Данные CCR, для которой рендерится review context. */
    readonly ccr: ICcrRowData
}

function buildExplainMessage(ccr: ICcrRowData): string {
    const fileHint =
        ccr.attachedFiles.length > 0
            ? `Focus on ${ccr.attachedFiles[0]}`
            : "Focus on touched files"

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

/** Страница страницы отдельного CCR review с авто-подставленным контекстом чата. */
export function CcrReviewDetailPage(props: ICcrReviewDetailPageProps): ReactElement {
    const { ccr } = props
    const [messages, setMessages] = useState<ReadonlyArray<IChatPanelMessage>>([])
    const nextMessageId = useRef(0)
    const contextItem = useMemo((): IChatPanelContext => {
        return ccrToContextItem(ccr)
    }, [ccr])
    const ccrDiffFiles = useMemo((): ReadonlyArray<ICcrDiffFile> => {
        return getCcrDiffById(ccr.id)
    }, [ccr.id])
    const ccrReviewThreads = useMemo((): ReadonlyArray<IReviewCommentThread> => {
        return getCcrReviewThreadsById(ccr.id)
    }, [ccr.id])

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
        if (normalizedMessage.length === 0) {
            return
        }

        nextMessageId.current += 1
        setMessages((previousValue): ReadonlyArray<IChatPanelMessage> => [
            ...previousValue,
            {
                content: normalizedMessage,
                createdAt: new Date().toISOString(),
                id: `ccr-message-${String(nextMessageId.current)}`,
                role: "user",
                sender: "You",
            },
        ])
    }

    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm text-slate-500">CCR review</p>
                            <h1 className="text-2xl font-semibold text-slate-900">{ccr.title}</h1>
                            <p className="text-sm text-slate-700">
                                {ccr.id} · {ccr.repository} · {ccr.team} · {ccr.status}
                            </p>
                        </div>
                        <Link className="text-sm underline underline-offset-4" to="/reviews">
                            ← Back to review list
                        </Link>
                    </div>
                </CardHeader>
                <CardBody className="space-y-2">
                    <p className="text-sm text-slate-700">
                        <strong>Assignee:</strong> {ccr.assignee}
                    </p>
                    <p className="text-sm text-slate-700">
                        <strong>Comments:</strong> {ccr.comments}
                    </p>
                    <p className="text-sm text-slate-700">
                        <strong>Updated:</strong> {ccr.updatedAt}
                    </p>
                    <p className="text-sm text-slate-700">
                        <strong>Attached files:</strong> {buildAttachedFilesText(ccr.attachedFiles)}
                    </p>
                </CardBody>
            </Card>

            <CodeDiffViewer files={ccrDiffFiles} />
            <ReviewCommentThread threads={ccrReviewThreads} />
            <ChatPanel
                contextItems={[contextItem]}
                isOpen
                messages={messages}
                onSendMessage={handleSendMessage}
                activeContextId={contextItem.id}
                emptyStateText={`Ask anything about ${ccr.id} diff. Quick actions are available below.`}
                inputAriaLabel="Type a review question"
                maxMessageLength={2500}
                placeholder={`Ask about ${ccr.id} changes...`}
                panelAriaLabel={`Conversation for ${ccr.id}`}
                messageListAriaLabel={`${ccr.id} chat messages`}
                quickActions={quickActions}
                title={`Conversation · ${ccr.id}`}
            />
        </section>
    )
}
