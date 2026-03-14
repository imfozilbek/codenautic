import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"

import { Button } from "@heroui/react"

/** Параметры отображения стримингового ответа чата. */
export interface IChatStreamingResponseProps {
    /** Лайбл отправителя. */
    readonly senderLabel?: string
    /** Текст, который должен быть показан построчно по токенам. */
    readonly streamTokens: ReadonlyArray<string>
    /** Включена ли визуальная «стриминг»-сессия. */
    readonly isStreaming: boolean
    /** Отменить текущий стрим. */
    readonly onCancel?: () => void
    /** Скорость рендера одного токена в ms. */
    readonly tokenDelayMs?: number
    /** Контейнер, который нужно скроллить к последнему фрейму. */
    readonly scrollContainerRef?: React.RefObject<HTMLElement | null>
    /** Лайбл для контейнера индикатора печати. */
    readonly typingAriaLabel?: string
    /** Доп. класс корневого контейнера. */
    readonly className?: string
    /** Флаг видимости индикатора печати после завершения потоковой сессии. */
    readonly showTypingAfterComplete?: boolean
}

/**
 * Отображение token-by-token ответа с индикатором печати и кнопкой отмены.
 */
export function ChatStreamingResponse(props: IChatStreamingResponseProps): ReactElement {
    const senderLabel = props.senderLabel ?? "AI"
    const normalizedDelay = props.tokenDelayMs ?? 16
    const [renderedText, setRenderedText] = useState("")
    const [isTyping, setIsTyping] = useState(props.isStreaming)
    const currentTokenIndex = useRef(0)
    const intervalRef = useRef<number | null>(null)

    const clearInterval = (): void => {
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }

    const handleCancel = (): void => {
        clearInterval()
        setIsTyping(false)
        props.onCancel?.()
    }

    useEffect((): (() => void) => {
        clearInterval()
        currentTokenIndex.current = 0
        setRenderedText("")
        setIsTyping(props.isStreaming)

        if (props.isStreaming !== true || props.streamTokens.length === 0) {
            return clearInterval
        }

        intervalRef.current = window.setInterval((): void => {
            const nextIndex = currentTokenIndex.current
            if (nextIndex >= props.streamTokens.length) {
                clearInterval()
                setIsTyping(props.showTypingAfterComplete === true)
                return
            }

            const nextToken = props.streamTokens[nextIndex]
            currentTokenIndex.current += 1
            setRenderedText((previous): string => `${previous}${nextToken}`)
            if (currentTokenIndex.current >= props.streamTokens.length) {
                clearInterval()
                setIsTyping(props.showTypingAfterComplete === true)
                return
            }
        }, normalizedDelay)

        return clearInterval
    }, [props.isStreaming, props.streamTokens, normalizedDelay, props.showTypingAfterComplete])

    useEffect((): void => {
        if (props.scrollContainerRef === undefined || props.scrollContainerRef.current === null) {
            return
        }

        props.scrollContainerRef.current.scrollTo({
            behavior: "smooth",
            left: 0,
            top: props.scrollContainerRef.current.scrollHeight,
        })
    }, [props.isStreaming, renderedText, isTyping])

    if (props.isStreaming !== true && renderedText.length === 0) {
        return <></>
    }

    const typingDots: ReactNode = (
        <span
            aria-label={props.typingAriaLabel ?? "Assistant is typing"}
            className="mt-1 inline-flex items-center gap-1 text-xs text-text-secondary"
        >
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
        </span>
    )

    return (
        <li className={`rounded-lg border border-border bg-surface p-3 ${props.className ?? ""}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="font-medium">{senderLabel}</div>
                <div className="flex items-center gap-2">
                    {isTyping ? typingDots : null}
                    <Button
                        isDisabled={props.onCancel === undefined}
                        onPress={handleCancel}
                        size="sm"
                        variant="ghost"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
            <div className="text-sm leading-relaxed text-foreground">
                <p aria-live="polite" className="whitespace-pre-wrap break-words">
                    {renderedText}
                </p>
                {renderedText.length === 0 && isTyping ? <p>{senderLabel} пишет…</p> : null}
            </div>
        </li>
    )
}
