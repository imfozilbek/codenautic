import { type ChangeEvent, type ReactElement, useEffect, useState } from "react"

import { FileDependencyGraph } from "@/components/graphs/file-dependency-graph"
import { CodeCityTreemap } from "@/components/graphs/codecity-treemap"
import { FunctionClassCallGraph } from "@/components/graphs/function-class-call-graph"
import { PackageDependencyGraph } from "@/components/graphs/package-dependency-graph"
import { Alert, Button, Card, CardBody, CardHeader, Chip, StyledLink } from "@/components/ui"
import { MetricsGrid } from "@/components/dashboard/metrics-grid"
import { PageShell } from "@/components/layout/page-shell"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import {
    FALLBACK_ARCHITECTURE_SUMMARY,
    getRepositoryFileDependencies,
    getRepositoryFunctionCallGraph,
    getRepositoryPackageDependencyGraph,
    RESCAN_FREQUENCY_OPTIONS,
    RESCAN_HOUR_OPTIONS,
    RESCAN_MINUTE_OPTIONS,
    RESCAN_WEEKDAY_OPTIONS,
} from "./repository-overview-mock-data"
import type {
    IArchitectureSummary,
    IRepositoryOverviewProps,
    IRescanScheduleValues,
    ITechStackItem,
} from "./repository-overview-types"
import {
    clampScore,
    createCronExpressionFromReschedule,
    createRescanScheduleFromCron,
    formatOverviewTimestamp,
    getRepositoryDefaultSchedule,
    getRepositoryOverviewById,
    getRescanSummaryLabel,
    isRescanScheduleMode,
    mapRiskToChipColor,
    mapRiskToLabel,
    padCronValue,
    parseCronNumber,
    resolveCodeCityTreemapFiles,
    resolveHealthChipColor,
    resolveHealthLabel,
} from "./repository-overview-utils"

/**
 * Блок отображения health score репозитория с прогресс-баром и чипом статуса.
 *
 * @param props Score репозитория.
 * @returns Секция с визуализацией health score.
 */
function RepositoryHealthScore(props: { readonly score: number }): ReactElement {
    const score = clampScore(props.score)
    const chipColor = resolveHealthChipColor(score)
    const progressColor =
        chipColor === "success"
            ? "bg-success"
            : chipColor === "warning"
              ? "bg-warning"
              : "bg-danger"

    return (
        <section
            aria-label="Repository health score"
            className="rounded-lg border border-border p-3"
        >
            <div className="flex items-end justify-between">
                <p className="text-sm font-semibold text-foreground">Health score</p>
                <Chip color={chipColor} size="sm">
                    {resolveHealthLabel(score)}
                </Chip>
            </div>
            <div className="mt-3">
                <div className="mb-1 text-3xl font-semibold text-foreground">{score}</div>
                <div
                    aria-label={`Health score ${score}`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={score}
                    className="h-2.5 w-full rounded-full bg-surface-muted"
                    role="meter"
                >
                    <span
                        className={`block h-2.5 rounded-full ${progressColor}`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </section>
    )
}

/**
 * Карточка с перечнем технологий из стека репозитория.
 *
 * @param props Массив элементов стека.
 * @returns Карточка технологического стека.
 */
function TechnologyStackList(props: {
    readonly stack: ReadonlyArray<ITechStackItem>
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-foreground">Tech stack</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.stack.map(
                    (entry): ReactElement => (
                        <div className="space-y-0.5" key={`${entry.name}-${entry.version}`}>
                            <p className="text-sm font-semibold text-foreground">
                                {entry.name} <span className="font-normal">{entry.version}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">{entry.note}</p>
                        </div>
                    ),
                )}
            </CardBody>
        </Card>
    )
}

/**
 * Карточка с архитектурным резюме по слоям репозитория.
 *
 * @param props Массив строк архитектурного резюме.
 * @returns Карточка архитектурного summary.
 */
function ArchitectureSummaryList(props: {
    readonly lines: ReadonlyArray<IArchitectureSummary>
}): ReactElement {
    return (
        <Card>
            <CardHeader>
                <p className="text-sm font-semibold text-foreground">Architecture summary</p>
            </CardHeader>
            <CardBody className="space-y-3">
                {props.lines.map((line): ReactElement => {
                    const chipColor = mapRiskToChipColor(line.risk)
                    return (
                        <section className="rounded-lg border border-border p-3" key={line.area}>
                            <div className="mb-1 flex items-center gap-2">
                                <Chip color={chipColor} size="sm">
                                    {mapRiskToLabel(line.risk)}
                                </Chip>
                                <p className="text-sm font-semibold text-foreground">{line.area}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{line.summary}</p>
                        </section>
                    )
                })}
            </CardBody>
        </Card>
    )
}

/**
 * Заглушка при отсутствии overview для запрашиваемого репозитория.
 *
 * @param props ID репозитория.
 * @returns Секция с предупреждением и ссылкой на список.
 */
function RepositoryOverviewNotFound(props: { readonly repositoryId: string }): ReactElement {
    return (
        <section className="space-y-3">
            <Alert color="warning">Скан-результат репозитория не найден</Alert>
            <p className="text-sm text-foreground">
                Не найдено overview для ID:{" "}
                <span className="font-semibold">{props.repositoryId}</span>.
            </p>
            <StyledLink className="text-sm" to="/repositories">
                К списку репозиториев
            </StyledLink>
        </section>
    )
}

/**
 * Модальный диалог настройки расписания рескана.
 *
 * @param props Состояние диалога и обработчики событий.
 * @returns Диалог или null если закрыт.
 */
function RescanScheduleDialog(props: {
    readonly draftReschedule: IRescanScheduleValues
    readonly draftCron: string
    readonly isSaveButtonDisabled: boolean
    readonly lastScanAt: string
    readonly onClose: () => void
    readonly onSave: () => void
    readonly onUpdateMode: (event: ChangeEvent<HTMLSelectElement>) => void
    readonly onUpdateMinute: (event: ChangeEvent<HTMLSelectElement>) => void
    readonly onUpdateHour: (event: ChangeEvent<HTMLSelectElement>) => void
    readonly onUpdateWeekday: (event: ChangeEvent<HTMLSelectElement>) => void
    readonly onUpdateCustomCron: (event: ChangeEvent<HTMLInputElement>) => void
}): ReactElement {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/60 p-4">
            <div
                aria-labelledby="rescan-schedule-title"
                aria-modal="true"
                className="w-full max-w-lg rounded-lg border border-border bg-surface p-4"
                role="dialog"
            >
                <div className="mb-3 flex items-center justify-between">
                    <h2 className={TYPOGRAPHY.sectionTitle} id="rescan-schedule-title">
                        Настройка периодического рескана
                    </h2>
                    <button
                        aria-label="Закрыть"
                        className="rounded-md border border-border px-3 py-1 text-sm"
                        onClick={props.onClose}
                        type="button"
                    >
                        ×
                    </button>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">
                    Последний scan: {formatOverviewTimestamp(props.lastScanAt)}
                </p>

                <div className="space-y-2">
                    <label className="text-sm text-foreground" htmlFor="rescan-mode">
                        Режим
                    </label>
                    <select
                        aria-label="Режим расписания рескана"
                        className={NATIVE_FORM.select}
                        id="rescan-mode"
                        value={props.draftReschedule.mode}
                        onChange={props.onUpdateMode}
                    >
                        {RESCAN_FREQUENCY_OPTIONS.map(
                            (entry): ReactElement => (
                                <option key={entry.value} value={entry.value}>
                                    {entry.label}
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {props.draftReschedule.mode !== "manual" &&
                props.draftReschedule.mode !== "custom" ? (
                    <>
                        <div className="mt-3 space-y-2">
                            <label className="text-sm text-foreground" htmlFor="rescan-minute">
                                Минуты
                            </label>
                            <select
                                aria-label="Минута"
                                className={NATIVE_FORM.select}
                                id="rescan-minute"
                                value={String(props.draftReschedule.minute)}
                                onChange={props.onUpdateMinute}
                            >
                                {RESCAN_MINUTE_OPTIONS.map(
                                    (minute): ReactElement => (
                                        <option key={String(minute)} value={String(minute)}>
                                            {padCronValue(minute)}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>

                        {props.draftReschedule.mode !== "hourly" ? (
                            <div className="mt-3 space-y-2">
                                <label className="text-sm text-foreground" htmlFor="rescan-hour">
                                    Час
                                </label>
                                <select
                                    aria-label="Час"
                                    className={NATIVE_FORM.select}
                                    id="rescan-hour"
                                    value={String(props.draftReschedule.hour)}
                                    onChange={props.onUpdateHour}
                                >
                                    {RESCAN_HOUR_OPTIONS.map(
                                        (hour): ReactElement => (
                                            <option key={String(hour)} value={String(hour)}>
                                                {padCronValue(hour)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        ) : null}
                    </>
                ) : null}

                {props.draftReschedule.mode === "weekly" ? (
                    <div className="mt-3 space-y-2">
                        <label className="text-sm text-foreground" htmlFor="rescan-weekday">
                            День недели
                        </label>
                        <select
                            aria-label="День недели"
                            className={NATIVE_FORM.select}
                            id="rescan-weekday"
                            value={String(props.draftReschedule.weekday)}
                            onChange={props.onUpdateWeekday}
                        >
                            {RESCAN_WEEKDAY_OPTIONS.map(
                                (option): ReactElement => (
                                    <option key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                ) : null}

                {props.draftReschedule.mode === "custom" ? (
                    <div className="mt-3 space-y-2">
                        <label className="text-sm text-foreground" htmlFor="rescan-custom-cron">
                            Cron-выражение
                        </label>
                        <input
                            aria-label="Кастомное cron-выражение"
                            className="w-full rounded-md border border-border px-3 py-2"
                            id="rescan-custom-cron"
                            onChange={props.onUpdateCustomCron}
                            value={props.draftReschedule.customCron}
                            type="text"
                        />
                    </div>
                ) : null}

                <p className="mt-4 rounded bg-surface p-2 text-xs text-foreground">
                    Cron preview: <code>{props.draftCron}</code>
                </p>

                <div className="mt-4 flex justify-end gap-2">
                    <Button color="default" onPress={props.onClose} type="button" variant="light">
                        Отменить
                    </Button>
                    <Button
                        color="primary"
                        isDisabled={props.isSaveButtonDisabled}
                        onPress={props.onSave}
                        type="button"
                    >
                        Сохранить расписание
                    </Button>
                </div>
            </div>
        </div>
    )
}

/**
 * Подробный dashboard по одному репозиторию после скана.
 *
 * @param props Идентификатор репозитория.
 * @returns Страница с метриками, архитектурным резюме и health score.
 */
export function RepositoryOverviewPage(props: IRepositoryOverviewProps): ReactElement {
    const repository = getRepositoryOverviewById(props.repositoryId)
    const defaultReschedule = createRescanScheduleFromCron(
        getRepositoryDefaultSchedule(props.repositoryId),
    )

    const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState<boolean>(false)
    const [currentReschedule, setCurrentReschedule] =
        useState<IRescanScheduleValues>(defaultReschedule)
    const [draftReschedule, setDraftReschedule] = useState<IRescanScheduleValues>(defaultReschedule)

    useEffect((): void => {
        const nextReschedule = createRescanScheduleFromCron(
            getRepositoryDefaultSchedule(props.repositoryId),
        )
        setCurrentReschedule(nextReschedule)
        setDraftReschedule(nextReschedule)
    }, [props.repositoryId])

    const currentCron = createCronExpressionFromReschedule(currentReschedule)
    const draftCron = createCronExpressionFromReschedule(draftReschedule)
    const isSaveButtonDisabled =
        draftReschedule.mode === "custom" && draftReschedule.customCron.trim().length === 0

    const openRescheduleDialog = (): void => {
        setDraftReschedule(currentReschedule)
        setIsRescheduleDialogOpen(true)
    }

    const closeRescheduleDialog = (): void => {
        setIsRescheduleDialogOpen(false)
    }

    const saveReschedule = (): void => {
        if (isSaveButtonDisabled === true) {
            return
        }

        const next = createRescanScheduleFromCron(draftCron)
        setCurrentReschedule(next)
        setIsRescheduleDialogOpen(false)

        if (props.onRescanScheduleChange !== undefined) {
            props.onRescanScheduleChange({
                cronExpression: createCronExpressionFromReschedule(next),
                mode: next.mode,
                repositoryId: props.repositoryId,
            })
        }
    }

    const updateRescheduleMode = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextMode = event.currentTarget.value
        if (isRescanScheduleMode(nextMode) === false) {
            return
        }

        setDraftReschedule(
            (previous): IRescanScheduleValues => ({
                ...previous,
                mode: nextMode,
            }),
        )
    }

    const updateRescheduleMinute = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextMinute = parseCronNumber(event.currentTarget.value, 0, 59, draftReschedule.minute)
        setDraftReschedule(
            (previous): IRescanScheduleValues => ({
                ...previous,
                minute: nextMinute,
            }),
        )
    }

    const updateRescheduleHour = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextHour = parseCronNumber(event.currentTarget.value, 0, 23, draftReschedule.hour)
        setDraftReschedule(
            (previous): IRescanScheduleValues => ({
                ...previous,
                hour: nextHour,
            }),
        )
    }

    const updateRescheduleWeekday = (event: ChangeEvent<HTMLSelectElement>): void => {
        const nextWeekday = parseCronNumber(
            event.currentTarget.value,
            0,
            6,
            draftReschedule.weekday,
        )
        setDraftReschedule(
            (previous): IRescanScheduleValues => ({
                ...previous,
                weekday: nextWeekday,
            }),
        )
    }

    const updateRescheduleCustomCron = (event: ChangeEvent<HTMLInputElement>): void => {
        const nextCustomCron = event.currentTarget.value
        setDraftReschedule(
            (previous): IRescanScheduleValues => ({
                ...previous,
                customCron: nextCustomCron,
            }),
        )
    }

    if (repository === undefined) {
        return <RepositoryOverviewNotFound repositoryId={props.repositoryId} />
    }

    const fallbackSummary =
        repository.architectureSummary.length === 0
            ? FALLBACK_ARCHITECTURE_SUMMARY
            : repository.architectureSummary
    const fileDependencyGraph = getRepositoryFileDependencies(repository.id)
    const functionCallGraph = getRepositoryFunctionCallGraph(repository.id)
    const packageDependencyGraph = getRepositoryPackageDependencyGraph(repository.id)

    return (
        <PageShell
            layout="standard"
            subtitle="Отображение health score, архитектуры и ключевых метрик после последнего сканирования."
            title={`${repository.owner}/${repository.name}`}
        >

            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-foreground">Scan snapshot</p>
                </CardHeader>
                <CardBody className="grid gap-3 md:gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm text-foreground">Branch: {repository.branch}</p>
                        <p className="text-sm text-foreground">
                            Last scan: {formatOverviewTimestamp(repository.lastScanAt)}
                        </p>
                        <p className="text-sm text-foreground">
                            Scanned files: {repository.filesScanned}
                        </p>
                        <p className="text-sm text-foreground">
                            Total findings: {repository.totalFindings}
                        </p>
                        <p className="text-sm text-foreground">
                            Rescan schedule: {getRescanSummaryLabel(currentReschedule)}
                        </p>
                        <p className="text-sm font-mono text-foreground">Cron: {currentCron}</p>
                        <Button
                            onPress={openRescheduleDialog}
                            className="mt-1"
                            color="primary"
                            type="button"
                        >
                            Настроить расписание рескана
                        </Button>
                    </div>
                    <RepositoryHealthScore score={repository.healthScore} />
                </CardBody>
            </Card>

            {isRescheduleDialogOpen === true ? (
                <RescanScheduleDialog
                    draftCron={draftCron}
                    draftReschedule={draftReschedule}
                    isSaveButtonDisabled={isSaveButtonDisabled}
                    lastScanAt={repository.lastScanAt}
                    onClose={closeRescheduleDialog}
                    onSave={saveReschedule}
                    onUpdateCustomCron={updateRescheduleCustomCron}
                    onUpdateHour={updateRescheduleHour}
                    onUpdateMinute={updateRescheduleMinute}
                    onUpdateMode={updateRescheduleMode}
                    onUpdateWeekday={updateRescheduleWeekday}
                />
            ) : null}

            <section aria-label="Key metrics">
                <MetricsGrid metrics={repository.keyMetrics} />
            </section>

            <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <ArchitectureSummaryList lines={fallbackSummary} />
                <TechnologyStackList stack={repository.techStack} />
            </div>

            <FileDependencyGraph
                dependencies={fileDependencyGraph.dependencies}
                files={fileDependencyGraph.files}
                height="460px"
                showControls
                showMiniMap
                title="File dependency graph"
            />
            <FunctionClassCallGraph
                callRelations={functionCallGraph.callRelations}
                height="420px"
                nodes={functionCallGraph.nodes}
                showControls
                showMiniMap
                title="Function/Class call graph"
            />
            <PackageDependencyGraph
                height="420px"
                nodes={packageDependencyGraph.nodes}
                relations={packageDependencyGraph.packageRelations}
                showControls
                showMiniMap
                title="Package dependency graph"
            />
            <CodeCityTreemap
                files={resolveCodeCityTreemapFiles(fileDependencyGraph.files)}
                height="440px"
                title="CodeCity treemap"
            />
        </PageShell>
    )
}
