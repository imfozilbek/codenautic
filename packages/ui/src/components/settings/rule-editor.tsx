import { lazy, Suspense, type ReactElement, useEffect, useId, useState } from "react"

import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import type { IRuleEditorMarkdownPreviewProps } from "./rule-editor-markdown-preview"

const LazyRuleEditorPreview = lazy((): Promise<{
    default: (props: IRuleEditorMarkdownPreviewProps) => ReactElement
}> => import("./rule-editor-markdown-preview"))

type TTipTapLoadState = "fallback" | "loading" | "ready"

/** Параметры редактора правил. */
export interface IRuleEditorProps {
    /** Идентификатор поля для a11y-связок. */
    readonly id?: string
    /** Метка редактора. */
    readonly label: string
    /** Значение markdown. */
    readonly value: string
    /** Изменение значения редактора. */
    readonly onChange: (value: string) => void
    /** Текст-заполнитель. */
    readonly placeholder?: string
    /** Порог допустимой длины. */
    readonly maxLength?: number
    /** Показать предпросмотр. */
    readonly showPreview?: boolean
}

function insertSurrounding(
    text: string,
    start: number,
    end: number,
    left: string,
    right: string,
): string {
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)
    return `${before}${left}${selected.length > 0 ? selected : "text"}${right}${after}`
}

function insertHeading(text: string, start: number, end: number): string {
    const before = text.slice(0, start)
    const after = text.slice(end)
    const lineStart = before.lastIndexOf("\n") + 1
    const lineToModify = text.slice(lineStart, end)
    if (lineToModify.startsWith("## ")) {
        return `${before.slice(0, before.length - lineToModify.length)}${lineToModify.replace(
            /^## /u,
            "",
        )}${after}`
    }

    return `${before}## ${lineToModify}${after}`
}

function insertCodeBlock(text: string, start: number, end: number): string {
    const selected = text.slice(start, end)
    const before = text.slice(0, start)
    const after = text.slice(end)
    const normalized = selected.length > 0 ? selected : "code"
    const block = `\n\`\`\`\n${normalized}\n\`\`\`\n`
    return `${before}${block}${after}`
}

async function canLoadTipTapCoreModules(): Promise<boolean> {
    const dynamicImport = new Function(
        "moduleName",
        "return import(moduleName)",
    ) as (moduleName: string) => Promise<unknown>

    try {
        const [reactAdapter, starterKit, codeBlockExtension] = await Promise.all([
            dynamicImport("@tiptap/react"),
            dynamicImport("@tiptap/starter-kit"),
            dynamicImport("@tiptap/extension-code-block"),
        ])

        return (
            reactAdapter !== undefined
            && starterKit !== undefined
            && codeBlockExtension !== undefined
        )
    } catch (_error: unknown) {
        return false
    }
}

/** Редактор markdown-правил с toolbar и live preview. */
export function RuleEditor(props: IRuleEditorProps): ReactElement {
    const {
        id,
        label,
        maxLength,
        onChange,
        placeholder = "Введите правила ревью в markdown...",
        showPreview = true,
        value,
    } = props
    const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(showPreview)
    const [tipTapLoadState, setTipTapLoadState] = useState<TTipTapLoadState>("loading")
    const fallbackId = useId()
    const editorId = id ?? `rule-editor-${fallbackId}`
    const textareaId = `${editorId}-input`
    const previewId = `${editorId}-preview`
    const characterCountId = `${editorId}-character-count`
    const maxLengthId = `${editorId}-max-length`

    useEffect((): void => {
        let isMounted = true

        void canLoadTipTapCoreModules().then((isAvailable): void => {
            if (isMounted !== true) {
                return
            }
            setTipTapLoadState(isAvailable ? "ready" : "fallback")
        })

        return (): void => {
            isMounted = false
        }
    }, [])

    const resolveTextarea = (): HTMLTextAreaElement | undefined => {
        if (typeof document === "undefined") {
            return undefined
        }

        const textarea = document.getElementById(textareaId)
        if (textarea instanceof HTMLTextAreaElement) {
            return textarea
        }

        return undefined
    }

    const applySelectionAction = (
        builder: (text: string, start: number, end: number) => string,
    ): void => {
        const textarea = resolveTextarea()
        if (textarea === undefined) {
            return
        }

        const start = textarea.selectionStart ?? 0
        const end = textarea.selectionEnd ?? start
        const nextValue = builder(textarea.value, start, end)
        onChange(nextValue)
    }

    const formatBold = (): void => {
        applySelectionAction((text, start, end): string => {
            return insertSurrounding(text, start, end, "**", "**")
        })
    }

    const formatItalic = (): void => {
        applySelectionAction((text, start, end): string => {
            return insertSurrounding(text, start, end, "*", "*")
        })
    }

    const formatHeading = (): void => {
        applySelectionAction(insertHeading)
    }

    const formatCodeBlock = (): void => {
        applySelectionAction(insertCodeBlock)
    }

    return (
        <Card>
            <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">{label}</h2>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Button onPress={formatBold} size="sm" variant="solid">
                        Bold
                    </Button>
                    <Button onPress={formatItalic} size="sm" variant="solid">
                        Italic
                    </Button>
                    <Button onPress={formatHeading} size="sm" variant="solid">
                        Heading
                    </Button>
                    <Button onPress={formatCodeBlock} size="sm" variant="solid">
                        Code block
                    </Button>
                    <Button
                        onPress={(): void => {
                            setIsPreviewVisible((previousValue): boolean => !previousValue)
                        }}
                        size="sm"
                        variant="solid"
                    >
                        {isPreviewVisible === true ? "Hide preview" : "Show preview"}
                    </Button>
                </div>
                <p className="text-xs text-slate-600">
                    TipTap mode:{" "}
                    {tipTapLoadState === "loading"
                        ? "loading"
                        : tipTapLoadState === "ready"
                          ? "ready (OSS core loaded via dynamic import)"
                          : "fallback markdown editor (TipTap unavailable)"}
                </p>
                <Textarea
                    aria-label={label}
                    aria-describedby={
                        maxLength === undefined
                            ? characterCountId
                            : `${characterCountId} ${maxLengthId}`
                    }
                    id={textareaId}
                    maxLength={maxLength}
                    onValueChange={onChange}
                    rows={10}
                    value={value}
                    placeholder={placeholder}
                />
                <p id={characterCountId} className="text-xs text-slate-600">
                    {String(value.length)} symbols
                </p>
                {maxLength === undefined ? null : (
                    <p
                        id={maxLengthId}
                        className={`text-xs ${value.length > maxLength ? "text-red-700" : "text-slate-600"}`}
                    >
                        Max {String(maxLength)} symbols
                    </p>
                )}
                {isPreviewVisible === false ? (
                    <p className="text-sm text-slate-600">Preview is hidden</p>
                ) : (
                    <section aria-live="polite" aria-label="Rule preview" id={previewId}>
                        <Suspense fallback={<p>Loading preview...</p>}>
                            <LazyRuleEditorPreview content={value} />
                        </Suspense>
                    </section>
                )}
            </CardBody>
        </Card>
    )
}
