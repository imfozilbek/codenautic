import { lazy, Suspense, type ReactElement, useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import type { IRuleEditorMarkdownPreviewProps } from "./rule-editor-markdown-preview"

const LazyRuleEditorPreview = lazy(
    (): Promise<{
        default: (props: IRuleEditorMarkdownPreviewProps) => ReactElement
    }> => import("./rule-editor-markdown-preview"),
)

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
    try {
        const importChecks = await Promise.all([
            canImportModule("@tiptap/react"),
            canImportModule("@tiptap/starter-kit"),
            canImportModule("@tiptap/extension-code-block"),
        ])
        return importChecks.every((isImported): boolean => isImported)
    } catch (_error: unknown) {
        return false
    }
}

async function canImportModule(moduleName: string): Promise<boolean> {
    try {
        await import(moduleName)
        return true
    } catch (_error: unknown) {
        return false
    }
}

/** Редактор markdown-правил с toolbar и live preview. */
export function RuleEditor(props: IRuleEditorProps): ReactElement {
    const { t } = useTranslation(["settings"])
    const {
        id,
        label,
        maxLength,
        onChange,
        placeholder = t("settings:ruleEditor.defaultPlaceholder"),
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

    useEffect(() => {
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
                <h2 className={TYPOGRAPHY.cardTitle}>{label}</h2>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Button color="primary" onPress={formatBold} size="sm" variant="solid">
                        {t("settings:ruleEditor.bold")}
                    </Button>
                    <Button color="primary" onPress={formatItalic} size="sm" variant="solid">
                        {t("settings:ruleEditor.italic")}
                    </Button>
                    <Button color="primary" onPress={formatHeading} size="sm" variant="solid">
                        {t("settings:ruleEditor.heading")}
                    </Button>
                    <Button color="primary" onPress={formatCodeBlock} size="sm" variant="solid">
                        {t("settings:ruleEditor.codeBlock")}
                    </Button>
                    <Button
                        color="primary"
                        onPress={(): void => {
                            setIsPreviewVisible((previousValue): boolean => !previousValue)
                        }}
                        size="sm"
                        variant="solid"
                    >
                        {isPreviewVisible === true
                            ? t("settings:ruleEditor.hidePreview")
                            : t("settings:ruleEditor.showPreview")}
                    </Button>
                </div>
                <p className={TYPOGRAPHY.captionMuted}>
                    {t("settings:ruleEditor.tipTapModeLabel")}
                    {tipTapLoadState === "loading"
                        ? t("settings:ruleEditor.tipTapLoading")
                        : tipTapLoadState === "ready"
                          ? t("settings:ruleEditor.tipTapReady")
                          : t("settings:ruleEditor.tipTapFallback")}
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
                <p id={characterCountId} className={TYPOGRAPHY.captionMuted}>
                    {t("settings:ruleEditor.symbolCount", { count: value.length })}
                </p>
                {maxLength === undefined ? null : (
                    <p
                        id={maxLengthId}
                        className={`text-xs ${value.length > maxLength ? "text-danger" : "text-muted-foreground"}`}
                    >
                        {t("settings:ruleEditor.maxSymbols", { max: maxLength })}
                    </p>
                )}
                {isPreviewVisible === false ? (
                    <p className="text-sm text-muted-foreground">
                        {t("settings:ruleEditor.previewHidden")}
                    </p>
                ) : (
                    <section
                        aria-live="polite"
                        aria-label={t("settings:ruleEditor.previewAriaLabel")}
                        id={previewId}
                    >
                        <Suspense
                            fallback={<p>{t("settings:ruleEditor.loadingPreview")}</p>}
                        >
                            <LazyRuleEditorPreview content={value} />
                        </Suspense>
                    </section>
                )}
            </CardBody>
        </Card>
    )
}
