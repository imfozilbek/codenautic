import type { ReactElement, ReactNode } from "react"
import ReactMarkdown from "react-markdown"

import type { Components } from "react-markdown"

/** Свойства превью rule-editor. */
export interface IRuleEditorMarkdownPreviewProps {
    /** Markdown для рендера. */
    readonly content: string
}

function CodeBlock(props: { readonly children?: ReactNode }): ReactElement {
    return (
        <pre className="overflow-x-auto rounded-md border border-border bg-slate-900 p-3 text-sm text-slate-100">
            {props.children}
        </pre>
    )
}

/**
 * Превью markdown с поддержкой code block.
 *
 * @param props Контент для рендера.
 * @returns Rendered preview.
 */
export default function RuleEditorMarkdownPreview(
    props: IRuleEditorMarkdownPreviewProps,
): ReactElement {
    const components: Components = {
        code({ className, children }): ReactElement {
            const rawContent = typeof children === "string" ? children : ""
            const isInline = className === undefined && rawContent.includes("\n") === false

            return isInline ? <code>{children}</code> : <CodeBlock children={children} />
        },
    }

    return (
        <article className="prose prose-slate max-w-none rounded-md border border-border bg-surface p-3 text-sm">
            <ReactMarkdown components={components}>{props.content}</ReactMarkdown>
        </article>
    )
}
