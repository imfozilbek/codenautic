import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button, Card, CardBody, CardHeader } from "@/components/ui"

type TRepositoryStatus = "error" | "ready" | "scanning"

interface IRepositoryListRepository {
    /** Название репозитория. */
    readonly name: string
    /** Владелец репозитория. */
    readonly owner: string
    /** Бранч для скана. */
    readonly branch: string
    /** Текущее состояние последнего скана. */
    readonly status: TRepositoryStatus
    /** Идентификатор репозитория для перехода к обзору. */
    readonly id?: string
    /** Количество найденных инцидентов. */
    readonly issueCount: number
    /** Время последнего скана в ISO формате. */
    readonly lastScanAt: string
    /** Информация об ошибке сканирования (если применимо). */
    readonly scanError?: {
        /** Количество частично обработанных файлов до ошибки. */
        readonly partialFilesScanned: number
        /** Общее планируемое количество файлов для полного сканирования. */
        readonly totalFiles?: number
        /** Короткий текст причины ошибки. */
        readonly message: string
        /** Подробный стек/логи для диагностики. */
        readonly details?: ReadonlyArray<string>
    }
}

interface IRepositoryListPageProps {
    /** Список репозиториев (для тестов и будущей интеграции). */
    readonly repositories?: ReadonlyArray<IRepositoryListRepository>
    /** Колбек повторного запуска сканирования для конкретного репозитория. */
    readonly onRetryScan?: (repositoryId: string) => void
}

type TRepositorySortKey = "name" | "lastScanAt" | "status"

const DEFAULT_REPOSITORIES: ReadonlyArray<IRepositoryListRepository> = [
    {
        id: "platform-team/api-gateway",
        branch: "main",
        issueCount: 0,
        lastScanAt: "2026-01-01T10:40:00Z",
        name: "api-gateway",
        owner: "platform-team",
        status: "ready",
    },
    {
        id: "frontend-team/ui-dashboard",
        branch: "main",
        issueCount: 4,
        lastScanAt: "2026-01-01T09:10:00Z",
        name: "ui-dashboard",
        owner: "frontend-team",
        status: "scanning",
    },
    {
        id: "backend-core/payment-worker",
        branch: "release",
        issueCount: 1,
        lastScanAt: "2026-01-01T07:50:00Z",
        name: "payment-worker",
        owner: "backend-core",
        status: "error",
        scanError: {
            details: [
                "Ошибка на этапе индексации: недоступен пакет react-markdown",
                "Перезапустите сканирование после обновления зависимостей",
            ],
            message: "Сканирование прервалось во время построения AST",
            partialFilesScanned: 41,
            totalFiles: 112,
        },
    },
    {
        id: "platform-team/docs-site",
        branch: "main",
        issueCount: 2,
        lastScanAt: "2025-12-31T23:20:00Z",
        name: "docs-site",
        owner: "platform-team",
        status: "ready",
    },
]

function getRepositoryId(props: IRepositoryListRepository): string {
    return props.id ?? `${props.owner}/${props.name}`
}

interface IRepositoryListSearchValues {
    readonly search: string
    readonly status: "all" | TRepositoryStatus
    readonly sortBy: TRepositorySortKey
}

const STATUS_ORDER: ReadonlyArray<TRepositoryStatus> = ["scanning", "ready", "error"]
const SORT_OPTIONS: ReadonlyArray<{ label: string; value: TRepositorySortKey }> = [
    {
        label: "Имя",
        value: "name",
    },
    {
        label: "Статус",
        value: "status",
    },
    {
        label: "Последний скан",
        value: "lastScanAt",
    },
]

function formatScanDate(raw: string): string {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime()) === true) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

function normalizeString(value: string): string {
    return value.trim().toLowerCase()
}

function mapStatusToLabel(status: TRepositoryStatus): string {
    if (status === "ready") {
        return "Готов"
    }

    if (status === "scanning") {
        return "Сканирование"
    }

    return "Ошибка"
}

function mapStatusClasses(status: TRepositoryStatus): string {
    if (status === "ready") {
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
    }

    if (status === "scanning") {
        return "bg-blue-50 text-blue-700 border-blue-200"
    }

    return "bg-red-50 text-red-700 border-red-200"
}

function isMatchSearch(value: string, normalizedQuery: string): boolean {
    return normalizeString(value).includes(normalizedQuery)
}

function sortRepositories(
    repositories: ReadonlyArray<IRepositoryListRepository>,
    sortBy: TRepositorySortKey,
): ReadonlyArray<IRepositoryListRepository> {
    if (repositories.length < 2) {
        return repositories
    }

    return [...repositories].sort((left, right): number => {
        if (sortBy === "name") {
            return left.name.localeCompare(right.name)
        }

        if (sortBy === "status") {
            const leftPosition = STATUS_ORDER.indexOf(left.status)
            const rightPosition = STATUS_ORDER.indexOf(right.status)
            return leftPosition - rightPosition
        }

        const leftAt = Date.parse(left.lastScanAt)
        const rightAt = Date.parse(right.lastScanAt)
        if (leftAt === rightAt) {
            return 0
        }

        return rightAt - leftAt
    })
}

function useFilteredRepositories(
    repositories: ReadonlyArray<IRepositoryListRepository>,
    searchValues: IRepositoryListSearchValues,
): ReadonlyArray<IRepositoryListRepository> {
    const normalizedSearch = normalizeString(searchValues.search)
    const status = searchValues.status
    const sortBy = searchValues.sortBy

    const visible = repositories.filter((item): boolean => {
        const isStatusMatch = status === "all" || item.status === status
        const isQueryMatch =
            normalizedSearch.length === 0 ||
            isMatchSearch(item.name, normalizedSearch) ||
            isMatchSearch(item.owner, normalizedSearch)

        return isStatusMatch && isQueryMatch
    })

    return useMemo(
        () => sortRepositories(visible, sortBy),
        [visible, sortBy],
    )
}

function RepositoryStatusBadge(props: { status: TRepositoryStatus }): ReactElement {
    return (
        <span
            className={`rounded-full border px-2 py-1 text-xs font-medium ${mapStatusClasses(props.status)}`}
        >
            {mapStatusToLabel(props.status)}
        </span>
    )
}

function RepositoryCountSummary(props: { label: string; value: number }): ReactElement {
    return (
        <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            {props.label}: <span className="font-semibold">{props.value}</span>
        </p>
    )
}

function RepositoryScanErrorRecovery(props: {
    repositoryId: string
    scanError: IRepositoryListRepository["scanError"]
    onRetryScan?: (repositoryId: string) => void
}): ReactElement | null {
    if (props.scanError === undefined) {
        return <></>
    }

    const partialSummary = props.scanError.totalFiles === undefined
        ? `Проанализировано файлов до ошибки: ${props.scanError.partialFilesScanned}`
        : `Проанализировано файлов до ошибки: ${props.scanError.partialFilesScanned} из ${props.scanError.totalFiles}`

    return (
        <section className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-600">Ошибка сканирования</p>
            <p className="mt-1 text-sm font-medium">{props.scanError.message}</p>
            <p className="mt-1 text-sm text-rose-700">{partialSummary}</p>
            {props.scanError.details === undefined || props.scanError.details.length === 0 ? null : (
                <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-rose-800">
                        Подробнее об ошибке
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">
                        {props.scanError.details.map(
                            (detail, index): ReactElement => (
                                <li key={`scan-error-detail-${props.repositoryId}-${String(index)}`}>
                                    {detail}
                                </li>
                            ),
                        )}
                    </ul>
                </details>
            )}
            <Button
                color="danger"
                className="mt-2"
                onPress={(): void => {
                    props.onRetryScan?.(props.repositoryId)
                }}
                size="sm"
                type="button"
                variant="ghost"
            >
                Повторить сканирование
            </Button>
        </section>
    )
}

function RepositoriesEmptyState(): ReactElement {
    return (
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-900">Нет подключенных репозиториев</p>
            <p className="mt-2 text-sm text-slate-600">
                Подключите репозиторий, чтобы начать сканирование и увидеть его прогресс, метрики и
                архитектурный обзор.
            </p>
            <Link
                className="mt-4 inline-flex rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white"
                to="/onboarding"
            >
                Начать onboarding
            </Link>
        </section>
    )
}

/**
 * Страница списка подключенных репозиториев с поиском и сортировкой.
 *
 * @param props Репозитории для отображения.
 * @returns Табличный список и управляющие фильтры.
 */
export function RepositoriesListPage(props: IRepositoryListPageProps): ReactElement {
    const repositories = props.repositories ?? DEFAULT_REPOSITORIES
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<"all" | TRepositoryStatus>("all")
    const [sortBy, setSortBy] = useState<TRepositorySortKey>("name")

    const visible = useFilteredRepositories(repositories, {
        search,
        status,
        sortBy,
    })

    const repoReadyCount = repositories.filter((item): boolean => item.status === "ready").length
    const repoScanningCount = repositories.filter((item): boolean => item.status === "scanning").length
    const repoErrorCount = repositories.filter((item): boolean => item.status === "error").length

    const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearch(event.currentTarget.value)
    }

    const handleStatusFilter = (event: ChangeEvent<HTMLSelectElement>): void => {
        const next = event.currentTarget.value
        if (next === "ready" || next === "scanning" || next === "error") {
            setStatus(next)
            return
        }

        setStatus("all")
    }

    const handleSortChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const next = event.currentTarget.value
        if (next === "name" || next === "status" || next === "lastScanAt") {
            setSortBy(next)
        }
    }

    if (repositories.length === 0) {
        return (
            <section className="space-y-4">
                <h1 className="text-2xl font-semibold text-slate-900">Onboarded repositories</h1>
                <p className="text-sm text-slate-600">
                    Отслеживайте подключенные репозитории и состояние их сканирования.
                </p>
                <RepositoriesEmptyState />
            </section>
        )
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Onboarded repositories</h1>
            <p className="text-sm text-slate-600">
                Отслеживайте подключенные репозитории и состояние их сканирования.
            </p>

            <Card>
                <CardHeader>
                    <div className="grid gap-3 md:grid-cols-4">
                        <input
                            aria-label="Поиск репозитория"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            name="repository-search"
                            onChange={handleSearch}
                            placeholder="Поиск по названию или владельцу"
                            value={search}
                        />
                        <select
                            aria-label="Фильтр по статусу"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            onChange={handleStatusFilter}
                            value={status}
                        >
                            <option value="all">Все</option>
                            <option value="ready">Готов</option>
                            <option value="scanning">Сканируется</option>
                            <option value="error">Ошибка</option>
                        </select>
                        <select
                            aria-label="Сортировка"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            onChange={handleSortChange}
                            value={sortBy}
                        >
                            {SORT_OPTIONS.map(
                                (option): ReactElement => (
                                    <option value={option.value} key={option.value}>
                                        {option.label}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="mb-3 grid gap-2 md:grid-cols-3">
                        <RepositoryCountSummary label="Готово" value={repoReadyCount} />
                        <RepositoryCountSummary label="Сканирование" value={repoScanningCount} />
                        <RepositoryCountSummary label="Ошибка" value={repoErrorCount} />
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                            <span>Repository</span>
                            <span>Owner</span>
                            <span>Branch</span>
                            <span>Last scan</span>
                            <span>Status</span>
                        </div>
                        {visible.map(
                            (item): ReactElement => {
                                const repositoryId = getRepositoryId(item)
                                return (
                                    <div
                                        className="border-t border-slate-200 px-3 py-2 text-sm"
                                        key={repositoryId}
                                    >
                                        <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr]">
                                            <Link
                                                aria-label={`Открыть обзор репозитория ${item.owner}/${item.name}`}
                                                className="font-medium text-slate-900 underline-offset-4 hover:underline"
                                                to="/repositories/$repositoryId"
                                                params={{ repositoryId }}
                                            >
                                                {item.name}
                                            </Link>
                                            <p>{item.owner}</p>
                                            <p>{item.branch}</p>
                                            <p>{formatScanDate(item.lastScanAt)}</p>
                                            <RepositoryStatusBadge status={item.status} />
                                        </div>
                                        {item.status !== "error" || item.scanError === undefined ? null : (
                                            <RepositoryScanErrorRecovery
                                                onRetryScan={props.onRetryScan}
                                                repositoryId={repositoryId}
                                                scanError={item.scanError}
                                            />
                                        )}
                                    </div>
                                )
                            },
                        )}
                        {visible.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-slate-500">
                                Результатов по заданным фильтрам не найдено.
                            </p>
                        ) : null}
                    </div>
                </CardBody>
            </Card>
        </section>
    )
}
