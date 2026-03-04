import { useMemo } from "react"
import type { ReactElement } from "react"

import { useVirtualizedList } from "@/lib/hooks/use-virtualized-list"
import type {
    ICcrDiffFile,
    ICcrDiffLine,
    TCcrDiffLineType,
    ICcrDiffComment,
} from "@/pages/ccr-data"

const DIFF_TOKEN_PATTERN =
    /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`|\/\/.*$|\b\d+\b|\b(?:async|await|break|case|const|continue|else|export|for|function|if|import|let|return|switch|try|type|throw|class|const|while|yield)\b)/g

const DIFF_KEYWORDS = new Set([
    "async",
    "await",
    "break",
    "case",
    "const",
    "continue",
    "else",
    "export",
    "for",
    "function",
    "if",
    "import",
    "let",
    "return",
    "switch",
    "throw",
    "try",
    "type",
    "while",
    "class",
    "yield",
])

interface ICodeDiffViewerProps {
    /** Диффы по файлам для отображения. */
    readonly files: ReadonlyArray<ICcrDiffFile>
}

interface ICodeLineProps {
    readonly side: "left" | "right"
    readonly line: ICcrDiffLine
    readonly diffType: TCcrDiffLineType
}

function getTokenClass(token: string): string {
    if (token.trim().length === 0) {
        return "text-slate-900"
    }

    if (token.startsWith('"') && token.endsWith('"')) {
        return "text-emerald-700"
    }

    if (token.startsWith("'") && token.endsWith("'")) {
        return "text-emerald-700"
    }

    if (token.startsWith("`") && token.endsWith("`")) {
        return "text-emerald-700"
    }

    if (token.startsWith("//")) {
        return "text-slate-500 italic"
    }

    if (/^\d+$/.test(token)) {
        return "text-violet-700"
    }

    if (DIFF_KEYWORDS.has(token)) {
        return "text-blue-700 font-semibold"
    }

    return "text-slate-900"
}

function renderHighlightedCode(code: string): ReactElement {
    const tokens = code.split(DIFF_TOKEN_PATTERN)

    return (
        <span className="text-left">
            {tokens.map(
                (token, tokenIndex): ReactElement => (
                    <span
                        key={`token-${String(tokenIndex)}`}
                        className={getTokenClass(token)}
                    >
                        {token}
                    </span>
                ),
            )}
        </span>
    )
}

function getLineStyleByType(type: TCcrDiffLineType): string {
    if (type === "removed") {
        return "bg-rose-50 border-l-4 border-rose-300"
    }

    if (type === "added") {
        return "bg-emerald-50 border-l-4 border-emerald-300"
    }

    return "bg-white"
}

function getLineNumber(lineValue: number | undefined): string {
    return lineValue === undefined ? "—" : String(lineValue)
}

function CodeDiffLine(props: ICodeLineProps): ReactElement {
    const isLeft = props.side === "left"
    const shouldRenderCode = props.diffType === "context" || (isLeft ? props.diffType !== "added" : props.diffType !== "removed")
    const text = isLeft ? props.line.leftText : props.line.rightText
    const lineNumber = isLeft ? props.line.leftLine : props.line.rightLine
    const lineClassName = isLeft
        ? props.diffType === "added"
            ? "bg-slate-100 text-slate-300"
            : "bg-white text-slate-700"
        : props.diffType === "removed"
            ? "bg-slate-100 text-slate-300"
            : "bg-white text-slate-700"

    const code = shouldRenderCode ? renderHighlightedCode(text) : null

    return (
        <div className={`grid ${isLeft ? "grid-cols-[3rem_1fr]" : "grid-cols-[3rem_1fr]"} items-stretch border-r border-slate-200`}>
            <div className={`border-r border-slate-200 px-2 py-1 text-right text-xs ${lineClassName}`}>
                {getLineNumber(lineNumber)}
            </div>
            <div className={`px-2 py-1 text-[11px] leading-5 font-mono ${lineClassName}`}>
                {code}
            </div>
        </div>
    )
}

function CodeDiffFilePanel(props: ICcrDiffFile): ReactElement {
    const fileData = props
    const lineCounts = useMemo((): { added: number; removed: number } => {
        let added = 0
        let removed = 0

        for (const line of fileData.lines) {
            if (line.type === "added") {
                added += 1
            }
            if (line.type === "removed") {
                removed += 1
            }
        }

        return { added, removed }
    }, [fileData.lines])

    const virtualizer = useVirtualizedList({
        count: fileData.lines.length,
        estimateSize: (index): number =>
            fileData.lines[index]?.comments && fileData.lines[index].comments.length > 0 ? 86 : 44,
        overscan: 5,
    })

    return (
        <section className="rounded-lg border border-slate-200">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">{fileData.filePath}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                    +{String(lineCounts.added)} / -{String(lineCounts.removed)}
                </span>
                <span className="text-xs text-slate-500">Язык: {fileData.language}</span>
            </header>
            <div className="overflow-x-auto">
                <div
                    aria-label={`Diff lines for ${fileData.filePath}`}
                    className="relative max-h-96 overflow-auto border-b border-slate-200"
                    ref={virtualizer.parentRef}
                >
                    <div style={{ height: `${virtualizer.totalSize}px` }} className="relative w-max">
                        {virtualizer.virtualItems.map((virtualItem): ReactElement | null => {
                            const line = fileData.lines[virtualItem.index]
                            if (line === undefined) {
                                return null
                            }

                            const lineStyle = getLineStyleByType(line.type)
                            const hasComments = (line.comments ?? []).length > 0

                            return (
                                <article
                                    key={`diff-line-${String(virtualItem.index)}`}
                                    role="row"
                                    style={virtualizer.getItemStyle(virtualItem)}
                                    className={`border-b border-slate-200 ${lineStyle}`}
                                >
                                    <div className="grid w-full min-w-[56rem] grid-cols-[1fr_1fr]">
                                        <CodeDiffLine diffType={line.type} line={line} side="left" />
                                        <CodeDiffLine diffType={line.type} line={line} side="right" />
                                    </div>
                                    {hasComments ? (
                                        <ul className="px-3 pb-2">
                                            {line.comments?.map(
                                                (comment: ICcrDiffComment): ReactElement => (
                                                    <li
                                                        key={`${comment.author}-${String(comment.line)}-${comment.side}`}
                                                        className="mt-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                                    >
                                                        <p className="font-medium">
                                                            {comment.author} ({comment.side}:{comment.line})
                                                        </p>
                                                        <p>{comment.message}</p>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    ) : null}
                                </article>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}

/** Viewer for review diff with side-by-side layout. */
export function CodeDiffViewer(props: ICodeDiffViewerProps): ReactElement {
    if (props.files.length === 0) {
        return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No available diff content for this CCR.
            </div>
        )
    }

    return (
        <section className="space-y-4" aria-label="Code diff viewer">
            <h2 className="text-xl font-semibold text-slate-900">Code diff</h2>
            {props.files.map(
                (file): ReactElement => (
                    <CodeDiffFilePanel {...file} key={file.filePath} />
                ),
            )}
        </section>
    )
}
