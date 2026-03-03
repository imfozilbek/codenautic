import {type FormEvent, type ReactElement, useState} from "react"

import {Alert} from "@/components/ui"
import {Button} from "@/components/ui"
import {IgnorePathsEditor} from "@/components/settings/ignore-paths-editor"
import {CodeReviewForm} from "@/components/settings/code-review-form"
import type {ICodeReviewFormValues} from "@/components/settings/code-review-form"

/** Параметры сохранённой настройки code-review. */
interface ICodeReviewSettingsState {
    /** Поле формы. */
    readonly formValues: ICodeReviewFormValues
    /** Список ignored paths. */
    readonly ignoredPaths: ReadonlyArray<string>
}

/**
 * Страница настроек code-review.
 *
 * @returns Форма управления cadence/severity/suggestions + ignore paths.
 */
export function SettingsCodeReviewPage(): ReactElement {
    const [state, setState] = useState<ICodeReviewSettingsState>({
        formValues: {
            cadence: "daily",
            enableDriftSignals: true,
            severity: "medium",
            suggestionsLimit: 8,
        },
        ignoredPaths: ["/dist", "/node_modules", "/coverage"],
    })
    const [feedbackMessage, setFeedbackMessage] = useState<string>("")
    const [pathMessage, setPathMessage] = useState<string>("")

    const saveReviewForm = (nextValues: ICodeReviewFormValues): void => {
        setState((previousValue): ICodeReviewSettingsState => ({...previousValue, formValues: nextValues}))
        setFeedbackMessage("Code Review settings saved.")
    }

    const handlePathsChange = (nextPaths: ReadonlyArray<string>): void => {
        setState((previousValue): ICodeReviewSettingsState => ({...previousValue, ignoredPaths: nextPaths}))
        setPathMessage("Ignore paths updated.")
    }

    const handlePathReset = (event: FormEvent): void => {
        event.preventDefault()
        setState((previousValue): ICodeReviewSettingsState => ({
            ...previousValue,
            ignoredPaths: ["/dist", "/node_modules", "/coverage"],
        }))
        setPathMessage("Ignore paths reset to defaults.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Code Review Configuration</h1>
            <p className="text-sm text-slate-600">
                Configure cadence, severity threshold и ignore path rules for automated review.
            </p>
            {feedbackMessage.length > 0 ? (
                <Alert color="success" title="Saved" variant="flat">
                    {feedbackMessage}
                </Alert>
            ) : null}
            <CodeReviewForm initialValues={state.formValues} onSubmit={saveReviewForm} />
            <IgnorePathsEditor
                helperText="Игнорируемые пути используются как фильтр для сканирования и выдачи CCR."
                ignoredPaths={state.ignoredPaths}
                onChange={handlePathsChange}
            />
            <form onSubmit={handlePathReset}>
                <Button
                    type="submit"
                    className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                >
                    Reset ignore paths
                </Button>
            </form>
            {pathMessage.length > 0 ? <Alert color="primary" title="Paths" variant="flat">{pathMessage}</Alert> : null}
        </section>
    )
}
