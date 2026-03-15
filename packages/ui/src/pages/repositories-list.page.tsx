import { type ChangeEvent, type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "@tanstack/react-router"

import { useDynamicTranslation } from "@/lib/i18n"
import { Button, Card, CardContent, CardHeader, Spinner, Table } from "@heroui/react"
import { PageShell } from "@/components/layout/page-shell"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { useRepositories } from "@/lib/hooks/queries"
import type { IRepository } from "@/lib/api/endpoints/repository.endpoint"

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
function createSortOptions(
    t: (key: string) => string,
): ReadonlyArray<{ label: string; value: TRepositorySortKey }> {
    return [
        {
            label: t("dashboard:repositoriesList.sortByName"),
            value: "name",
        },
        {
            label: t("dashboard:repositoriesList.sortByStatus"),
            value: "status",
        },
        {
            label: t("dashboard:repositoriesList.sortByLastScan"),
            value: "lastScanAt",
        },
    ]
}

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

function mapStatusToLabel(status: TRepositoryStatus, t?: (key: string) => string): string {
    if (t !== undefined) {
        if (status === "ready") {
            return t("dashboard:repositoriesList.statusReady")
        }

        if (status === "scanning") {
            return t("dashboard:repositoriesList.statusScanning")
        }

        return t("dashboard:repositoriesList.statusError")
    }

    if (status === "ready") {
        return "Ready"
    }

    if (status === "scanning") {
        return "Scanning"
    }

    return "Error"
}

function mapStatusClasses(status: TRepositoryStatus): string {
    if (status === "ready") {
        return "bg-success/10 text-success border-success/30"
    }

    if (status === "scanning") {
        return "bg-accent/10 text-accent border-accent/30"
    }

    return "bg-danger/10 text-danger border-danger/30"
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

    return useMemo(() => sortRepositories(visible, sortBy), [visible, sortBy])
}

function RepositoryStatusBadge(props: { status: TRepositoryStatus }): ReactElement {
    const { td } = useDynamicTranslation(["dashboard"])
    return (
        <span
            className={`rounded-full border px-2 py-1 text-xs font-medium ${mapStatusClasses(props.status)}`}
        >
            {mapStatusToLabel(props.status, td)}
        </span>
    )
}

function RepositoryCountSummary(props: {
    label: string
    value: number
    colorClass?: string
}): ReactElement {
    const valueColor = props.colorClass ?? ""
    return (
        <p className={`rounded-lg border border-border px-3 py-2 ${TYPOGRAPHY.body}`}>
            {props.label}: <span className={`font-semibold ${valueColor}`}>{props.value}</span>
        </p>
    )
}

function RepositoryScanErrorRecovery(props: {
    repositoryId: string
    scanError: IRepositoryListRepository["scanError"]
    onRetryScan?: (repositoryId: string) => void
}): ReactElement | null {
    const { t } = useTranslation(["dashboard"])
    const { td } = useDynamicTranslation(["dashboard"])
    if (props.scanError === undefined) {
        return <></>
    }

    const partialSummary =
        props.scanError.totalFiles === undefined
            ? td("dashboard:repositoriesList.partialFilesSummary", {
                  scanned: String(props.scanError.partialFilesScanned),
              })
            : td("dashboard:repositoriesList.partialFilesSummaryWithTotal", {
                  scanned: String(props.scanError.partialFilesScanned),
                  total: String(props.scanError.totalFiles),
              })

    return (
        <section className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-danger">
                {t("dashboard:repositoriesList.scanError")}
            </p>
            <p className="mt-1 text-sm font-medium">{props.scanError.message}</p>
            <p className="mt-1 text-sm text-danger">{partialSummary}</p>
            {props.scanError.details === undefined ||
            props.scanError.details.length === 0 ? null : (
                <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-danger">
                        {t("dashboard:repositoriesList.errorDetails")}
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-danger">
                        {props.scanError.details.map(
                            (detail, index): ReactElement => (
                                <li
                                    key={`scan-error-detail-${props.repositoryId}-${String(index)}`}
                                >
                                    {detail}
                                </li>
                            ),
                        )}
                    </ul>
                </details>
            )}
            <Button
                variant="danger"
                className="mt-2"
                onPress={(): void => {
                    props.onRetryScan?.(props.repositoryId)
                }}
                size="sm"
                type="button"
            >
                {t("dashboard:repositoriesList.retryScan")}
            </Button>
        </section>
    )
}

function RepositoriesEmptyState(): ReactElement {
    const { t } = useTranslation(["dashboard"])
    return (
        <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
            <p className={TYPOGRAPHY.cardTitle}>{t("dashboard:repositoriesList.noRepositories")}</p>
            <p className="mt-2 text-sm text-muted">
                {t("dashboard:repositoriesList.noRepositoriesHint")}
            </p>
            <Link
                className="mt-4 inline-flex rounded-md border border-foreground bg-foreground px-4 py-2 text-sm text-background"
                to="/onboarding"
            >
                {t("dashboard:repositoriesList.startOnboarding")}
            </Link>
        </section>
    )
}

/**
 * Маппит API-модель репозитория в локальную модель страницы.
 *
 * @param repo - Репозиторий из API.
 * @returns Локальная модель для отображения в таблице.
 */
function mapApiRepositoryToListItem(repo: IRepository): IRepositoryListRepository {
    return {
        id: repo.id,
        name: repo.name,
        owner: repo.owner,
        branch: repo.defaultBranch,
        status: repo.status,
        issueCount: repo.issueCount,
        lastScanAt: repo.lastScanAt,
    }
}

/**
 * Страница списка подключенных репозиториев с поиском и сортировкой.
 *
 * @param props Репозитории для отображения.
 * @returns Табличный список и управляющие фильтры.
 */
export function RepositoriesListPage(props: IRepositoryListPageProps): ReactElement {
    const { t } = useTranslation(["dashboard"])
    const { td } = useDynamicTranslation(["dashboard"])
    const sortOptions = useMemo(() => createSortOptions(td), [td])
    const { repositoriesQuery } = useRepositories()
    const apiRepositories = useMemo((): ReadonlyArray<IRepositoryListRepository> => {
        if (repositoriesQuery.data === undefined) {
            return DEFAULT_REPOSITORIES
        }
        return repositoriesQuery.data.repositories.map(mapApiRepositoryToListItem)
    }, [repositoriesQuery.data])
    const repositories = props.repositories ?? apiRepositories
    const isLoading = props.repositories === undefined && repositoriesQuery.isPending
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<"all" | TRepositoryStatus>("all")
    const [sortBy, setSortBy] = useState<TRepositorySortKey>("name")

    const visible = useFilteredRepositories(repositories, {
        search,
        status,
        sortBy,
    })

    const repoReadyCount = repositories.filter((item): boolean => item.status === "ready").length
    const repoScanningCount = repositories.filter(
        (item): boolean => item.status === "scanning",
    ).length
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

    return (
        <PageShell
            layout="fluid"
            subtitle={t("dashboard:repositoriesList.pageSubtitle")}
            title={t("dashboard:repositoriesList.pageTitle")}
        >
            {isLoading === true ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            ) : repositories.length === 0 ? (
                <RepositoriesEmptyState />
            ) : (
                <Card>
                    <CardHeader>
                        <div className="grid gap-3 md:grid-cols-4">
                            <input
                                aria-label={t("dashboard:repositoriesList.searchAriaLabel")}
                                className={`${NATIVE_FORM.input} outline-none`}
                                name="repository-search"
                                onChange={handleSearch}
                                placeholder={t("dashboard:repositoriesList.searchPlaceholder")}
                                value={search}
                            />
                            <select
                                aria-label={t("dashboard:repositoriesList.filterByStatus")}
                                className={NATIVE_FORM.select}
                                value={status}
                                onChange={handleStatusFilter}
                            >
                                <option value="all">
                                    {t("dashboard:repositoriesList.allStatuses")}
                                </option>
                                <option value="ready">
                                    {t("dashboard:repositoriesList.statusReady")}
                                </option>
                                <option value="scanning">
                                    {t("dashboard:repositoriesList.statusScanning")}
                                </option>
                                <option value="error">
                                    {t("dashboard:repositoriesList.statusError")}
                                </option>
                            </select>
                            <select
                                aria-label={t("dashboard:repositoriesList.sortAriaLabel")}
                                className={NATIVE_FORM.select}
                                value={sortBy}
                                onChange={handleSortChange}
                            >
                                {sortOptions.map(
                                    (option): ReactElement => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 grid gap-2 md:grid-cols-3">
                            <RepositoryCountSummary
                                colorClass="text-success"
                                label={t("dashboard:repositoriesList.summaryReady")}
                                value={repoReadyCount}
                            />
                            <RepositoryCountSummary
                                colorClass="text-warning"
                                label={t("dashboard:repositoriesList.summaryScanning")}
                                value={repoScanningCount}
                            />
                            <RepositoryCountSummary
                                colorClass="text-danger"
                                label={t("dashboard:repositoriesList.summaryError")}
                                value={repoErrorCount}
                            />
                        </div>
                        <Table>
                            <Table.ScrollContainer>
                                <Table.Content
                                    aria-label={t("dashboard:repositoriesList.tableAriaLabel")}
                                >
                                    <Table.Header>
                                        <Table.Column isRowHeader>
                                            {t("dashboard:repositoriesList.columnRepository")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnOwner")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnBranch")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnLastScan")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnStatus")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnIssues")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:repositoriesList.columnRecovery")}
                                        </Table.Column>
                                    </Table.Header>
                                    <Table.Body>
                                        {visible.map(
                                            (item): ReactElement => (
                                                <Table.Row key={getRepositoryId(item)}>
                                                    <Table.Cell>
                                                        <Link
                                                            aria-label={td(
                                                                "dashboard:repositoriesList.openOverviewAriaLabel",
                                                                {
                                                                    owner: item.owner,
                                                                    name: item.name,
                                                                },
                                                            )}
                                                            className="font-medium text-foreground underline-offset-4 hover:underline"
                                                            params={{
                                                                repositoryId: getRepositoryId(item),
                                                            }}
                                                            to="/repositories/$repositoryId"
                                                        >
                                                            {item.name}
                                                        </Link>
                                                    </Table.Cell>
                                                    <Table.Cell>{item.owner}</Table.Cell>
                                                    <Table.Cell>{item.branch}</Table.Cell>
                                                    <Table.Cell>
                                                        {formatScanDate(item.lastScanAt)}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <RepositoryStatusBadge
                                                            status={item.status}
                                                        />
                                                    </Table.Cell>
                                                    <Table.Cell>{item.issueCount}</Table.Cell>
                                                    <Table.Cell>
                                                        {item.scanError === undefined ||
                                                        item.status !== "error" ? (
                                                            <span
                                                                className={TYPOGRAPHY.captionMuted}
                                                            >
                                                                {"\u2014"}
                                                            </span>
                                                        ) : (
                                                            <RepositoryScanErrorRecovery
                                                                onRetryScan={props.onRetryScan}
                                                                repositoryId={getRepositoryId(item)}
                                                                scanError={item.scanError}
                                                            />
                                                        )}
                                                    </Table.Cell>
                                                </Table.Row>
                                            ),
                                        )}
                                    </Table.Body>
                                </Table.Content>
                            </Table.ScrollContainer>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </PageShell>
    )
}
