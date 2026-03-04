import { useMemo, useState, type ChangeEvent, type ReactElement } from "react"

import { Button, Card, CardBody, CardHeader } from "@/components/ui"
import { EnterpriseDataTable } from "@/components/infrastructure/enterprise-data-table"

type TIssueTrackingAction = "acknowledge" | "fix" | "snooze" | "ignore"
type TIssueTrackingSeverity = "critical" | "high" | "medium" | "low"
type TIssueTrackingStatus = "dismissed" | "fixed" | "in_progress" | "open"

interface IIssueTrackingIssue {
    /** Уникальный идентификатор проблемы. */
    readonly id: string
    /** Заголовок / краткое описание проблемы. */
    readonly title: string
    /** Репозиторий с проблемой. */
    readonly repository: string
    /** Путь к файлу, где обнаружена проблема. */
    readonly filePath: string
    /** Уровень критичности. */
    readonly severity: TIssueTrackingSeverity
    /** Статус решения. */
    readonly status: TIssueTrackingStatus
    /** Короткий комментарий о типе сигнала. */
    readonly message: string
    /** Отвечающий коллега. */
    readonly owner: string
    /** Время обнаружения. */
    readonly detectedAt: string
}

interface IIssueTrackingPageProps {
    /** Набор issues для отображения (для тестов и интеграции с API). */
    readonly issues?: ReadonlyArray<IIssueTrackingIssue>
    /** Сallback выполнения inline действия. */
    readonly onAction?: (issueId: string, action: TIssueTrackingAction) => void
}

const ISSUE_STATUS_OPTIONS = ["open", "in_progress", "fixed", "dismissed"] as const
const ISSUE_SEVERITY_OPTIONS = ["critical", "high", "medium", "low"] as const

const ISSUE_ACTIONS_BY_STATUS: Record<
    TIssueTrackingStatus,
    ReadonlyArray<TIssueTrackingAction>
> = {
    dismissed: ["acknowledge"],
    fixed: ["acknowledge"],
    in_progress: ["acknowledge", "snooze", "fix"],
    open: ["acknowledge", "snooze", "fix", "ignore"],
}

const ISSUE_ACTION_LABELS: Record<TIssueTrackingAction, string> = {
    acknowledge: "Acknowledge",
    fix: "Mark fixed",
    ignore: "Ignore",
    snooze: "Snooze",
}

const ISSUE_SEVERITY_LABELS: Record<TIssueTrackingSeverity, string> = {
    critical: "Critical",
    high: "High",
    low: "Low",
    medium: "Medium",
}

const ISSUE_STATUS_LABELS: Record<TIssueTrackingStatus, string> = {
    dismissed: "Dismissed",
    fixed: "Fixed",
    in_progress: "In progress",
    open: "Open",
}

const ISSUE_STATUS_STYLES: Record<TIssueTrackingStatus, string> = {
    dismissed: "bg-slate-100 text-slate-700",
    fixed: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-blue-100 text-blue-700",
    open: "bg-rose-100 text-rose-700",
}

const ISSUE_SEVERITY_STYLES: Record<TIssueTrackingSeverity, string> = {
    critical: "bg-rose-100 text-rose-700 border border-rose-200",
    high: "bg-amber-100 text-amber-700 border border-amber-200",
    low: "bg-sky-100 text-sky-700 border border-sky-200",
    medium: "bg-violet-100 text-violet-700 border border-violet-200",
}

const DEFAULT_ISSUES: ReadonlyArray<IIssueTrackingIssue> = [
    {
        detectedAt: "2026-01-12T07:11:00Z",
        filePath: "src/api/repository.ts",
        id: "ISS-101",
        message: "Unhandled error path near data parser",
        owner: "Alice",
        repository: "platform-team/api-gateway",
        severity: "critical",
        status: "open",
        title: "Possible unguarded parse fallback",
    },
    {
        detectedAt: "2026-01-14T13:32:00Z",
        filePath: "src/components/chat-panel.tsx",
        id: "ISS-102",
        message: "Potential DOM injection in dynamic markdown renderer",
        owner: "Bob",
        repository: "frontend-team/ui-dashboard",
        severity: "high",
        status: "in_progress",
        title: "Dynamic markdown requires re-check",
    },
    {
        detectedAt: "2026-01-17T09:21:00Z",
        filePath: "src/workers/scan.ts",
        id: "ISS-103",
        message: "High churn + low review ratio in queue handler",
        owner: "Cara",
        repository: "backend-core/payment-worker",
        severity: "medium",
        status: "fixed",
        title: "Scan queue stability issue",
    },
    {
        detectedAt: "2026-01-18T16:58:00Z",
        filePath: "src/pages/reviews.tsx",
        id: "ISS-104",
        message: "Unstable key usage in virtualized list",
        owner: "Dan",
        repository: "frontend-team/ui-dashboard",
        severity: "low",
        status: "dismissed",
        title: "Virtualization key fallback",
    },
]

const EXTRA_ISSUES: ReadonlyArray<IIssueTrackingIssue> = Array.from(Array(26)).map(
    (_entry, index): IIssueTrackingIssue => {
        const id = `ISS-${String(index + 105)}`
        const repoOptions: ReadonlyArray<string> = [
            "platform-team/api-gateway",
            "frontend-team/ui-dashboard",
            "backend-core/payment-worker",
        ]
        const severityOptions: ReadonlyArray<TIssueTrackingSeverity> = [
            "critical",
            "high",
            "medium",
            "low",
        ]
        const statusOptions: ReadonlyArray<TIssueTrackingStatus> = [
            "open",
            "in_progress",
            "fixed",
            "dismissed",
        ]
        const selectedRepo = repoOptions[index % repoOptions.length]
        const selectedSeverity = severityOptions[index % severityOptions.length]
        const selectedStatus = statusOptions[index % statusOptions.length]
        const repository = selectedRepo ?? repoOptions[0] ?? "platform-team/api-gateway"
        const severity = selectedSeverity ?? severityOptions[0] ?? "medium"
        const status = selectedStatus ?? statusOptions[0] ?? "open"

        return {
            detectedAt: `2026-01-${String(19 + index).padStart(2, "0")}T11:00:00Z`,
            filePath: `src/services/module-${String(index)}.ts`,
            id,
            message: `Auto-discovered pattern in module ${String(index)}`,
            owner: `Owner ${String(index % 6)}`,
            repository,
            severity,
            status,
            title: `Generated issue ${String(index)}`,
        }
    },
)

const ALL_ISSUES: ReadonlyArray<IIssueTrackingIssue> = [...DEFAULT_ISSUES, ...EXTRA_ISSUES]

interface IIssueTrackingFilters {
    /** Поиск по тексту/файлу/репозиторию. */
    readonly search: string
    /** Фильтр по статусу. */
    readonly status: "all" | TIssueTrackingStatus
    /** Фильтр по критичности. */
    readonly severity: "all" | TIssueTrackingSeverity
}

function normalize(value: string): string {
    return value.trim().toLowerCase()
}

function filterIssues(
    issues: ReadonlyArray<IIssueTrackingIssue>,
    filters: IIssueTrackingFilters,
): ReadonlyArray<IIssueTrackingIssue> {
    const query = normalize(filters.search)
    return issues.filter((entry): boolean => {
        const isStatusMatch =
            filters.status === "all" || entry.status === filters.status
        const isSeverityMatch =
            filters.severity === "all" || entry.severity === filters.severity
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

/**
 * Страница issues tracking с фильтрами и virtual-scrolling списком.
 *
 * @param props Набор issues и колбеки для действий.
 * @returns Страница.
 */
export function IssuesTrackingPage(props: IIssueTrackingPageProps = {}): ReactElement {
    const sourceIssues = props.issues ?? ALL_ISSUES
    const [filters, setFilters] = useState<IIssueTrackingFilters>({
        search: "",
        severity: "all",
        status: "all",
    })

    const filteredIssues = useMemo(
        () => filterIssues(sourceIssues, filters),
        [sourceIssues, filters],
    )

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
            setFilters((previousValue): IIssueTrackingFilters => ({
                ...previousValue,
                search: value,
            }))
        }
    }

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        handleFilterChange("search", event.currentTarget.value)
    }

    const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const name = event.currentTarget.name
        const value = event.currentTarget.value

        if (name === "severity" || name === "status") {
            handleFilterChange(name, value)
        }
    }

    const handleAction = (issue: IIssueTrackingIssue, action: TIssueTrackingAction): void => {
        props.onAction?.(issue.id, action)
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Issues tracking</h1>
            <Card>
                <CardHeader>
                    <p className="text-sm font-semibold text-slate-900">Issues tracking</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                        <input
                            aria-label="Search issues"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Search by id, title, repo or file"
                            value={filters.search}
                            onChange={handleSearchChange}
                        />
                        <select
                            aria-label="Filter by status"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            name="status"
                            value={filters.status}
                            onChange={handleSelectChange}
                        >
                            <option value="all">All statuses</option>
                            {ISSUE_STATUS_OPTIONS.map((status): ReactElement => (
                                <option key={status} value={status}>
                                    {ISSUE_STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter by severity"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            name="severity"
                            value={filters.severity}
                            onChange={handleSelectChange}
                        >
                            <option value="all">All severities</option>
                            {ISSUE_SEVERITY_OPTIONS.map((severity): ReactElement => (
                                <option key={severity} value={severity}>
                                    {ISSUE_SEVERITY_LABELS[severity]}
                                </option>
                            ))}
                        </select>
                        <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                            {String(filteredIssues.length)} of {String(sourceIssues.length)} issues
                        </p>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardBody className="space-y-2">
                    <h2 className="text-sm font-semibold text-slate-900">Issue list</h2>
                    <EnterpriseDataTable
                        ariaLabel="Issue list"
                        columns={[
                            {
                                accessor: (issue): string => issue.id,
                                header: "Issue ID",
                                id: "id",
                                pin: "left",
                                size: 130,
                            },
                            {
                                accessor: (issue): string => issue.title,
                                header: "Title",
                                id: "title",
                                size: 260,
                            },
                            {
                                accessor: (issue): string => issue.repository,
                                header: "Repository",
                                id: "repository",
                                size: 220,
                            },
                            {
                                accessor: (issue): string => issue.filePath,
                                header: "File",
                                id: "filePath",
                                size: 220,
                            },
                            {
                                accessor: (issue): string => issue.owner,
                                header: "Owner",
                                id: "owner",
                                size: 140,
                            },
                            {
                                accessor: (issue): string => issue.detectedAt,
                                cell: (issue): string => formatIssueDate(issue.detectedAt),
                                header: "Detected at",
                                id: "detectedAt",
                                size: 170,
                            },
                            {
                                accessor: (issue): string => issue.status,
                                cell: (issue): ReactElement => (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs ${ISSUE_STATUS_STYLES[issue.status]}`}
                                    >
                                        {ISSUE_STATUS_LABELS[issue.status]}
                                    </span>
                                ),
                                header: "Status",
                                id: "status",
                                size: 160,
                            },
                            {
                                accessor: (issue): string => issue.severity,
                                cell: (issue): ReactElement => (
                                    <span
                                        className={`rounded-full border px-2 py-0.5 text-xs ${ISSUE_SEVERITY_STYLES[issue.severity]}`}
                                    >
                                        {ISSUE_SEVERITY_LABELS[issue.severity]}
                                    </span>
                                ),
                                header: "Severity",
                                id: "severity",
                                size: 150,
                            },
                            {
                                accessor: (issue): string => issue.message,
                                header: "Message",
                                id: "message",
                                size: 280,
                            },
                            {
                                accessor: (issue): string => ISSUE_ACTIONS_BY_STATUS[issue.status].join(","),
                                cell: (issue): ReactElement => (
                                    <div className="flex flex-wrap items-center gap-1">
                                        {ISSUE_ACTIONS_BY_STATUS[issue.status].map((action): ReactElement => (
                                            <Button
                                                aria-label={`${action} issue ${issue.id}`}
                                                key={`${issue.id}-${action}`}
                                                size="sm"
                                                variant="light"
                                                onPress={(): void => {
                                                    handleAction(issue, action)
                                                }}
                                            >
                                                {ISSUE_ACTION_LABELS[action]}
                                            </Button>
                                        ))}
                                    </div>
                                ),
                                enableGlobalFilter: false,
                                header: "Actions",
                                id: "actions",
                                isHideable: false,
                                size: 280,
                            },
                        ]}
                        emptyMessage="No issues found for selected filters."
                        getRowId={(issue): string => issue.id}
                        id="issues-tracking-table"
                        rows={filteredIssues}
                    />
                </CardBody>
            </Card>
        </section>
    )
}
