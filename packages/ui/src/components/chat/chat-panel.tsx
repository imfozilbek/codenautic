import type { ReactElement } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { ChatMessageBubble } from "@/components/chat/chat-message-bubble"
import { ChatContextIndicator } from "@/components/chat/chat-context-indicator"
import { X } from "@/components/icons/app-icons"
import {
    ChatInput,
    type IChatFileContextOption,
    type IChatQuickAction,
} from "@/components/chat/chat-input"
import { ChatStreamingResponse } from "@/components/chat/chat-streaming-response"
import { Button, Card, CardBody, CardHeader } from "@/components/ui"
import type { IChatCodeReference } from "@/components/chat/chat-message-bubble"

/** Роль сообщения в чате. */
export type TChatMessageRole = "assistant" | "system" | "user"

/**
 * Сообщение для чат-панели.
 */
export interface IChatPanelMessage {
    /** Уникальный идентификатор. */
    readonly id: string
    /** Роль автора. */
    readonly role: TChatMessageRole
    /** Содержимое сообщения в markdown-подобном формате. */
    readonly content: string
    /** Отображаемое имя отправителя (необязательно). */
    readonly sender?: string
    /** Временная метка сообщения. */
    readonly createdAt?: string | Date
}

/**
 * Контекст, доступный в чате.
 */
export interface IChatPanelContext {
    /** Идентификатор контекста. */
    readonly id: string
    /** Репозиторий для контекста. */
    readonly repoName: string
    /** Идентификатор CCR. */
    readonly ccrNumber: string
    /** Список прикреплённых файлов. */
    readonly attachedFiles: ReadonlyArray<string>
}

/**
 * Пропсы чат-панели.
 */
export interface IChatPanelProps {
    /** Открыта ли панель. */
    readonly isOpen: boolean
    /** Сообщения для списка. */
    readonly messages: ReadonlyArray<IChatPanelMessage>
    /** Отправить сообщение пользователя. */
    readonly onSendMessage: (message: string) => void
    /** Блокируется отправка/ввод. */
    readonly isLoading?: boolean
    /** Заголовок панели. */
    readonly title?: string
    /** Текст-заполнитель в редакторе. */
    readonly placeholder?: string
    /** Текст, если сообщений нет. */
    readonly emptyStateText?: string
    /** Подпись к input для a11y. */
    readonly inputAriaLabel?: string
    /** Лимит символов в поле ввода. */
    readonly maxMessageLength?: number
    /** Ария-метка для списка сообщений. */
    readonly messageListAriaLabel?: string
    /** Опции контекста файла для отправки сообщения. */
    readonly contextOptions?: ReadonlyArray<IChatFileContextOption>
    /** Контексты, которые можно выбрать (с репозиторием/CCR/файлами). */
    readonly contextItems?: ReadonlyArray<IChatPanelContext>
    /** Идентификатор активного контекста. */
    readonly activeContextId?: string
    /** Ария-метка для селектора контекста. */
    readonly contextAriaLabel?: string
    /** Callback смены выбранного контекста. */
    readonly onContextChange?: (contextId: string) => void
    /** Доступный label для панели (в т.ч. скрин-ридерам). */
    readonly panelAriaLabel?: string
    /** Переопределение контейнера. */
    readonly className?: string
    /** Токены для стримингового ответа в режиме реального времени. */
    readonly streamTokens?: ReadonlyArray<string>
    /** Показывать ли стриминговый рендеринг ответа. */
    readonly isStreaming?: boolean
    /** Отмена стримингового запроса. */
    readonly onCancelStreaming?: () => void
    /** Подпись отправителя в стриминговом ответе. */
    readonly streamingSenderLabel?: string
    /** Скорость token-to-token рендера (ms). */
    readonly streamingTokenDelayMs?: number
    /** Callback клика по ссылке на код. */
    readonly onCodeReferenceClick?: (reference: IChatCodeReference) => void
    /** Callback hover/focus по ссылке на код. */
    readonly onCodeReferencePreview?: (reference: IChatCodeReference) => void
    /** Быстрые действия, например: explain/summarize. */
    readonly quickActions?: ReadonlyArray<IChatQuickAction>
    /** Callback запуска quick action. */
    readonly onQuickAction?: (message: string) => void
    /** Закрыть панель (опционально). */
    readonly onClose?: () => void
}

/**
 * Sliding-кнопка чата с сообщениями и полем ввода.
 */
export function ChatPanel(props: IChatPanelProps): ReactElement {
    const [draftMessage, setDraftMessage] = useState("")
    const [selectedContextId, setSelectedContextId] = useState("")
    const isPanelOpen = props.isOpen === true
    const isStreaming = props.isStreaming === true
    const streamingTokens = props.streamTokens ?? []
    const isSending = props.isLoading === true
    const messageListRef = useRef<HTMLUListElement>(null)

    const title = props.title ?? "Conversation"
    const inputPlaceholder = props.placeholder ?? "Type a message and press Enter"
    const emptyText = props.emptyStateText ?? "No messages yet. Start the conversation to begin."
    const panelAriaLabel = props.panelAriaLabel ?? "Conversation panel"
    const messageListAriaLabel = props.messageListAriaLabel ?? "Conversation messages"
    const inputAriaLabel = props.inputAriaLabel ?? "Message input"
    const contextAriaLabel = props.contextAriaLabel ?? "File context"
    const maxMessageLength = props.maxMessageLength ?? 4000
    const normalizedContextItems: ReadonlyArray<IChatPanelContext> = useMemo(() => {
        return props.contextItems ?? []
    }, [props.contextItems])
    const inputContextOptions: ReadonlyArray<IChatFileContextOption> = useMemo(() => {
        if (props.contextOptions !== undefined) {
            return props.contextOptions
        }

        return normalizedContextItems.map(
            (context): IChatFileContextOption => ({
                id: context.id,
                label: `${context.repoName} — CCR #${context.ccrNumber}`,
            }),
        )
    }, [props.contextOptions, normalizedContextItems])
    const availableContextId =
        inputContextOptions.length === 0 ? "" : (inputContextOptions[0]?.id ?? "")
    const effectiveContextId = selectedContextId === "" ? availableContextId : selectedContextId

    useEffect((): void => {
        if (props.activeContextId !== undefined) {
            const isActiveFromParent = inputContextOptions.some(
                (context): boolean => context.id === props.activeContextId,
            )
            if (isActiveFromParent === true && selectedContextId !== props.activeContextId) {
                setSelectedContextId(props.activeContextId)
            }

            if (isActiveFromParent === false && selectedContextId !== availableContextId) {
                setSelectedContextId(availableContextId)
            }
            return
        }

        if (inputContextOptions.length === 0 && selectedContextId !== "") {
            setSelectedContextId("")
            return
        }

        if (
            selectedContextId === "" ||
            inputContextOptions.some((context): boolean => context.id === selectedContextId) ===
                false
        ) {
            setSelectedContextId(availableContextId)
        }
    }, [availableContextId, inputContextOptions, props.activeContextId, selectedContextId])
    const wrapperClassName = `fixed inset-y-0 right-0 z-40 flex w-full transform flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 sm:max-w-[420px] ${
        isPanelOpen ? "translate-x-0" : "translate-x-full"
    } ${props.className ?? ""}`

    const handleSubmit = (message: string): void => {
        if (message.length === 0 || isSending) {
            return
        }

        props.onSendMessage(message)
        setDraftMessage("")
    }

    const handleContextChange = (contextId: string): void => {
        setSelectedContextId(contextId)
        props.onContextChange?.(contextId)
    }

    const handleQuickAction = (message: string): void => {
        if (isSending === true) {
            return
        }

        const normalizedMessage = message.trim()
        if (normalizedMessage.length === 0) {
            return
        }

        props.onQuickAction?.(normalizedMessage)
        props.onSendMessage(normalizedMessage)
    }

    return (
        <aside aria-label={panelAriaLabel} className={wrapperClassName} role="complementary">
            <Card className="min-h-full rounded-none border-0 shadow-none">
                <CardHeader className="flex items-center justify-between border-b border-border bg-surface">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {props.onClose === undefined ? null : (
                        <Button
                            aria-label="Close chat panel"
                            isIconOnly
                            radius="full"
                            size="sm"
                            variant="light"
                            onPress={props.onClose}
                        >
                            <X aria-hidden className="size-4" />
                        </Button>
                    )}
                </CardHeader>

                <CardBody className="flex min-h-0 flex-1 flex-col gap-3 bg-surface-muted p-0">
                    {normalizedContextItems.length === 0 ? null : (
                        <div className="px-3 pt-2">
                            <ChatContextIndicator
                                activeContextId={effectiveContextId}
                                contexts={normalizedContextItems}
                                onContextChange={handleContextChange}
                                title="Current context"
                            />
                        </div>
                    )}
                    <ul
                        aria-label={messageListAriaLabel}
                        aria-live="polite"
                        className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                        ref={messageListRef}
                        role="log"
                    >
                        {props.messages.length === 0 ? (
                            <li className="text-sm text-text-secondary" role="status">
                                {emptyText}
                            </li>
                        ) : (
                            props.messages.map(
                                (message): ReactElement => (
                                    <ChatMessageBubble
                                        key={message.id}
                                        message={message}
                                        onCodeReferenceClick={props.onCodeReferenceClick}
                                        onCodeReferencePreview={props.onCodeReferencePreview}
                                    />
                                ),
                            )
                        )}
                        {isStreaming ? (
                            <ChatStreamingResponse
                                isStreaming={isStreaming}
                                onCancel={props.onCancelStreaming}
                                senderLabel={props.streamingSenderLabel}
                                scrollContainerRef={messageListRef}
                                streamTokens={streamingTokens}
                                tokenDelayMs={props.streamingTokenDelayMs}
                            />
                        ) : null}
                    </ul>
                    <ChatInput
                        quickActions={props.quickActions}
                        contextAriaLabel={contextAriaLabel}
                        contextOptions={inputContextOptions}
                        selectedContextId={effectiveContextId}
                        counterAriaLabel="Message character count"
                        draft={draftMessage}
                        onQuickAction={handleQuickAction}
                        inputAriaLabel={inputAriaLabel}
                        isLoading={isSending}
                        maxLength={maxMessageLength}
                        onContextChange={handleContextChange}
                        onDraftChange={setDraftMessage}
                        onSubmit={handleSubmit}
                        placeholder={inputPlaceholder}
                    />
                </CardBody>
            </Card>
        </aside>
    )
}
