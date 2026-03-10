import { type FormEvent, type ReactElement, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Textarea } from "@/components/ui"
import { sanitizeTextInput } from "@/lib/validation/schema-validation"

/** Параметры file pattern editor для ignore-правил. */
export interface IIgnorePatternEditorProps {
    /** Текущие ignore patterns. */
    readonly ignoredPatterns: ReadonlyArray<string>
    /** Обработчик сохранения паттернов. */
    readonly onChange: (patterns: ReadonlyArray<string>) => void
    /** Дополнительное описание под полем. */
    readonly helperText?: string
}

function normalizePatterns(value: string): ReadonlyArray<string> {
    return Array.from(
        new Set(
            value
                .split("\n")
                .map((item): string => sanitizeTextInput(item).value.trim())
                .filter((item): boolean => item.length > 0),
        ),
    )
}

/**
 * Редактор ignore-паттернов (по одному шаблону на строку).
 *
 * @param props Параметры редактора.
 * @returns Поле ввода + action-кнопка сохранения паттернов.
 */
export function IgnorePatternEditor(props: IIgnorePatternEditorProps): ReactElement {
    const { t } = useTranslation(["settings"])
    const [rawValue, setRawValue] = useState<string>(() => props.ignoredPatterns.join("\n"))
    const textareaId = "ignore-pattern-editor"
    const normalizedPatterns = useMemo(
        (): ReadonlyArray<string> => normalizePatterns(rawValue),
        [rawValue],
    )

    useEffect((): void => {
        const nextValue = props.ignoredPatterns.join("\n")
        setRawValue((previous): string => {
            if (previous === nextValue) {
                return previous
            }
            return nextValue
        })
    }, [props.ignoredPatterns])

    const applyChanges = (event: FormEvent): void => {
        event.preventDefault()
        props.onChange(normalizedPatterns)
    }

    return (
        <form className="space-y-3" onSubmit={applyChanges}>
            <label className="text-sm font-medium text-foreground" htmlFor={textareaId}>
                {t("settings:ignorePatternEditor.label")}
            </label>
            <Textarea
                aria-label={t("settings:ignorePatternEditor.label")}
                id={textareaId}
                rows={6}
                value={rawValue}
                onValueChange={(value: string): void => {
                    setRawValue(value)
                }}
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    {props.helperText ?? t("settings:ignorePatternEditor.defaultHelper")}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="ignore-pattern-count">
                    {t("settings:ignorePatternEditor.patternCount", {
                        count: normalizedPatterns.length,
                    })}
                </p>
            </div>
            <Button type="submit" variant="solid">
                {t("settings:ignorePatternEditor.saveIgnorePatterns")}
            </Button>
        </form>
    )
}
