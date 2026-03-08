import { type ReactElement, useMemo, useState } from "react"

import { Button, Chip, Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@/components/ui"

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

function formatRelativeTimestamp(rawValue: string): string {
    const parsed = new Date(rawValue)
    const updatedAt = parsed.getTime()
    if (Number.isNaN(updatedAt)) {
        return "unknown"
    }

    const deltaMinutes = Math.floor((Date.now() - updatedAt) / 60_000)
    if (deltaMinutes <= 0) {
        return "just now"
    }

    if (deltaMinutes < 60) {
        return `${String(deltaMinutes)}m ago`
    }

    const deltaHours = Math.floor(deltaMinutes / 60)
    if (deltaHours < 24) {
        return `${String(deltaHours)}h ago`
    }

    const deltaDays = Math.floor(deltaHours / 24)
    return `${String(deltaDays)}d ago`
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

function getFreshnessChipLabel(state: TFreshnessState): string {
    if (state === "stale") {
        return "stale"
    }
    if (state === "refreshing") {
        return "refreshing"
    }
    return "fresh"
}

/**
 * Унифицированная панель freshness/provenance для dashboard и аналитики.
 *
 * @param props Конфигурация freshness и provenance.
 * @returns Панель с индикатором свежести, refresh CTA и provenance drawer.
 */
export function DataFreshnessPanel(props: IDataFreshnessPanelProps): ReactElement {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const freshnessState = useMemo((): TFreshnessState => resolveFreshnessState(props), [props])

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
                                variant="flat"
                            >
                                {getFreshnessChipLabel(freshnessState)}
                            </Chip>
                            <p className="text-xs text-foreground/70">
                                {`Last updated ${formatRelativeTimestamp(props.lastUpdatedAt)} (${formatAbsoluteTimestamp(props.lastUpdatedAt)})`}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                if (props.onRefresh !== undefined) {
                                    props.onRefresh()
                                }
                            }}
                        >
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                if (props.onRescan !== undefined) {
                                    props.onRescan()
                                }
                            }}
                        >
                            Rescan
                        </Button>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={(): void => {
                                setIsDrawerOpen(true)
                            }}
                        >
                            Open provenance
                        </Button>
                    </div>
                </div>
            </section>

            <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent className="!m-0 !ml-auto !h-full !w-[min(92vw,420px)] !rounded-none bg-surface text-foreground">
                    <DrawerHeader className="border-b border-border px-4 py-3">
                        <h2 className="text-base font-semibold text-foreground">
                            Source data provenance
                        </h2>
                    </DrawerHeader>
                    <DrawerBody className="space-y-3 px-4 py-3">
                        <dl className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-2 text-sm">
                            <dt className="text-foreground/60">Source</dt>
                            <dd>{props.provenance.source}</dd>
                            <dt className="text-foreground/60">Job ID</dt>
                            <dd>{props.provenance.jobId}</dd>
                            <dt className="text-foreground/60">Repository</dt>
                            <dd>{props.provenance.repository}</dd>
                            <dt className="text-foreground/60">Branch</dt>
                            <dd>{props.provenance.branch}</dd>
                            <dt className="text-foreground/60">Commit</dt>
                            <dd>{props.provenance.commit}</dd>
                            <dt className="text-foreground/60">Data window</dt>
                            <dd>{props.provenance.dataWindow}</dd>
                            <dt className="text-foreground/60">Partial data</dt>
                            <dd>{props.provenance.isPartial ? "yes" : "no"}</dd>
                            <dt className="text-foreground/60">Failure flags</dt>
                            <dd>{props.provenance.hasFailures ? "present" : "none"}</dd>
                        </dl>
                        <div className="flex flex-wrap gap-2">
                            <a
                                className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-sm"
                                href={props.provenance.diagnosticsHref}
                            >
                                Open job / scan logs
                            </a>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={(): void => {
                                    if (props.onRescan !== undefined) {
                                        props.onRescan()
                                    }
                                }}
                            >
                                Refresh / Rescan
                            </Button>
                        </div>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    )
}

export type { IProvenanceContext, IDataFreshnessPanelProps }
