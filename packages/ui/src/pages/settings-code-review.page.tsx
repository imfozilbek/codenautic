import { type FormEvent, type ReactElement, useState } from "react"

import { Button } from "@/components/ui"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { IgnorePathsEditor } from "@/components/settings/ignore-paths-editor"
import { CodeReviewForm } from "@/components/settings/code-review-form"
import { RuleEditor } from "@/components/settings/rule-editor"
import type { ICodeReviewFormValues } from "@/components/settings/settings-form-schemas"

const DEFAULT_IGNORED_PATHS: ReadonlyArray<string> = ["/dist", "/node_modules", "/coverage"] as const

/**
 * Страница настроек code-review.
 *
 * @returns Форма управления cadence/severity/suggestions + ignore paths.
 */
export function SettingsCodeReviewPage(): ReactElement {
    const [formValues, setFormValues] = useState<ICodeReviewFormValues>({
        cadence: "daily",
        enableDriftSignals: true,
        severity: "medium",
        suggestionsLimit: 8,
    })
    const [ignoredPaths, setIgnoredPaths] = useState<ReadonlyArray<string>>(DEFAULT_IGNORED_PATHS)
    const [rulesText, setRulesText] = useState<string>("### Default review rules\n- Ensure each change has context.\n- Keep patches minimal.")

    const saveReviewForm = (nextValues: ICodeReviewFormValues): void => {
        setFormValues(nextValues)
        showToastSuccess("Code Review settings saved.")
    }

    const handlePathsChange = (nextPaths: ReadonlyArray<string>): void => {
        setIgnoredPaths(nextPaths)
        showToastSuccess("Ignore paths updated.")
    }

    const handlePathReset = (event: FormEvent): void => {
        event.preventDefault()
        setIgnoredPaths(DEFAULT_IGNORED_PATHS)
        showToastInfo("Ignore paths reset to defaults.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Code Review Configuration</h1>
            <p className="text-sm text-slate-600">
                Configure cadence, severity threshold и ignore path rules for automated review.
            </p>
            <CodeReviewForm initialValues={formValues} onSubmit={saveReviewForm} />
            <IgnorePathsEditor
                helperText="Игнорируемые пути используются как фильтр для сканирования и выдачи CCR."
                ignoredPaths={ignoredPaths}
                onChange={handlePathsChange}
            />
            <RuleEditor
                id="code-review-rules-editor"
                label="Review rules"
                maxLength={4000}
                onChange={setRulesText}
                value={rulesText}
            />
            <form onSubmit={handlePathReset}>
                <Button
                    type="submit"
                    className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                >
                    Reset ignore paths
                </Button>
            </form>
        </section>
    )
}
