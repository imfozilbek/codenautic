import { type ChangeEvent, type FormEvent, type ReactElement, useEffect, useState } from "react"

import { Textarea } from "@/components/ui"
import { Button } from "@/components/ui"
import { sanitizeTextInput } from "@/lib/validation/schema-validation"

/**
 * Параметры редактора ignore-patterns.
 */
export interface IIgnorePathsEditorProps {
    /** Текущие шаблоны игнорирования. */
    readonly ignoredPaths: ReadonlyArray<string>
    /** Изменение списка шаблонов. */
    readonly onChange: (paths: ReadonlyArray<string>) => void
    /** Дополнительный вспомогательный текст. */
    readonly helperText?: string
}

/**
 * Редактирование игнорируемых путей через textarea (line-per-pattern).
 *
 * @param props Параметры редактора.
 * @returns Поле для ввода ignore path patterns.
 */
export function IgnorePathsEditor(props: IIgnorePathsEditorProps): ReactElement {
    const [rawValue, setRawValue] = useState<string>(() => props.ignoredPaths.join("\n"))
    const textareaId = "ignore-paths-editor"

    useEffect((): void => {
        const nextValue = props.ignoredPaths.join("\n")
        setRawValue((previousValue): string => {
            if (previousValue === nextValue) {
                return previousValue
            }

            return nextValue
        })
    }, [props.ignoredPaths])

    const applyChanges = (event: FormEvent): void => {
        event.preventDefault()

        const nextValue = rawValue
            .split("\n")
            .map((item): string => sanitizeTextInput(item).value.trim())
            .filter((item): boolean => item.length > 0)

        props.onChange(Array.from(new Set(nextValue)))
    }

    const handleValueChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): void => {
        setRawValue(event.target.value)
    }

    return (
        <form className="space-y-3" onSubmit={applyChanges}>
            <label className="text-sm font-medium text-slate-700" htmlFor={textareaId}>
                Ignore paths
            </label>
            <Textarea
                id={textareaId}
                rows={6}
                value={rawValue}
                onChange={handleValueChange}
                onValueChange={setRawValue}
            />
            <p className="text-xs text-slate-500">{props.helperText ?? "Один шаблон на строку."}</p>
            <Button type="submit" variant="solid">
                Сохранить ignore paths
            </Button>
        </form>
    )
}
