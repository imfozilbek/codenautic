import type { ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import { Alert, Button } from "@heroui/react"

import type { IOnboardingWizardState } from "../use-onboarding-wizard-state"
import {
    mapBulkStatusClasses,
    mapBulkProgressClasses,
    isBulkScanTerminal,
} from "../onboarding-templates"
import type { TBulkScanStatus } from "../onboarding-wizard-types"

/**
 * Маппинг статуса bulk-задачи на i18n ключ.
 */
const BULK_STATUS_KEYS: Record<TBulkScanStatus, string> = {
    running: "onboarding:bulk.statusRunning",
    queued: "onboarding:bulk.statusQueued",
    paused: "onboarding:bulk.statusPaused",
    completed: "onboarding:bulk.statusCompleted",
    cancelled: "onboarding:bulk.statusCancelled",
    error: "onboarding:bulk.statusError",
}

/**
 * Параметры компонента мониторинга bulk-задач.
 */
export interface IBulkScanJobsMonitorProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Таблица задач массового сканирования с управлением (пауза, возобновление, отмена).
 *
 * @param props Конфигурация.
 * @returns Компонент мониторинга bulk-задач или null.
 */
export function BulkScanJobsMonitor({ state }: IBulkScanJobsMonitorProps): ReactElement | null {
    const { t } = useTranslation(["onboarding"])
    const { td } = useDynamicTranslation(["onboarding"])

    if (state.isSingleMode || state.isStarted === false) {
        return null
    }

    if (state.activeStep !== 2) {
        return null
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("onboarding:bulk.progressTitle")}</p>
                <div className="flex gap-2">
                    <Button
                        isDisabled={state.isBulkPaused}
                        onPress={(): void => {
                            state.handlePauseAll()
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                    >
                        {t("onboarding:bulk.pauseButton")}
                    </Button>
                    <Button
                        isDisabled={state.isBulkPaused === false}
                        onPress={(): void => {
                            state.handleResumeAll()
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                    >
                        {t("onboarding:bulk.resumeButton")}
                    </Button>
                    <Button
                        variant="danger"
                        onPress={(): void => {
                            state.handleCancelAll()
                        }}
                        size="sm"
                        type="button"
                    >
                        {t("onboarding:bulk.cancelAllButton")}
                    </Button>
                </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-border p-2 text-sm">
                <p>
                    {td("onboarding:bulk.summaryLine", {
                        running: String(state.bulkSummary.running),
                        queued: String(state.bulkSummary.queued),
                        paused: String(state.bulkSummary.paused),
                        error: String(state.bulkSummary.error),
                        completed: String(state.bulkSummary.completed),
                        cancelled: String(state.bulkSummary.cancelled),
                    })}
                </p>

                {state.bulkJobs.map(
                    (job): ReactElement => (
                        <article
                            className={`rounded-md border p-3 ${mapBulkStatusClasses(job.status)}`}
                            key={job.id}
                        >
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{job.repositoryUrl}</p>
                                <span
                                    className={`rounded-full border px-2 py-1 text-xs ${mapBulkStatusClasses(job.status)}`}
                                >
                                    {td(BULK_STATUS_KEYS[job.status])}
                                </span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-surface-secondary">
                                <div
                                    aria-label={`scan progress bar ${job.repositoryUrl}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={job.progress}
                                    className={`h-2 rounded-full transition-[width] duration-300 ${mapBulkProgressClasses(job.status)}`}
                                    role="progressbar"
                                    style={{
                                        width: `${job.progress}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-1 text-xs text-muted">
                                {td("onboarding:bulk.progressLabel", {
                                    value: String(job.progress),
                                })}
                            </p>

                            {job.errorMessage === undefined ? null : (
                                <Alert status="danger" className="mt-2">
                                    {job.errorMessage}
                                </Alert>
                            )}
                            {job.errorDetails === undefined ||
                            job.errorDetails.length === 0 ? null : (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs font-semibold">
                                        {t("onboarding:bulk.errorDetailsTitle")}
                                    </summary>
                                    <ul className="mt-1 list-disc pl-5 text-xs">
                                        {job.errorDetails.map(
                                            (detail, index): ReactElement => (
                                                <li key={`${job.id}-detail-${String(index)}`}>
                                                    {detail}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </details>
                            )}

                            <div className="mt-2 flex gap-2">
                                {job.status === "error" ? (
                                    <Button
                                        variant="danger"
                                        onPress={(): void => {
                                            state.handleRetryJob(job.id)
                                        }}
                                        size="sm"
                                        type="button"
                                    >
                                        {t("onboarding:bulk.retryButton")}
                                    </Button>
                                ) : null}
                                {isBulkScanTerminal(job.status) ||
                                job.status === "paused" ? null : (
                                    <Button
                                        variant="danger"
                                        onPress={(): void => {
                                            state.handleCancelJob(job.id)
                                        }}
                                        size="sm"
                                        type="button"
                                    >
                                        {t("onboarding:bulk.cancelButton")}
                                    </Button>
                                )}
                            </div>
                        </article>
                    ),
                )}
            </div>
        </section>
    )
}
