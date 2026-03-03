import type { MouseEvent, ReactElement, ReactNode } from "react"
import { useState } from "react"

import { Avatar, Button } from "@/components/ui"

import type { IChatPanelMessage } from "./chat-panel"

type TMarkdownNode = ReactNode

/** Ссылка на файл/диапазон в чате. */
export interface IChatCodeReference {
    /** Путь к файлу в репозитории. */
    readonly filePath: string
    /** Номер начальной строки. */
    readonly lineStart?: number
    /** Номер финальной строки (если диапазон). */
    readonly lineEnd?: number
}

interface IChatMessageBubbleProps {
    /** Сообщение для рендера. */
    readonly message: IChatPanelMessage
    /** Признак короткого отображения. */
    readonly compact?: boolean
    /** Callback клика по ссылке на код. */
    readonly onCodeReferenceClick?: (reference: IChatCodeReference) => void
    /** Callback hover/focus по ссылке на код. */
    readonly onCodeReferencePreview?: (reference: IChatCodeReference) => void
}

const CODE_BLOCK_REGEXP = /```(\w+)?\n([\s\S]*?)```/g
const LINK_REGEXP = /^\[([^\]]+)\]\(([^)]+)\)$/
const MARKDOWN_TOKEN_REGEXP = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g
const PARSE_WORD_REGEXP = /[\s\S]/
const RESERVED_KEYWORDS = new Set([
    "async",
    "await",
    "class",
    "const",
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
    "var",
    "function",
])

function parseLineNumber(value: string): number | undefined {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed) === false || parsed < 1) {
        return undefined
    }

    return parsed
}

function parseCodeReference(value: string): IChatCodeReference | undefined {
    const normalized = value.trim()
    if (normalized.includes("://")) {
        return undefined
    }

    const fileRangeMatch = normalized.match(
        /^(\.?\.?\/?(?:[\w.-]+[\\/])*[\w.-]+\.[\w-]+)(?::(\d+))?(?:-(\d+))?(?:#L?(\d+))?(?:-L?(\d+))?$/,
    )
    const fileOnlyMatch = normalized.match(
        /^(\.?\.?\/?(?:[\w.-]+[\\/])*[\w.-]+\.[\w-]+)$/,
    )
    if (fileRangeMatch === null && fileOnlyMatch === null) {
        return undefined
    }

    if (fileRangeMatch !== null) {
        const [
            ,
            filePath,
            lineStart,
            lineEnd,
            hashLineStart,
            hashLineEnd,
        ] = fileRangeMatch
        const parsedLineStart = parseLineNumber(lineStart ?? "")
        const parsedLineEnd = parseLineNumber(lineEnd ?? "")
        const parsedHashStart = parseLineNumber(hashLineStart ?? "")
        const parsedHashEnd = parseLineNumber(hashLineEnd ?? "")

        return {
            filePath,
            lineStart: parsedLineStart ?? parsedHashStart,
            lineEnd: parsedLineEnd ?? parsedHashEnd,
        }
    }

    return { filePath: fileOnlyMatch[1] ?? "" }
}

function buildReferenceLabel(reference: IChatCodeReference): string {
    if (reference.lineStart === undefined) {
        return reference.filePath
    }

    if (reference.lineEnd === undefined || reference.lineEnd === reference.lineStart) {
        return `${reference.filePath}:${String(reference.lineStart)}`
    }

    return `${reference.filePath}:${String(reference.lineStart)}-${String(reference.lineEnd)}`
}

function renderCodeReferenceLink(
    label: string,
    href: string,
    keyPrefix: string,
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
): ReactElement {
    const reference = parseCodeReference(href)
    if (reference === undefined) {
        return (
            <a
                className="text-[var(--primary)] underline underline-offset-4"
                href={href}
                key={keyPrefix}
                rel="noreferrer"
                target="_blank"
            >
                {label}
            </a>
        )
    }

    const handleHoverOrFocus = (): void => {
        onCodeReferencePreview?.(reference)
    }
    const shouldHandle = onCodeReferenceClick !== undefined || onCodeReferencePreview !== undefined

    return (
        <a
            aria-label={`Code reference ${buildReferenceLabel(reference)}`}
            className="text-[var(--primary)] underline underline-offset-4"
            href={shouldHandle ? "#" : href}
            key={keyPrefix}
            onClick={(
                event: MouseEvent<HTMLAnchorElement>,
            ): void => {
                if (onCodeReferenceClick === undefined) {
                    return
                }

                event.preventDefault()
                onCodeReferenceClick(reference)
            }}
            onFocus={handleHoverOrFocus}
            onMouseEnter={handleHoverOrFocus}
        >
            {label}
        </a>
    )
}

function isValidDate(value: string | Date | undefined): value is Date {
    if (value === undefined) {
        return false
    }

    const date = typeof value === "string" ? new Date(value) : value
    return Number.isNaN(date.getTime()) === false
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
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
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
                    renderCodeReferenceLink(
                        normalizedLink[1] ?? "",
                        normalizedLink[2] ?? "",
                        `${keyPrefix}-inline-link-${String(tokenIndex)}`,
                        onCodeReferenceClick,
                        onCodeReferencePreview,
                    ),
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

function parseCodeToken(line: string, keyPrefix: string): ReactElement {
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
                <span className="text-emerald-400" key={`${keyPrefix}-string-${String(index)}`}>
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
    isExpanded: boolean,
    onCopy: (text: string) => void,
    onToggleExpand: () => void,
): ReactElement {
    const lines = source.split("\n")
    const className = isExpanded
        ? "max-h-none"
        : "max-h-36 overflow-hidden"

    const copyCode = async (): Promise<void> => {
        await onCopy(source)
    }

    return (
        <section aria-label={`Code block ${keyPrefix}`} className="space-y-2" key={keyPrefix}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-[var(--foreground)]/70">
                    {language}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        aria-label={`Copy code block ${keyPrefix}`}
                        isIconOnly
                        onPress={(): void => {
                            void copyCode()
                        }}
                        radius="sm"
                        size="sm"
                        variant="light"
                    >
                        ↪
                    </Button>
                    <Button
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} code block ${keyPrefix}`}
                        isIconOnly
                        onPress={onToggleExpand}
                        radius="sm"
                        size="sm"
                        variant="light"
                    >
                        {isExpanded ? "▾" : "▸"}
                    </Button>
                </div>
            </div>
            <pre className={`overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm transition-[max-height] ${className}`}>
                <code
                    className={`language-${language} block whitespace-pre`}
                    lang={language}
                >
                    {lines.map(
                        (line, index): ReactElement => (
                            <span key={`${keyPrefix}-line-${String(index)}`} className="block">
                                {parseCodeToken(line, `${keyPrefix}-line-${String(index)}`)}
                            </span>
                        ),
                    )}
                </code>
            </pre>
        </section>
    )
}

function pushParagraphBlock(
    blocks: ReactElement[],
    lines: string[],
    keyPrefix: string,
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
): void {
    if (lines.length === 0) {
        return
    }

    const paragraphLines = lines.join("\n")
    const paragraphChunks = paragraphLines.split("\n")
    blocks.push(
        <p className="leading-relaxed text-[var(--foreground)]" key={`paragraph-${keyPrefix}`}>
            {paragraphChunks.map((line, index): TMarkdownNode | TMarkdownNode[] => {
                const parsedLine = parseInlineMarkdown(
                    line,
                    `${keyPrefix}-${String(index)}`,
                    onCodeReferenceClick,
                    onCodeReferencePreview,
                )
                if (index === paragraphChunks.length - 1) {
                    return parsedLine
                }

                return [...parsedLine, <br key={`${keyPrefix}-br-${String(index)}`} />]
            })}
        </p>,
    )
    lines.length = 0
}

function parseTextBlocks(
    source: string,
    keyPrefix: string,
    expandedCodeBlocks: Set<string>,
    onCodeCopy: (text: string) => void,
    onCodeToggle: (index: number) => void,
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
): ReadonlyArray<ReactElement> {
    const lines = source.split("\n")
    const blocks: ReactElement[] = []
    const paragraphLines: string[] = []
    let listLines: string[] = []
    let blockIndex = 0

    const flushParagraph = (): void => {
        pushParagraphBlock(
            blocks,
            paragraphLines,
            `${keyPrefix}-p-${String(blockIndex)}`,
            onCodeReferenceClick,
            onCodeReferencePreview,
        )
    }

    const flushList = (): void => {
        if (listLines.length === 0) {
            return
        }

        blocks.push(
            <ul className="list-disc space-y-1 pl-6" key={`list-${keyPrefix}-${String(blockIndex)}`}>
                {listLines.map(
                    (item, index): ReactElement => (
                        <li key={`list-item-${String(index)}`}>
                            {parseInlineMarkdown(
                                item.slice(2).trim(),
                                `${keyPrefix}-list-${String(index)}`,
                                onCodeReferenceClick,
                                onCodeReferencePreview,
                            )}
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
            const content = parseInlineMarkdown(
                headingContent,
                `${keyPrefix}-heading-${String(blockIndex)}`,
                onCodeReferenceClick,
                onCodeReferencePreview,
            )

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

function parseMarkdownMessage(
    source: string,
    onCodeCopy: (text: string) => void,
    expandedCodeBlocks: Set<string>,
    onCodeToggle: (index: number) => void,
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
): ReadonlyArray<ReactElement> {
    const nodes: ReactElement[] = []
    CODE_BLOCK_REGEXP.lastIndex = 0
    let match = CODE_BLOCK_REGEXP.exec(source)
    let lastIndex = 0
    let blockIndex = 0

    while (match !== null) {
        const matchStart = match.index
        const matchEnd = CODE_BLOCK_REGEXP.lastIndex
        const language = getLanguageFromCodeBlock(match[1])
        const blockId = `code-${String(blockIndex)}`
        const sourceCode = match[2] ?? ""
        const textBefore = source.slice(lastIndex, matchStart)

        if (textBefore.length > 0) {
            nodes.push(
                ...parseTextBlocks(
                    textBefore,
                    `chat-block-${String(blockIndex)}-text`,
                    expandedCodeBlocks,
                    onCodeCopy,
                    onCodeToggle,
                    onCodeReferenceClick,
                    onCodeReferencePreview,
                ),
            )
            blockIndex += 1
        }

        nodes.push(
            parseCodeBlock(
                sourceCode,
                language,
                blockId,
                expandedCodeBlocks.has(blockId),
                onCodeCopy,
                (): void => {
                    onCodeToggle(blockIndex)
                },
            ),
        )
        blockIndex += 1
        lastIndex = matchEnd
        match = CODE_BLOCK_REGEXP.exec(source)
    }

    const tail = source.slice(lastIndex)
    if (tail.length > 0) {
        nodes.push(
            ...parseTextBlocks(
                tail,
                `chat-block-${String(blockIndex)}-tail`,
                expandedCodeBlocks,
                onCodeCopy,
                onCodeToggle,
                onCodeReferenceClick,
                onCodeReferencePreview,
            )
        )
    }

    if (nodes.length === 0 && PARSE_WORD_REGEXP.test(source) === false) {
        nodes.push(
            <p key="empty" className="text-sm text-[var(--foreground)]/60">
                — 
            </p>,
        )
    }

    return nodes
}

function copyToClipboard(content: string): void {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
        return
    }

    void navigator.clipboard.writeText(content)
}

/**
 * Блок сообщения для чат-панели.
 */
export function ChatMessageBubble(props: IChatMessageBubbleProps): ReactElement {
    const [expandedBlockIndexes, setExpandedBlockIndexes] = useState<Set<number>>(new Set())

    const roleLabel =
        props.message.role === "user"
            ? "Вы"
            : props.message.role === "assistant"
              ? "Ассистент"
              : "Система"
    const sender = props.message.sender ?? roleLabel
    const isUser = props.message.role === "user"
    const formattedTime = formatMessageTime(props.message.createdAt)
    const compactClass = props.compact === true ? "max-w-full" : "max-w-[82%]"
    const expandedSet = new Set<string>(
        [...expandedBlockIndexes.values()].map((index): string => `code-${String(index)}`),
    )
    const avatarLabel = sender.slice(0, 2).toUpperCase()

    const handleCodeCopy = (content: string): void => {
        copyToClipboard(content)
    }

    const handleCodeToggle = (index: number): void => {
        setExpandedBlockIndexes((previous): Set<number> => {
            const next = new Set(previous)
            if (next.has(index)) {
                next.delete(index)
                return next
            }

            next.add(index)
            return next
        })
    }

    return (
        <li className={`flex ${isUser ? "justify-end" : "justify-start"}`} role="listitem">
            <article
                aria-label={`Сообщение от ${sender}`}
                className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 text-sm ${compactClass} ${
                    isUser
                        ? "border-[var(--primary)] bg-[color:color-mix(in oklab, var(--primary) 12%, var(--surface))]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                }`}
            >
                <header className="mb-0.5 flex items-start gap-2">
                    <Avatar
                        fallback={avatarLabel}
                        name={sender}
                        size="sm"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--foreground)]">
                            {sender}
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">
                            {formattedTime}
                        </p>
                    </div>
                    <Button
                        aria-label={`Copy message ${sender}`}
                        isIconOnly
                        onPress={(): void => {
                            copyToClipboard(props.message.content)
                        }}
                        radius="sm"
                        size="sm"
                        variant="light"
                    >
                        ⧉
                    </Button>
                </header>

                <div className="space-y-2">
                    {parseMarkdownMessage(
                        props.message.content,
                        handleCodeCopy,
                        expandedSet,
                        handleCodeToggle,
                        props.onCodeReferenceClick,
                        props.onCodeReferencePreview,
                    ).map(
                        (node, index): ReactElement => <div key={`node-${String(index)}`}>{node}</div>,
                    )}
                </div>
            </article>
        </li>
        )
}
