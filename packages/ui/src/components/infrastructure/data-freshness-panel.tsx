import { type ReactElement, useMemo, useState } from "react"

import { Button, Chip, Modal } from "@heroui/react"
import { useDynamicTranslation } from "@/lib/i18n"
import { TYPOGRAPHY } from "@/lib/constants/typography"

type TFreshnessState = "fresh" | "refreshing" | "stale"

interface IProvenanceContext {
    /** Источник данных. */
    readonly source: string
    /** Идентификатор scan/job. */
    readonly jobId: string
    /** Репозиторий источника. */
    readonly repository: string
    /** Целевая ветка. */
    readonly branch: string
    /** Коммит источника. */
    readonly commit: string
    /** Окно данных. */
    readonly dataWindow: string
    /** Есть ли частично доступные данные. */
    readonly isPartial: boolean
    /** Есть ли флаги фейлов/дефектов. */
    readonly hasFailures: boolean
    /** Ссылка на логи/диагностику. */
    readonly diagnosticsHref: string
}

interface IDataFreshnessPanelProps {
    /** Заголовок панели. */
    readonly title: string
    /** Время последнего обновления. */
    readonly lastUpdatedAt: string
    /** Порог устаревания данных в минутах. */
    readonly staleThresholdMinutes: number
    /** Сейчас идёт refresh. */
    readonly isRefreshing: boolean
    /** Provenance-контекст. */
    readonly provenance: IProvenanceContext
    /** Обработчик refresh. */
    readonly onRefresh?: () => void
    /** Обработчик rescan. */
    readonly onRescan?: () => void
}

function formatAbsoluteTimestamp(rawValue: string): string {
    const parsed = new Date(rawValue)
    if (Number.isNaN(parsed.getTime())) {
        return "—"
    }

    return parsed.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatRelativeTimestamp(
    rawValue: string,
    t: (key: string, options?: Record<string, string | number>) => string,
): string {
    const parsed = new Date(rawValue)
    const updatedAt = parsed.getTime()
    if (Number.isNaN(updatedAt)) {
        return t("common:freshness.unknown")
    }

    const deltaMinutes = Math.floor((Date.now() - updatedAt) / 60_000)
    if (deltaMinutes <= 0) {
        return t("common:freshness.justNow")
    }

    if (deltaMinutes < 60) {
        return t("common:freshness.minutesAgo", { count: deltaMinutes })
    }

    const deltaHours = Math.floor(deltaMinutes / 60)
    if (deltaHours < 24) {
        return t("common:freshness.hoursAgo", { count: deltaHours })
    }

    const deltaDays = Math.floor(deltaHours / 24)
    return t("common:freshness.daysAgo", { count: deltaDays })
}

function resolveFreshnessState(props: IDataFreshnessPanelProps): TFreshnessState {
    if (props.isRefreshing === true) {
        return "refreshing"
    }

    const parsed = new Date(props.lastUpdatedAt)
    const updatedAt = parsed.getTime()
    if (Number.isNaN(updatedAt)) {
        return "stale"
    }

    const elapsedMinutes = (Date.now() - updatedAt) / 60_000
    if (elapsedMinutes > props.staleThresholdMinutes) {
        return "stale"
    }

    return "fresh"
}

function getFreshnessChipColor(state: TFreshnessState): "danger" | "success" | "warning" {
    if (state === "stale") {
        return "danger"
    }
    if (state === "refreshing") {
        return "warning"
    }
    return "success"
}

function getFreshnessChipLabel(state: TFreshnessState, t: (key: string) => string): string {
    return t(`common:freshness.${state}`)
}

/**
 * Унифицированная панель freshness/provenance для dashboard и аналитики.
 *
 * @param props Конфигурация freshness и provenance.
 * @returns Панель с индикатором свежести, refresh CTA и provenance drawer.
 */
export function DataFreshnessPanel(props: IDataFreshnessPanelProps): ReactElement {
    const { td } = useDynamicTranslation(["common"])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const freshnessState = useMemo(
        (): TFreshnessState => resolveFreshnessState(props),
        [props.isRefreshing, props.lastUpdatedAt, props.staleThresholdMinutes],
    )

    return (
        <>
            <section className="rounded-xl border border-border bg-surface p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{props.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Chip
                                color={getFreshnessChipColor(freshnessState)}
                                size="sm"
                                variant="soft"
                            >
                                {getFreshnessChipLabel(freshnessState, td)}
                            </Chip>
                            <p className="text-xs text-text-secondary">
                                {td("common:freshness.lastUpdated", {
                                    time: formatRelativeTimestamp(props.lastUpdatedAt, td),
                                    absolute: formatAbsoluteTimestamp(props.lastUpdatedAt),
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                if (props.onRefresh !== undefined) {
                                    props.onRefresh()
                                }
                            }}
                        >
                            {td("common:freshness.refresh")}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                if (props.onRescan !== undefined) {
                                    props.onRescan()
                                }
                            }}
                        >
                            {td("common:freshness.rescan")}
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={(): void => {
                                setIsDrawerOpen(true)
                            }}
                        >
                            {td("common:freshness.openProvenance")}
                        </Button>
                    </div>
                </div>
            </section>

            <Modal isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <Modal.Backdrop>
                <Modal.Container className="!items-stretch !justify-end !p-0">
                <Modal.Dialog className="!m-0 !h-full !w-[min(92vw,420px)] !rounded-none bg-surface text-foreground">
                    <div className="border-b border-border px-4 py-3">
                        <h2 className={TYPOGRAPHY.sectionTitle}>
                            {td("common:freshness.provenanceTitle")}
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3">
                        <dl className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-2 text-sm">
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceSource")}
                            </dt>
                            <dd>{props.provenance.source}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceJobId")}
                            </dt>
                            <dd>{props.provenance.jobId}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceRepository")}
                            </dt>
                            <dd>{props.provenance.repository}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceBranch")}
                            </dt>
                            <dd>{props.provenance.branch}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceCommit")}
                            </dt>
                            <dd>{props.provenance.commit}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceDataWindow")}
                            </dt>
                            <dd>{props.provenance.dataWindow}</dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenancePartialData")}
                            </dt>
                            <dd>
                                {props.provenance.isPartial
                                    ? td("common:freshness.yes")
                                    : td("common:freshness.no")}
                            </dd>
                            <dt className="text-text-subtle">
                                {td("common:freshness.provenanceFailureFlags")}
                            </dt>
                            <dd>
                                {props.provenance.hasFailures
                                    ? td("common:freshness.present")
                                    : td("common:freshness.none")}
                            </dd>
                        </dl>
                        <div className="flex flex-wrap gap-2">
                            <a
                                className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-sm"
                                href={props.provenance.diagnosticsHref}
                            >
                                {td("common:freshness.openJobLogs")}
                            </a>
                            <Button
                                size="sm"
                                variant="secondary"
                                onPress={(): void => {
                                    if (props.onRescan !== undefined) {
                                        props.onRescan()
                                    }
                                }}
                            >
                                {td("common:freshness.refreshRescan")}
                            </Button>
                        </div>
                    </div>
                </Modal.Dialog>
                </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </>
    )
}

export type { IProvenanceContext, IDataFreshnessPanelProps }
