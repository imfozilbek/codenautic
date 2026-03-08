import type { MouseEvent, ReactElement, ReactNode } from "react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"

import { ChevronDown, ChevronRight, Copy } from "@/components/icons/app-icons"
import { Avatar, Button } from "@/components/ui"
import { sanitizeText } from "@/lib/validation/schema-validation"

import type { IChatPanelMessage } from "./chat-panel"

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

    const match = normalized.match(
        /^(.*?)(?::(\d+)(?::\d+)?)?(?:-(\d+)(?::\d+)?)?(?:#(L?\d+(?:C\d+)?(?:-L?\d+(?:C\d+)?)?))?$/,
    )
    if (match === null) {
        return undefined
    }

    const [, rawFilePath, lineStart, lineEnd, hashRange] = match
    const filePath = (rawFilePath ?? "").trim()
    const hasFileDelimiter =
        filePath.includes("/") || filePath.includes("\\") || filePath.includes(".")
    if (
        filePath.length === 0 ||
        filePath.endsWith("/") ||
        filePath.endsWith("\\") ||
        /\s/.test(filePath) ||
        hasFileDelimiter === false
    ) {
        return undefined
    }

    const hashMatch = (hashRange ?? "").match(/^L?(\d+)(?:C\d+)?(?:-L?(\d+)(?:C\d+)?)?$/)
    const parsedLineStart = parseLineNumber(lineStart ?? "")
    const parsedLineEnd = parseLineNumber(lineEnd ?? "")
    const parsedHashStart = parseLineNumber(hashMatch?.[1] ?? "")
    const parsedHashEnd = parseLineNumber(hashMatch?.[2] ?? "")
    const hasLineInfo =
        parsedLineStart !== undefined ||
        parsedLineEnd !== undefined ||
        parsedHashStart !== undefined ||
        parsedHashEnd !== undefined
    const hasPathDelimiter = filePath.includes("/") || filePath.includes("\\")
    const hasFileExtension = /\.[A-Za-z0-9-]+$/.test(filePath)

    if (hasFileExtension === false && (hasPathDelimiter === false || hasLineInfo === false)) {
        return undefined
    }

    return {
        filePath,
        lineStart: parsedLineStart ?? parsedHashStart,
        lineEnd: parsedLineEnd ?? parsedHashEnd,
    }
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

function readNodeText(children: ReactNode): string {
    if (typeof children === "string" || typeof children === "number") {
        return String(children)
    }

    if (Array.isArray(children) === false) {
        return ""
    }

    return children
        .map((child): string => {
            if (typeof child === "string" || typeof child === "number") {
                return String(child)
            }

            if (child === null || child === undefined || typeof child === "boolean") {
                return ""
            }

            return ""
        })
        .join("")
}

function renderCodeReferenceLink(
    href: string,
    label: string,
    onCodeReferenceClick?: (reference: IChatCodeReference) => void,
    onCodeReferencePreview?: (reference: IChatCodeReference) => void,
): ReactElement {
    const referenceCandidate = href.trim().length > 0 ? href : label
    const reference = parseCodeReference(referenceCandidate)
    if (reference === undefined) {
        return (
            <a
                className="text-primary underline underline-offset-4"
                href={href}
                onClick={(event: MouseEvent<HTMLAnchorElement>): void => {
                    const isInternalHref = href.startsWith("/")
                    if (isInternalHref === false) {
                        return
                    }

                    event.preventDefault()
                    if (typeof window === "undefined" || typeof window.open !== "function") {
                        return
                    }

                    window.open(href, "_blank", "noopener,noreferrer")
                }}
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
            className="text-primary underline underline-offset-4"
            href={shouldHandle ? "#" : href}
            onClick={(event: MouseEvent<HTMLAnchorElement>): void => {
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

function parseCodeBlockLanguage(className: string | undefined): string {
    if (typeof className !== "string") {
        return "text"
    }

    const language = className.match(/language-(\S+)/)?.[1]
    if (language === undefined || language.length === 0) {
        return "text"
    }

    return language.toLowerCase()
}

function copyToClipboard(content: string): void {
    if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
        return
    }

    void navigator.clipboard.writeText(content)
}

function parseMessageCodeBlock(
    source: string,
    language: string,
    keyPrefix: string,
    isExpanded: boolean,
    onCopy: (text: string) => void,
    onToggleExpand: () => void,
): ReactElement {
    const className = isExpanded ? "max-h-none" : "max-h-36 overflow-hidden"
    const blockClassName = [
        "overflow-x-auto rounded-md border border-border bg-background",
        "p-3 text-sm transition-[max-height]",
        className,
    ].join(" ")

    const copyCode = (): void => {
        onCopy(source)
    }

    return (
        <section aria-label={`Code block ${keyPrefix}`} className="space-y-2" key={keyPrefix}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-foreground/70">{language}</p>
                <div className="flex items-center gap-2">
                    <Button
                        aria-label={`Copy code block ${keyPrefix}`}
                        isIconOnly
                        onPress={(): void => {
                            copyCode()
                        }}
                        radius="sm"
                        size="sm"
                        variant="light"
                    >
                        <Copy aria-hidden className="size-4" />
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
                        {isExpanded ? (
                            <ChevronDown aria-hidden className="size-4" />
                        ) : (
                            <ChevronRight aria-hidden className="size-4" />
                        )}
                    </Button>
                </div>
            </div>
            <pre className={blockClassName}>
                <code className={`language-${language} block whitespace-pre`} lang={language}>
                    {source}
                </code>
            </pre>
        </section>
    )
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
    const avatarLabel = sender.slice(0, 2).toUpperCase()
    const messageContent = sanitizeText(props.message.content)
    let blockIndex = 0

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

    const markdownComponents: Components = {
        h1: ({ children }): ReactElement => <h3 className="text-lg font-semibold">{children}</h3>,
        h2: ({ children }): ReactElement => <h4 className="text-base font-semibold">{children}</h4>,
        h3: ({ children }): ReactElement => <h5 className="text-sm font-semibold">{children}</h5>,
        h4: ({ children }): ReactElement => <h6 className="text-sm font-semibold">{children}</h6>,
        h5: ({ children }): ReactElement => <h6 className="text-xs font-semibold">{children}</h6>,
        h6: ({ children }): ReactElement => <h6 className="text-xs font-semibold">{children}</h6>,
        p: ({ children }): ReactElement => (
            <p className="leading-relaxed text-foreground">{children}</p>
        ),
        ul: ({ children }): ReactElement => (
            <ul className="list-disc space-y-1 pl-6">{children}</ul>
        ),
        code: (markdownCodeProps): ReactElement => {
            const sourceValue = readNodeText(markdownCodeProps.children)
            const isInline =
                markdownCodeProps.className === undefined && sourceValue.includes("\n") === false
            if (isInline === true) {
                return (
                    <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-sm">
                        {markdownCodeProps.children}
                    </code>
                )
            }

            const source = sourceValue.replace(/^\n+/, "").replace(/\n+$/, "")
            const language = parseCodeBlockLanguage(markdownCodeProps.className)
            const key = `code-${String(blockIndex)}`
            const currentIndex = blockIndex

            blockIndex += 1

            return parseMessageCodeBlock(
                source,
                language,
                key,
                expandedBlockIndexes.has(currentIndex),
                handleCodeCopy,
                (): void => {
                    handleCodeToggle(currentIndex)
                },
            )
        },
        a: ({ href, children }): ReactElement => {
            const targetHref = typeof href === "string" ? href : ""
            const label = readNodeText(children)

            return renderCodeReferenceLink(
                targetHref,
                label,
                props.onCodeReferenceClick,
                props.onCodeReferencePreview,
            )
        },
    }

    return (
        <li className={`flex ${isUser ? "justify-end" : "justify-start"}`} role="listitem">
            <article
                aria-label={`Сообщение от ${sender}`}
                className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 text-sm ${compactClass} ${
                    isUser
                        ? "border-primary bg-[color:color-mix(in oklab, var(--primary) 12%, var(--surface))]"
                        : "border-border bg-surface"
                }`}
            >
                <header className="mb-0.5 flex items-start gap-2">
                    <Avatar fallback={avatarLabel} name={sender} size="sm" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">{sender}</p>
                        <p className="text-xs text-foreground/70">{formattedTime}</p>
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
                        <Copy aria-hidden className="size-4" />
                    </Button>
                </header>

                <div className="space-y-2">
                    {messageContent.length === 0 ? (
                        <p className="text-sm text-foreground/60">—</p>
                    ) : (
                        <ReactMarkdown components={markdownComponents}>
                            {messageContent}
                        </ReactMarkdown>
                    )}
                </div>
            </article>
        </li>
    )
}
