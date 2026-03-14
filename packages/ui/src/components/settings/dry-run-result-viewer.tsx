import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@heroui/react"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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
    const { t } = useTranslation(["settings"])

    return (
        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <h2 className={TYPOGRAPHY.sectionTitle}>{t("settings:dryRunResultViewer.title")}</h2>
            <p className="text-sm text-muted-foreground">
                {t("settings:dryRunResultViewer.description")}
            </p>
            <Button
                variant="primary"
                isDisabled={props.isRunning === true}
                type="button"
                onPress={props.onRunDryRun}
            >
                {props.isRunning === true
                    ? t("settings:dryRunResultViewer.runningDryRun")
                    : t("settings:dryRunResultViewer.runDryRun")}
            </Button>
            {props.result === undefined ? (
                <p className={TYPOGRAPHY.captionMuted} data-testid="dry-run-empty">
                    {t("settings:dryRunResultViewer.emptyState")}
                </p>
            ) : (
                <div className="space-y-2">
                    <p className={TYPOGRAPHY.body} data-testid="dry-run-summary">
                        {t("settings:dryRunResultViewer.summaryLine", {
                            mode: props.result.mode,
                            files: props.result.reviewedFiles,
                            suggestions: props.result.suggestions,
                        })}
                    </p>
                    <ul className={`space-y-1 ${TYPOGRAPHY.captionMuted}`}>
                        {props.result.issues.map(
                            (issue): ReactElement => (
                                <li
                                    key={`${issue.filePath}-${issue.title}`}
                                    data-testid="dry-run-issue-row"
                                >
                                    {`${issue.filePath} · ${issue.severity.toUpperCase()} · ${issue.title}`}
                                </li>
                            ),
                        )}
                    </ul>
                </div>
            )}
        </section>
    )
}
