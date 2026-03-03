import type { FormEvent, KeyboardEvent, ReactElement, ReactNode } from "react"
import { useState } from "react"

import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"

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
    /** Ария-метка для списка сообщений. */
    readonly messageListAriaLabel?: string
    /** Доступный label для панели (в т.ч. скрин-ридерам). */
    readonly panelAriaLabel?: string
    /** Переопределение контейнера. */
    readonly className?: string
    /** Закрыть панель (опционально). */
    readonly onClose?: () => void
}

type TMarkdownNode = ReactNode

const CODE_BLOCK_REGEXP = /```(\w+)?\n([\s\S]*?)```/g
const LINK_REGEXP = /^\[([^\]]+)\]\(([^)]+)\)$/
const MARKDOWN_TOKEN_REGEXP = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g
const RESERVED_KEYWORDS = new Set([
    "async",
    "await",
    "class",
    "const",
    "var",
    "else",
    "export",
    "false",
    "finally",
    "for",
    "from",
    "if",
    "import",
    "interface",
    "let",
    "new",
    "null",
    "return",
    "throw",
    "try",
    "type",
    "true",
    "undefined",
    "while",
])

function isValidDate(value: string | Date | undefined): value is Date {
    if (value === undefined) {
        return false
    }

    const date = typeof value === "string" ? new Date(value) : value
    if (Number.isNaN(date.getTime()) === true) {
        return false
    }

    return true
}

function formatMessageTime(createdAt: IChatPanelMessage["createdAt"]): string {
    if (isValidDate(createdAt) === false) {
        return "—"
    }

    const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date)
}

function getLanguageFromCodeBlock(language: string | undefined): string {
    if (language === undefined || language.length === 0) {
        return "text"
    }

    return language.toLowerCase()
}

function parseInlineMarkdown(
    source: string,
    keyPrefix: string,
): ReadonlyArray<TMarkdownNode> {
    MARKDOWN_TOKEN_REGEXP.lastIndex = 0
    const items: TMarkdownNode[] = []
    let lastIndex = 0

    for (let match = MARKDOWN_TOKEN_REGEXP.exec(source); match !== null; match = MARKDOWN_TOKEN_REGEXP.exec(source)) {
        const tokenStart = match.index
        const tokenEnd = MARKDOWN_TOKEN_REGEXP.lastIndex
        const token = match[0]

        if (tokenStart > lastIndex) {
            items.push(source.slice(lastIndex, tokenStart))
        }

        const tokenIndex = items.length
        if (match[1] !== undefined) {
            items.push(
                <code className="rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-sm" key={`${keyPrefix}-inline-code-${String(tokenIndex)}`}>
                    {token.slice(1, -1)}
                </code>,
            )
        } else if (match[2] !== undefined) {
            items.push(
                <strong key={`${keyPrefix}-inline-bold-${String(tokenIndex)}`}>
                    {token.slice(2, -2)}
                </strong>,
            )
        } else if (match[3] !== undefined) {
            const normalizedLink = token.match(LINK_REGEXP)
            if (normalizedLink !== null) {
                items.push(
                    <a
                        key={`${keyPrefix}-inline-link-${String(tokenIndex)}`}
                        className="text-[var(--primary)] underline underline-offset-4"
                        href={normalizedLink[2]}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {normalizedLink[1]}
                    </a>,
                )
            } else {
                items.push(token)
            }
        } else {
            items.push(token)
        }

        lastIndex = tokenEnd
    }

    if (lastIndex < source.length) {
        items.push(source.slice(lastIndex))
    }

    return items.map((item): TMarkdownNode =>
        typeof item === "string" ? item : item,
    )
}

function parseCodeLine(line: string, keyPrefix: string): ReactElement {
    const tokenRegExp =
        /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|if|else|for|while|class|interface|type|import|from|export|async|await|new|try|catch|finally|throw|false|true|null|undefined)\b|\b\d+(?:\.\d+)?\b/g

    const items: ReactElement[] = []
    let index = 0
    let match = tokenRegExp.exec(line)

    while (match !== null) {
        const token = match[0]
        const tokenStart = match.index
        const tokenEnd = tokenRegExp.lastIndex

        if (tokenStart > index) {
            items.push(
                <span key={`${keyPrefix}-plain-${String(index)}`}>
                    {line.slice(index, tokenStart)}
                </span>,
            )
        }

        if (RESERVED_KEYWORDS.has(token.toLowerCase())) {
            items.push(
                <span
                    className="font-semibold text-blue-400"
                    key={`${keyPrefix}-keyword-${String(index)}`}
                >
                    {token}
                </span>,
            )
        } else if (
            token.startsWith("\"") ||
            token.startsWith("'") ||
            token.startsWith("`")
        ) {
            items.push(
                <span
                    className="text-emerald-400"
                    key={`${keyPrefix}-string-${String(index)}`}
                >
                    {token}
                </span>,
            )
        } else if (/^\/\/|^\/\*/.test(token)) {
            items.push(
                <span className="text-[var(--success)]" key={`${keyPrefix}-comment-${String(index)}`}>
                    {token}
                </span>,
            )
        } else if (/^\d/.test(token)) {
            items.push(
                <span className="text-cyan-300" key={`${keyPrefix}-number-${String(index)}`}>
                    {token}
                </span>,
            )
        } else {
            items.push(
                <span className="text-[var(--foreground)]" key={`${keyPrefix}-text-${String(index)}`}>
                    {token}
                </span>,
            )
        }

        index = tokenEnd
        match = tokenRegExp.exec(line)
    }

    if (index < line.length) {
        items.push(
            <span className="text-[var(--foreground)]" key={`${keyPrefix}-tail-${String(index)}`}>
                {line.slice(index)}
            </span>,
        )
    }

    return <span>{items}</span>
}

function parseCodeBlock(
    source: string,
    language: string,
    keyPrefix: string,
): ReactElement {
    const lines = source.split("\n")
    return (
        <pre
            className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
            key={keyPrefix}
        >
            <code
                className={`language-${language} block whitespace-pre`}
                lang={language}
            >
                {lines.map(
                    (line, index): ReactElement => (
                        <span key={`${keyPrefix}-line-${String(index)}`} className="block">
                            {parseCodeLine(line, `${keyPrefix}-line-${String(index)}`)}
                        </span>
                    ),
                )}
            </code>
        </pre>
    )
}

function parseMessageMarkdown(message: string): ReactElement {
    const nodes: ReactElement[] = []
    CODE_BLOCK_REGEXP.lastIndex = 0
    let codeBlockMatch = CODE_BLOCK_REGEXP.exec(message)
    let lastIndex = 0
    let blockIndex = 0

    while (codeBlockMatch !== null) {
        const matchStart = codeBlockMatch.index
        const matchEnd = CODE_BLOCK_REGEXP.lastIndex
        const language = getLanguageFromCodeBlock(codeBlockMatch[1])
        const code = codeBlockMatch[2] ?? ""
        const textBefore = message.slice(lastIndex, matchStart)

        if (textBefore.length > 0) {
            nodes.push(
                ...parseMarkdownTextBlocks(textBefore, `chat-block-${String(blockIndex)}-text`),
            )
            blockIndex += 1
        }

        nodes.push(parseCodeBlock(code, language, `chat-block-${String(blockIndex)}-code`))
        blockIndex += 1

        lastIndex = matchEnd
        codeBlockMatch = CODE_BLOCK_REGEXP.exec(message)
    }

    const tail = message.slice(lastIndex)
    if (tail.length > 0) {
        nodes.push(...parseMarkdownTextBlocks(tail, `chat-block-${String(blockIndex)}-tail`))
    }

    return <div className="space-y-2">{nodes}</div>
}

function pushParagraphBlock(
    blocks: ReactElement[],
    lines: string[],
    keyPrefix: string,
): void {
    if (lines.length === 0) {
        return
    }

    const paragraphLines = lines.join("\n")
    const paragraphChunks = paragraphLines.split("\n")
    blocks.push(
        <p key={`paragraph-${keyPrefix}`} className="leading-relaxed text-[var(--foreground)]">
            {paragraphChunks.map((line, index): TMarkdownNode[] | TMarkdownNode => {
                    const parsedLine = parseInlineMarkdown(line, `${keyPrefix}-${String(index)}`)
                    if (index === paragraphChunks.length - 1) {
                        return parsedLine
                    }

                    return [...parsedLine, <br key={`${keyPrefix}-br-${String(index)}`} />]
                })}
        </p>,
    )
    lines.length = 0
}

function parseMarkdownTextBlocks(
    source: string,
    keyPrefix: string,
): ReadonlyArray<ReactElement> {
    const lines = source.split("\n")
    const blocks: ReactElement[] = []
    const paragraphLines: string[] = []
    let blockIndex = 0
    let listLines: string[] = []

    const flushParagraph = (): void => {
        pushParagraphBlock(blocks, paragraphLines, `${keyPrefix}-p-${String(blockIndex)}`)
    }

    const flushList = (): void => {
        if (listLines.length === 0) {
            return
        }

        blocks.push(
            <ul
                className="list-disc space-y-1 pl-6"
                key={`list-${keyPrefix}-${String(blockIndex)}`}
            >
                {listLines.map(
                    (item, index): ReactElement => (
                        <li key={`list-item-${String(index)}`}>
                            {parseInlineMarkdown(item.slice(2).trim(), `${keyPrefix}-list-${String(index)}`)}
                        </li>
                    ),
                )}
            </ul>,
        )

        listLines = []
        blockIndex += 1
    }

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,4})\s+(.*)$/)
        if (headingMatch !== null) {
            flushParagraph()
            flushList()

            const level = headingMatch[1]?.length ?? 1
            const headingContent = headingMatch[2] ?? ""
            const content = parseInlineMarkdown(headingContent, `${keyPrefix}-heading-${String(blockIndex)}`)

            if (level === 1) {
                blocks.push(<h3 key={`h-${keyPrefix}-${String(blockIndex)}`}>{content}</h3>)
            } else if (level === 2) {
                blocks.push(<h4 key={`h-${keyPrefix}-${String(blockIndex)}`}>{content}</h4>)
            } else if (level === 3) {
                blocks.push(<h5 key={`h-${keyPrefix}-${String(blockIndex)}`}>{content}</h5>)
            } else {
                blocks.push(<h6 key={`h-${keyPrefix}-${String(blockIndex)}`}>{content}</h6>)
            }

            blockIndex += 1
            continue
        }

        const isListItem = line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")
        if (isListItem === true) {
            flushParagraph()
            listLines.push(line.trimStart())
            continue
        }

        if (line.trim() === "") {
            flushParagraph()
            flushList()
            continue
        }

        paragraphLines.push(line)
        blockIndex += 1
    }

    flushParagraph()
    flushList()

    return blocks
}

function renderMessageBubble(
    message: IChatPanelMessage,
): ReactElement {
    const roleLabel =
        message.role === "user" ? "Вы" : message.role === "assistant" ? "Ассистент" : "Система"
    const sender = message.sender ?? roleLabel
    const isUser = message.role === "user"
    const formattedTime = formatMessageTime(message.createdAt)

    return (
        <li
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            key={message.id}
            role="listitem"
        >
            <article
                aria-label={`Сообщение от ${sender}`}
                className={`max-w-[82%] rounded-xl border px-3 py-2 text-sm ${
                    isUser
                        ? "border-[var(--primary)] bg-[color:color-mix(in oklab, var(--primary) 12%, var(--surface))] text-[var(--foreground)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                }`}
            >
                <p className="mb-1 text-xs uppercase tracking-wide text-[color:var(--foreground)]/70">
                    {sender} · {formattedTime}
                </p>
                {parseMessageMarkdown(message.content)}
            </article>
        </li>
    )
}

/**
 * Sliding-кнопка чата с сообщениями и полем ввода.
 */
export function ChatPanel(props: IChatPanelProps): ReactElement {
    const [draftMessage, setDraftMessage] = useState("")
    const isPanelOpen = props.isOpen === true
    const isSending = props.isLoading === true

    const title = props.title ?? "Conversation"
    const inputPlaceholder = props.placeholder ?? "Type a message and press Enter"
    const emptyText =
        props.emptyStateText ?? "No messages yet. Start the conversation to begin."
    const panelAriaLabel = props.panelAriaLabel ?? "Conversation panel"
    const messageListAriaLabel = props.messageListAriaLabel ?? "Conversation messages"
    const inputAriaLabel = props.inputAriaLabel ?? "Message input"
    const wrapperClassName =
        `fixed inset-y-0 right-0 z-40 flex w-full transform flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-200 sm:max-w-[420px] ${
            isPanelOpen ? "translate-x-0" : "translate-x-full"
        } ${props.className ?? ""}`

    const sendMessage = (): void => {
        const normalized = draftMessage.trim()
        if (normalized.length === 0 || isSending) {
            return
        }

        props.onSendMessage(normalized)
        setDraftMessage("")
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault()
        sendMessage()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        if (event.key === "Enter" && event.shiftKey === false) {
            event.preventDefault()
            sendMessage()
        }
    }

    return (
        <aside
            aria-label={panelAriaLabel}
            className={wrapperClassName}
            role="complementary"
        >
            <Card className="min-h-full rounded-none border-0 shadow-none">
                <CardHeader className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]">
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
                            ×
                        </Button>
                    )}
                </CardHeader>

                <CardBody className="flex min-h-0 flex-1 flex-col gap-3 bg-[var(--surface-muted)] p-0">
                    {props.messages.length === 0 ? (
                        <div className="p-4 text-sm text-[var(--foreground)]/70" role="status">
                            {emptyText}
                        </div>
                    ) : (
                        <ul
                            aria-live="polite"
                            aria-label={messageListAriaLabel}
                            className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                            role="log"
                        >
                            {props.messages.map((message): ReactElement => renderMessageBubble(message))}
                        </ul>
                    )}

                    <form
                        className="border-t border-[var(--border)] p-3"
                        onSubmit={handleSubmit}
                    >
                        <label className="sr-only" htmlFor="conversation-input">
                            {inputAriaLabel}
                        </label>
                        <Textarea
                            aria-label={inputAriaLabel}
                            className="min-h-20 rounded-lg bg-[var(--surface)]"
                            id="conversation-input"
                            isDisabled={isSending}
                            minRows={2}
                            onKeyDown={handleKeyDown}
                            onValueChange={(value): void => {
                                setDraftMessage(value)
                            }}
                            placeholder={inputPlaceholder}
                            value={draftMessage}
                        />
                        <Button
                            className="mt-2 w-full"
                            isDisabled={draftMessage.trim().length === 0 || isSending}
                            type="submit"
                        >
                            Отправить
                        </Button>
                    </form>
                </CardBody>
            </Card>
        </aside>
    )
}
