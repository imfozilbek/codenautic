import type { ChangeEvent, ReactElement } from "react"
import { useMemo, useState } from "react"

import { Archive, X } from "@/components/icons/app-icons"
import { Button, Input } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/** Параметры одного треда чата. */
export interface IChatThread {
    /** Идентификатор треда. */
    readonly id: string
    /** Заголовок треда. */
    readonly title: string
    /** Репозиторий, связанный с тредом. */
    readonly repo: string
    /** Номер CCR. */
    readonly ccr: string
    /** Отражает закрытое/архивное состояние. */
    readonly isArchived?: boolean
}

/** Пропсы списка тредов. */
export interface IChatThreadListProps {
    /** Список тредов. */
    readonly threads: ReadonlyArray<IChatThread>
    /** Идентификатор активного треда. */
    readonly activeThreadId?: string
    /** Создать новый тред. */
    readonly onNewThread: () => void
    /** Выбрать тред. */
    readonly onSelectThread: (threadId: string) => void
    /** Закрыть тред. */
    readonly onCloseThread: (threadId: string) => void
    /** Архивировать тред. */
    readonly onArchiveThread: (threadId: string) => void
}

function matchesFilter(value: string, filter: string): boolean {
    if (filter.length === 0) {
        return true
    }

    return value.toLowerCase().includes(filter.toLowerCase())
}

function normalizeText(value: string): string {
    return value.trim().toLowerCase()
}

/**
 * Сайдбар списка conversational-тредов.
 */
export function ChatThreadList(props: IChatThreadListProps): ReactElement {
    const [repoFilter, setRepoFilter] = useState("")
    const [ccrFilter, setCcrFilter] = useState("")
    const normalizedRepoFilter = normalizeText(repoFilter)
    const normalizedCcrFilter = normalizeText(ccrFilter)

    const visibleThreads = useMemo(
        (): ReadonlyArray<IChatThread> =>
            props.threads.filter(
                (thread): boolean =>
                    matchesFilter(thread.repo, normalizedRepoFilter) &&
                    matchesFilter(thread.ccr, normalizedCcrFilter),
            ),
        [props.threads, normalizedRepoFilter, normalizedCcrFilter],
    )

    const handleRepoFilter = (event: ChangeEvent<HTMLInputElement>): void => {
        setRepoFilter(event.target.value)
    }

    const handleCcrFilter = (event: ChangeEvent<HTMLInputElement>): void => {
        setCcrFilter(event.target.value)
    }

    const handleSelectThread = (threadId: string): void => {
        props.onSelectThread(threadId)
    }

    const handleCloseThread = (threadId: string): void => {
        props.onCloseThread(threadId)
    }

    const handleArchiveThread = (threadId: string): void => {
        props.onArchiveThread(threadId)
    }

    return (
        <aside aria-label="Chat threads" className="h-full min-w-0 bg-surface-muted p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Threads</h3>
                <Button onPress={props.onNewThread} size="sm">
                    + New thread
                </Button>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <Input
                    aria-label="Filter by repo"
                    onChange={handleRepoFilter}
                    placeholder="Filter by repo"
                    value={repoFilter}
                />
                <Input
                    aria-label="Filter by CCR"
                    onChange={handleCcrFilter}
                    placeholder="Filter by CCR"
                    value={ccrFilter}
                />
            </div>

            <ul
                aria-live="polite"
                aria-label="Conversation threads"
                className="space-y-2"
                role="list"
            >
                {visibleThreads.length === 0 ? (
                    <li className={TYPOGRAPHY.bodyMuted} role="status">
                        No threads found
                    </li>
                ) : (
                    visibleThreads.map((thread): ReactElement => {
                        const isActive = thread.id === props.activeThreadId
                        return (
                            <li
                                className={`rounded-lg border p-2 ${
                                    isActive
                                        ? "border-primary bg-[color:color-mix(in oklab, var(--primary) 14%, var(--surface))]"
                                        : "border-border bg-surface"
                                }`}
                                key={thread.id}
                                role="listitem"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <button
                                        aria-label={`Open thread ${thread.title} (${thread.repo}, CCR ${thread.ccr})`}
                                        aria-pressed={isActive}
                                        className="min-w-0 text-left"
                                        onClick={(): void => {
                                            handleSelectThread(thread.id)
                                        }}
                                        type="button"
                                    >
                                        <p className="truncate text-sm font-medium">
                                            {thread.title}
                                        </p>
                                        <p className="text-xs text-text-secondary">{thread.repo}</p>
                                        <p className="text-xs text-text-secondary">
                                            CCR: {thread.ccr}
                                        </p>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            aria-label={`Close thread ${thread.title}`}
                                            isIconOnly
                                            onPress={(): void => {
                                                handleCloseThread(thread.id)
                                            }}
                                            radius="full"
                                            size="sm"
                                            variant="light"
                                        >
                                            <X aria-hidden="true" size={14} />
                                        </Button>
                                        <Button
                                            aria-label={`Archive thread ${thread.title}`}
                                            isIconOnly
                                            onPress={(): void => {
                                                handleArchiveThread(thread.id)
                                            }}
                                            radius="full"
                                            size="sm"
                                            variant="light"
                                        >
                                            <Archive aria-hidden="true" size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        )
                    })
                )}
            </ul>
        </aside>
    )
}
