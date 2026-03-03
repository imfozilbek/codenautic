import { type ReactElement, type ReactNode, useState } from "react"

import { Button, Chip } from "@/components/ui"

/** Контекст, доступный для чата. */
export interface IChatPanelContextInfo {
    /** Уникальный идентификатор контекста. */
    readonly id: string
    /** Название репозитория. */
    readonly repoName: string
    /** Номер CCR (кодовой ревизии). */
    readonly ccrNumber: string
    /** Прикреплённые к контексту файлы. */
    readonly attachedFiles: ReadonlyArray<string>
}

/**
 * Параметры компонента индикатора контекста чата.
 */
export interface IChatContextIndicatorProps {
    /** Список доступных контекстов. */
    readonly contexts: ReadonlyArray<IChatPanelContextInfo>
    /** Активный контекст. */
    readonly activeContextId: string
    /** Смена активного контекста. */
    readonly onContextChange: (contextId: string) => void
    /** Заменяемый заголовок секции. */
    readonly title?: string
    /** Текст/лейбл для кнопки открытия списка. */
    readonly actionLabel?: string
    /** Дополнительный класс корня. */
    readonly className?: string
}

function formatContextSummary(context: IChatPanelContextInfo): string {
    return `${context.repoName} — CCR #${context.ccrNumber}`
}

function formatAttachedFiles(attachedFiles: ReadonlyArray<string>): string {
    if (attachedFiles.length === 0) {
        return "No attached files"
    }

    if (attachedFiles.length <= 3) {
        return attachedFiles.join(", ")
    }

    const visible = attachedFiles.slice(0, 3).join(", ")
    const more = attachedFiles.length - 3
    return `${visible} +${String(more)} more`
}

/**
 * Индикатор текущего контекста чата с возможностью смены.
 *
 * @param props Конфигурация.
 * @returns Блок текущего контекста и список выбора.
 */
export function ChatContextIndicator(props: IChatContextIndicatorProps): ReactElement {
    const [isOpen, setIsOpen] = useState(false)
    const contextTitle = props.title ?? "Conversation context"
    const actionLabel = props.actionLabel ?? "Change context"

    const activeContext = props.contexts.find(
        (context): boolean => context.id === props.activeContextId,
    )
    const resolvedContext = activeContext ?? props.contexts[0]
    const contextSummary = resolvedContext === undefined
        ? "Unknown"
        : formatContextSummary(resolvedContext)
    const filesText = resolvedContext === undefined
        ? "No attached files"
        : formatAttachedFiles(resolvedContext.attachedFiles)

    const renderContextItem = (context: IChatPanelContextInfo): ReactNode => (
        <div className="flex min-w-0 flex-col gap-1 text-left">
            <span className="text-xs font-medium sm:text-sm">{formatContextSummary(context)}</span>
            <span className="truncate text-xs text-[var(--foreground)]/70">
                Files: {formatAttachedFiles(context.attachedFiles)}
            </span>
        </div>
    )

    const handleContextChange = (contextId: string): void => {
        if (contextId === props.activeContextId) {
            setIsOpen(false)
            return
        }

        setIsOpen(false)
        props.onContextChange(contextId)
    }

    if (props.contexts.length === 0) {
        return (
            <div
                className={`rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 ${
                    props.className ?? ""
                }`}
            >
                <p className="text-sm text-[var(--foreground)]/70">
                    No conversation contexts available
                </p>
            </div>
        )
    }

    return (
        <div
            className={`rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 ${
                props.className ?? ""
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <Chip size="sm" variant="flat">
                        {contextTitle}
                    </Chip>
                    <p className="mt-1 text-xs font-semibold sm:text-sm">{contextSummary}</p>
                    <p className="mt-1 text-xs text-[var(--foreground)]/70">{filesText}</p>
                </div>
                <Button
                    aria-controls="chat-context-indicator-listbox"
                    aria-expanded={isOpen}
                    isDisabled={props.contexts.length <= 1}
                    size="sm"
                    variant="flat"
                    onPress={(): void => {
                        setIsOpen((previous): boolean => previous === false)
                    }}
                >
                    {actionLabel}
                </Button>
            </div>
            {isOpen === false ? null : (
                <ul
                    aria-label={contextTitle}
                    className="mt-2 flex flex-col gap-1"
                    id="chat-context-indicator-listbox"
                    role="listbox"
                >
                    {props.contexts.map(
                        (context): ReactElement => (
                            <li key={context.id}>
                                <button
                                    aria-label={`${actionLabel} to ${formatContextSummary(context)}`}
                                    aria-selected={context.id === props.activeContextId}
                                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-left transition hover:bg-[var(--surface-hover)]"
                                    role="option"
                                    type="button"
                                    onClick={(): void => {
                                        handleContextChange(context.id)
                                    }}
                                >
                                    {renderContextItem(context)}
                                </button>
                            </li>
                        ),
                    )}
                </ul>
            )}
        </div>
    )
}
