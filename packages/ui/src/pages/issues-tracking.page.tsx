import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import InfiniteScroll from "react-infinite-scroll-component"

import { Button, Card, CardContent, Skeleton, Table } from "@heroui/react"
import { PageShell } from "@/components/layout/page-shell"
import { useLocalStorage } from "usehooks-ts"
import { useIssues } from "@/lib/hooks/queries/use-issues"
import type {
    IIssue,
    TIssueAction,
    TIssueSeverity,
    TIssueStatus,
} from "@/lib/api/endpoints/issues.endpoint"

const ISSUE_STATUS_OPTIONS = ["open", "in_progress", "fixed", "dismissed"] as const
const ISSUE_SEVERITY_OPTIONS = ["critical", "high", "medium", "low"] as const

const ISSUE_ACTIONS_BY_STATUS: Record<TIssueStatus, ReadonlyArray<TIssueAction>> = {
    dismissed: ["acknowledge"],
    fixed: ["acknowledge"],
    in_progress: ["acknowledge", "snooze", "fix"],
    open: ["acknowledge", "snooze", "fix", "ignore"],
}

function createIssueActionLabels(t: (key: string) => string): Record<TIssueAction, string> {
    return {
        acknowledge: t("dashboard:issuesTracking.actionAcknowledge"),
        fix: t("dashboard:issuesTracking.actionMarkFixed"),
        ignore: t("dashboard:issuesTracking.actionIgnore"),
        snooze: t("dashboard:issuesTracking.actionSnooze"),
    }
}

function createIssueSeverityLabels(
    t: (key: string) => string,
): Record<TIssueSeverity, string> {
    return {
        critical: t("dashboard:issuesTracking.severityCritical"),
        high: t("dashboard:issuesTracking.severityHigh"),
        low: t("dashboard:issuesTracking.severityLow"),
        medium: t("dashboard:issuesTracking.severityMedium"),
    }
}

function createIssueStatusLabels(t: (key: string) => string): Record<TIssueStatus, string> {
    return {
        dismissed: t("dashboard:issuesTracking.statusDismissed"),
        fixed: t("dashboard:issuesTracking.statusFixed"),
        in_progress: t("dashboard:issuesTracking.statusInProgress"),
        open: t("dashboard:issuesTracking.statusOpen"),
    }
}

const ISSUE_STATUS_STYLES: Record<TIssueStatus, string> = {
    dismissed: "bg-surface-secondary text-foreground",
    fixed: "bg-success/15 text-success",
    in_progress: "bg-accent/15 text-accent",
    open: "bg-danger/15 text-danger",
}

const ISSUE_SEVERITY_STYLES: Record<TIssueSeverity, string> = {
    critical: "bg-danger/15 text-danger border border-danger/30",
    high: "bg-warning/15 text-warning border border-warning/30",
    low: "bg-accent/10 text-accent border border-accent/30",
    medium: "bg-accent/15 text-accent border border-accent/30",
}

const ISSUE_FILTER_PERSISTENCE_KEY = "issues-tracking:filters:v1"
const ISSUE_PAGE_SIZE = 50

interface IIssueTrackingFilters {
    /** Поиск по тексту/файлу/репозиторию. */
    readonly search: string
    /** Фильтр по статусу. */
    readonly status: "all" | TIssueStatus
    /** Фильтр по критичности. */
    readonly severity: "all" | TIssueSeverity
}

const DEFAULT_ISSUE_FILTERS: IIssueTrackingFilters = {
    search: "",
    severity: "all",
    status: "all",
}

function normalize(value: string): string {
    return value.trim().toLowerCase()
}

function filterIssues(
    issues: ReadonlyArray<IIssue>,
    filters: IIssueTrackingFilters,
): ReadonlyArray<IIssue> {
    const query = normalize(filters.search)
    return issues.filter((entry): boolean => {
        const isStatusMatch = filters.status === "all" || entry.status === filters.status
        const isSeverityMatch = filters.severity === "all" || entry.severity === filters.severity
        const isSearchMatch =
            query.length === 0 ||
            normalize(entry.id).includes(query) ||
            normalize(entry.title).includes(query) ||
            normalize(entry.repository).includes(query) ||
            normalize(entry.filePath).includes(query)

        return isStatusMatch && isSeverityMatch && isSearchMatch
    })
}

type IIssueTrackingFilterField = keyof IIssueTrackingFilters

function formatIssueDate(raw: string): string {
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) {
        return "\u2014"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        year: "2-digit",
    })
}

/**
 * Страница issues tracking с фильтрами и virtual-scrolling списком.
 *
 * @returns Страница.
 */
export function IssuesTrackingPage(): ReactElement {
    const { t } = useTranslation(["dashboard"])
    const { td } = useDynamicTranslation(["dashboard"])
    const ISSUE_ACTION_LABELS = useMemo(() => createIssueActionLabels(td), [td])
    const ISSUE_SEVERITY_LABELS = useMemo(() => createIssueSeverityLabels(td), [td])
    const ISSUE_STATUS_LABELS = useMemo(() => createIssueStatusLabels(td), [td])

    const { issuesQuery, performAction } = useIssues()
    const sourceIssues = issuesQuery.data?.issues ?? []

    const [visibleItems, setVisibleItems] = useState<number>(ISSUE_PAGE_SIZE)
    const [filters, setFilters] = useLocalStorage<IIssueTrackingFilters>(
        ISSUE_FILTER_PERSISTENCE_KEY,
        DEFAULT_ISSUE_FILTERS,
    )

    const filteredIssues = useMemo(
        () => filterIssues(sourceIssues, filters),
        [sourceIssues, filters],
    )
    const visibleIssues = useMemo((): ReadonlyArray<IIssue> => {
        return filteredIssues.slice(0, visibleItems)
    }, [filteredIssues, visibleItems])
    const hasMoreIssues = filteredIssues.length > visibleItems

    useEffect((): void => {
        setVisibleItems(ISSUE_PAGE_SIZE)
    }, [sourceIssues, filters.search, filters.severity, filters.status])

    const handleLoadMore = (): void => {
        setVisibleItems((previousValue): number => {
            return Math.min(previousValue + ISSUE_PAGE_SIZE, filteredIssues.length)
        })
    }

    const handleFilterChange = (name: IIssueTrackingFilterField, value: string): void => {
        if (name === "severity") {
            setFilters((previousValue): IIssueTrackingFilters => {
                if (value === "all") {
                    return {
                        ...previousValue,
                        severity: "all",
                    }
                }

                if (
                    value === "critical" ||
                    value === "high" ||
                    value === "low" ||
                    value === "medium"
                ) {
                    return {
                        ...previousValue,
                        severity: value,
                    }
                }

                return previousValue
            })
            return
        }

        if (name === "status") {
            setFilters((previousValue): IIssueTrackingFilters => {
                if (value === "all") {
                    return {
                        ...previousValue,
                        status: "all",
                    }
                }

                if (
                    value === "open" ||
                    value === "in_progress" ||
                    value === "fixed" ||
                    value === "dismissed"
                ) {
                    return {
                        ...previousValue,
                        status: value,
                    }
                }

                return previousValue
            })
            return
        }

        if (name === "search") {
            setFilters(
                (previousValue): IIssueTrackingFilters => ({
                    ...previousValue,
                    search: value,
                }),
            )
        }
    }

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        handleFilterChange("search", event.currentTarget.value)
    }

    const handleSelectChange = (
        name: IIssueTrackingFilterField,
    ): ((event: ChangeEvent<HTMLSelectElement>) => void) => {
        return (event: ChangeEvent<HTMLSelectElement>): void => {
            const nextValue = event.currentTarget.value
            handleFilterChange(name, nextValue)
        }
    }

    const handleAction = (issue: IIssue, action: TIssueAction): void => {
        performAction.mutate({ id: issue.id, action })
    }

    return (
        <PageShell layout="fluid" title={t("dashboard:issuesTracking.pageTitle")}>
            <div className="grid gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 backdrop-blur-sm md:grid-cols-4">
                <input
                    aria-label={t("dashboard:issuesTracking.searchAriaLabel")}
                    className="rounded-lg border border-border/50 bg-surface/80 px-3 py-2 text-sm text-foreground outline-none backdrop-blur-sm transition-colors duration-150 placeholder:text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    placeholder={t("dashboard:issuesTracking.searchPlaceholder")}
                    value={filters.search}
                    onChange={handleSearchChange}
                />
                <select
                    aria-label={t("dashboard:issuesTracking.filterByStatus")}
                    className="rounded-lg border border-border/50 bg-surface/80 px-3 py-2 text-sm text-foreground outline-none backdrop-blur-sm transition-colors duration-150 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    value={filters.status}
                    onChange={handleSelectChange("status")}
                >
                    <option value="all">{t("dashboard:issuesTracking.allStatuses")}</option>
                    {ISSUE_STATUS_OPTIONS.map(
                        (status): ReactElement => (
                            <option key={status} value={status}>
                                {ISSUE_STATUS_LABELS[status]}
                            </option>
                        ),
                    )}
                </select>
                <select
                    aria-label={t("dashboard:issuesTracking.filterBySeverity")}
                    className="rounded-lg border border-border/50 bg-surface/80 px-3 py-2 text-sm text-foreground outline-none backdrop-blur-sm transition-colors duration-150 focus:border-accent/50 focus:ring-1 focus:ring-accent/20"
                    value={filters.severity}
                    onChange={handleSelectChange("severity")}
                >
                    <option value="all">{t("dashboard:issuesTracking.allSeverities")}</option>
                    {ISSUE_SEVERITY_OPTIONS.map(
                        (severity): ReactElement => (
                            <option key={severity} value={severity}>
                                {ISSUE_SEVERITY_LABELS[severity]}
                            </option>
                        ),
                    )}
                </select>
                <p className="flex items-center rounded-lg border border-border/30 bg-surface-secondary/40 px-3 py-2 text-sm text-muted">
                    {td("dashboard:issuesTracking.issueCount", {
                        filtered: String(filteredIssues.length),
                        total: String(sourceIssues.length),
                    })}
                </p>
            </div>

            <Card className="border border-border/60 bg-surface/80 backdrop-blur-sm">
                <CardContent className="space-y-2 pt-3">
                    <InfiniteScroll
                        dataLength={visibleIssues.length}
                        hasMore={hasMoreIssues}
                        loader={<Skeleton className="mx-auto mt-2 h-8 w-48 rounded-lg" />}
                        next={handleLoadMore}
                    >
                        <Table>
                            <Table.ScrollContainer>
                                <Table.Content
                                    aria-label={t("dashboard:issuesTracking.issueListAriaLabel")}
                                >
                                    <Table.Header>
                                        <Table.Column isRowHeader>
                                            {t("dashboard:issuesTracking.columnIssueId")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnTitle")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnRepository")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnFile")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnOwner")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnDetectedAt")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnStatus")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnSeverity")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnMessage")}
                                        </Table.Column>
                                        <Table.Column>
                                            {t("dashboard:issuesTracking.columnActions")}
                                        </Table.Column>
                                    </Table.Header>
                                    <Table.Body>
                                        {visibleIssues.map(
                                            (issue): ReactElement => (
                                                <Table.Row key={issue.id}>
                                                    <Table.Cell>{issue.id}</Table.Cell>
                                                    <Table.Cell>{issue.title}</Table.Cell>
                                                    <Table.Cell>{issue.repository}</Table.Cell>
                                                    <Table.Cell>{issue.filePath}</Table.Cell>
                                                    <Table.Cell>{issue.owner}</Table.Cell>
                                                    <Table.Cell>
                                                        {formatIssueDate(issue.detectedAt)}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs ${ISSUE_STATUS_STYLES[issue.status]}`}
                                                        >
                                                            {ISSUE_STATUS_LABELS[issue.status]}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <span
                                                            className={`rounded-full border px-2 py-0.5 text-xs ${ISSUE_SEVERITY_STYLES[issue.severity]}`}
                                                        >
                                                            {ISSUE_SEVERITY_LABELS[issue.severity]}
                                                        </span>
                                                    </Table.Cell>
                                                    <Table.Cell>{issue.message}</Table.Cell>
                                                    <Table.Cell>
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            {ISSUE_ACTIONS_BY_STATUS[
                                                                issue.status
                                                            ].map(
                                                                (action): ReactElement => (
                                                                    <Button
                                                                        aria-label={`${action} issue ${issue.id}`}
                                                                        key={`${issue.id}-${action}`}
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onPress={(): void => {
                                                                            handleAction(
                                                                                issue,
                                                                                action,
                                                                            )
                                                                        }}
                                                                    >
                                                                        {
                                                                            ISSUE_ACTION_LABELS[
                                                                                action
                                                                            ]
                                                                        }
                                                                    </Button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </Table.Cell>
                                                </Table.Row>
                                            ),
                                        )}
                                    </Table.Body>
                                </Table.Content>
                            </Table.ScrollContainer>
                        </Table>
                    </InfiniteScroll>
                </CardContent>
            </Card>
        </PageShell>
    )
}
