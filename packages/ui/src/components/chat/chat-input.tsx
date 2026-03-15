import type { ChangeEvent, FormEvent, KeyboardEvent, ReactElement } from "react"
import { useEffect, useState } from "react"

import { type Key, Button, ListBox, ListBoxItem, Select, TextArea } from "@heroui/react"

/** Опция выбора контекста для отправки сообщения. */
export interface IChatFileContextOption {
    /** Идентификатор контекста. */
    readonly id: string
    /** Отображаемое имя контекста. */
    readonly label: string
}

/** Экшен быстрого ответа. */
export interface IChatQuickAction {
    /** Уникальный идентификатор действия. */
    readonly id: string
    /** Название кнопки. */
    readonly label: string
    /** Сообщение, отправляемое в чат. */
    readonly message: string
}

/** Пропсы полевой части чата. */
export interface IChatInputProps {
    /** Текущая строка ввода. */
    readonly draft: string
    /** Изменение строки ввода. */
    readonly onDraftChange: (value: string) => void
    /** Отправка сообщения. */
    readonly onSubmit: (message: string) => void
    /** Заблокирован ввод/отправка. */
    readonly isLoading?: boolean
    /** Текст-заполнитель. */
    readonly placeholder?: string
    /** Аpия лэйбл поля ввода. */
    readonly inputAriaLabel?: string
    /** Заголовок счетчика символов. */
    readonly counterAriaLabel?: string
    /** Макс. допустимое число символов. */
    readonly maxLength?: number
    /** Доступный label для селектора контекста. */
    readonly contextAriaLabel?: string
    /** Список контекстов для выбора файла/ресурса. */
    readonly contextOptions?: ReadonlyArray<IChatFileContextOption>
    /** Быстрые действия внизу инпута. */
    readonly quickActions?: ReadonlyArray<IChatQuickAction>
    /** Идентификатор выбранного контекста (если выбранный контролируется извне). */
    readonly selectedContextId?: string
    /** Callback при смене контекста. */
    readonly onContextChange?: (contextId: string) => void
    /** Callback при запуске quick action. */
    readonly onQuickAction?: (message: string) => void
}

function resolveSelection(key: Key | null): string | undefined {
    if (key === null) {
        return undefined
    }

    const raw = String(key)
    if (raw.length > 0) {
        return raw
    }
    return undefined
}

/**
 * Поле ввода и отправки сообщения для чата.
 */
export function ChatInput(props: IChatInputProps): ReactElement {
    const [selectedContext, setSelectedContext] = useState("")
    const contextOptions = props.contextOptions ?? []
    const quickActions = props.quickActions ?? []
    const maxLength = props.maxLength ?? 4000
    const normalizedLength = props.draft.length
    const maxLengthLabel = `${String(normalizedLength)}/${String(maxLength)}`
    const trimmedDraft = props.draft.trim()
    const canSubmit =
        trimmedDraft.length > 0 && props.isLoading !== true && normalizedLength <= maxLength

    useEffect((): void => {
        if (contextOptions.length === 0) {
            if (selectedContext !== "") {
                setSelectedContext("")
            }

            return
        }

        const fallback = contextOptions[0]
        if (fallback === undefined) {
            if (selectedContext !== "") {
                setSelectedContext("")
            }
            return
        }

        if (props.selectedContextId !== undefined) {
            const isValidSelectedContext = contextOptions.some((context): boolean => {
                return context.id === props.selectedContextId
            })

            const nextContext = isValidSelectedContext ? props.selectedContextId : ""
            if (selectedContext !== nextContext) {
                setSelectedContext(nextContext)
            }

            return
        }

        if (
            selectedContext === "" ||
            contextOptions.some((item): boolean => item.id === selectedContext) === false
        ) {
            setSelectedContext(fallback.id)
            props.onContextChange?.(fallback.id)
        }
    }, [contextOptions, selectedContext, props.onContextChange, props.selectedContextId])

    const submit = (): void => {
        if (canSubmit === false) {
            return
        }

        props.onSubmit(trimmedDraft)
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        submit()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
        if (event.nativeEvent.isComposing === true) {
            return
        }

        if (event.key === "Enter" && event.shiftKey === false) {
            event.preventDefault()
            submit()
        }
    }

    const handleContextChange = (key: Key | null): void => {
        const nextContext = resolveSelection(key)
        if (nextContext === undefined) {
            return
        }

        setSelectedContext(nextContext)
        props.onContextChange?.(nextContext)
    }

    const handleQuickAction = (message: string): void => {
        if (props.isLoading === true) {
            return
        }

        props.onQuickAction?.(message)
    }

    return (
        <form className="border-t border-border" onSubmit={handleSubmit}>
            {contextOptions.length === 0 ? null : (
                <div className="border-b border-border px-3 pt-3">
                    <label className="sr-only" htmlFor="chat-context-select">
                        {props.contextAriaLabel ?? "File context"}
                    </label>
                    <Select
                        aria-label={props.contextAriaLabel ?? "File context"}
                        className="w-full"
                        id="chat-context-select"
                        onSelectionChange={handleContextChange}
                        selectedKey={selectedContext === "" ? null : selectedContext}
                    >
                        <Select.Trigger>
                            <Select.Value />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {contextOptions.map(
                                    (context): ReactElement => (
                                        <ListBoxItem
                                            key={context.id}
                                            id={context.id}
                                            textValue={context.label}
                                        >
                                            {context.label}
                                        </ListBoxItem>
                                    ),
                                )}
                            </ListBox>
                        </Select.Popover>
                    </Select>
                </div>
            )}
            {quickActions.length === 0 ? null : (
                <div className="flex flex-wrap gap-2 border-b border-border px-3 pb-2 pt-2">
                    {quickActions.map(
                        (action): ReactElement => (
                            <Button
                                key={action.id}
                                isDisabled={props.isLoading}
                                size="sm"
                                type="button"
                                variant="secondary"
                                onPress={(): void => {
                                    handleQuickAction(action.message)
                                }}
                            >
                                {action.label}
                            </Button>
                        ),
                    )}
                </div>
            )}
            <div className="p-3">
                <label className="sr-only" htmlFor="conversation-input">
                    {props.inputAriaLabel ?? "Message input"}
                </label>
                <TextArea
                    aria-label={props.inputAriaLabel ?? "Message input"}
                    autoComplete="off"
                    className="min-h-20 rounded-lg bg-surface"
                    id="conversation-input"
                    disabled={props.isLoading === true}
                    maxLength={maxLength}
                    onKeyDown={handleKeyDown}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => {
                        props.onDraftChange(event.target.value)
                    }}
                    placeholder={props.placeholder ?? "Type a message and press Enter"}
                    value={props.draft}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                    <p
                        aria-label={props.counterAriaLabel ?? "Message character count"}
                        className="text-xs text-muted"
                    >
                        {maxLengthLabel}
                    </p>
                    <Button
                        className="w-full max-w-24 sm:max-w-28"
                        isDisabled={canSubmit === false}
                        type="submit"
                    >
                        Отправить
                    </Button>
                </div>
            </div>
        </form>
    )
}
