import { type ReactElement } from "react"

import { Button } from "@/components/ui"
import type { TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"

export interface IDryRunResultViewerIssue {
    readonly filePath: string
    readonly severity: "low" | "medium" | "high"
    readonly title: string
}

export interface IDryRunResultViewerData {
    readonly mode: TRepoReviewMode
    readonly reviewedFiles: number
    readonly suggestions: number
    readonly issues: ReadonlyArray<IDryRunResultViewerIssue>
}

interface IDryRunResultViewerProps {
    readonly isRunning?: boolean
    readonly onRunDryRun: () => void
    readonly result?: IDryRunResultViewerData
}

/**
 * Показывает результаты dry-run ревью перед запуском полного пайплайна.
 *
 * @param props - callbacks и текущий снимок dry-run.
 * @returns Карточка с запуском, summary и списком найденных подсказок.
 */
export function DryRunResultViewer(props: IDryRunResultViewerProps): ReactElement {
    return (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">Dry-run results</h2>
            <p className="text-sm text-slate-600">
                Preview review findings before switching cadence or running full automation.
            </p>
            <Button
                isDisabled={props.isRunning === true}
                type="button"
                variant="solid"
                onPress={props.onRunDryRun}
            >
                {props.isRunning === true ? "Running dry-run..." : "Run dry-run"}
            </Button>
            {props.result === undefined ? (
                <p className="text-xs text-slate-500" data-testid="dry-run-empty">
                    Run dry-run to preview current review output.
                </p>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm text-slate-700" data-testid="dry-run-summary">
                        {`Mode: ${props.result.mode} · Reviewed files: ${props.result.reviewedFiles} · Suggestions: ${props.result.suggestions}`}
                    </p>
                    <ul className="space-y-1 text-xs text-slate-600">
                        {props.result.issues.map((issue): ReactElement => (
                            <li key={`${issue.filePath}-${issue.title}`} data-testid="dry-run-issue-row">
                                {`${issue.filePath} · ${issue.severity.toUpperCase()} · ${issue.title}`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}
