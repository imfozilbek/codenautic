import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { EnterpriseDataTable } from "@/components/infrastructure/enterprise-data-table"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastSuccess } from "@/lib/notifications/toast"

type TAuditAction =
    | "integration.connected"
    | "member.invited"
    | "policy.updated"
    | "role.changed"
    | "schedule.updated"

interface IAuditLogEntry {
    /** Уникальный идентификатор записи. */
    readonly id: string
    /** Дата-время события в ISO формате. */
    readonly occurredAt: string
    /** Инициатор действия. */
    readonly actor: string
    /** Тип изменения. */
    readonly action: TAuditAction
    /** Сущность, на которую повлияло изменение. */
    readonly target: string
    /** Расшифровка изменения. */
    readonly details: string
}

interface IAuditFilters {
    /** Фильтр по актору. */
    readonly actor: string
    /** Фильтр по типу действия. */
    readonly action: "all" | TAuditAction
    /** Нижняя граница даты YYYY-MM-DD. */
    readonly dateFrom: string
    /** Верхняя граница даты YYYY-MM-DD. */
    readonly dateTo: string
}

interface ISettingsAuditLogsPageProps {
    /** Необязательный внешний список логов для тестов/интеграции. */
    readonly logs?: ReadonlyArray<IAuditLogEntry>
}

const INITIAL_AUDIT_LOGS: ReadonlyArray<IAuditLogEntry> = [
    {
        action: "member.invited",
        actor: "Ari Karimov",
        details: "Invited anya@acme.dev to Platform Enablement team.",
        id: "audit-1",
        occurredAt: "2026-03-04T09:13:00Z",
        target: "team:platform-enablement",
    },
    {
        action: "role.changed",
        actor: "Mila Davletova",
        details: "Changed role for oliver@acme.dev from viewer to developer.",
        id: "audit-2",
        occurredAt: "2026-03-04T10:02:00Z",
        target: "team:platform-ux",
    },
    {
        action: "integration.connected",
        actor: "Nika Saryeva",
        details: "Connected Jira integration and enabled issue sync.",
        id: "audit-3",
        occurredAt: "2026-03-03T16:22:00Z",
        target: "integration:jira",
    },
    {
        action: "policy.updated",
        actor: "Ari Karimov",
        details: "Updated review policy for critical repositories.",
        id: "audit-4",
        occurredAt: "2026-03-03T13:54:00Z",
        target: "policy:code-review",
    },
    {
        action: "schedule.updated",
        actor: "System",
        details: "Rescan schedule switched to weekdays 09:00 UTC+05.",
        id: "audit-5",
        occurredAt: "2026-03-02T07:10:00Z",
        target: "scan-schedule:main",
    },
]

const EXTRA_AUDIT_LOGS: ReadonlyArray<IAuditLogEntry> = Array.from({ length: 120 }).map(
    (_entry, index): IAuditLogEntry => {
        const actors: ReadonlyArray<string> = [
            "Ari Karimov",
            "Mila Davletova",
            "Nika Saryeva",
            "System",
        ]
        const actions: ReadonlyArray<TAuditAction> = [
            "member.invited",
            "role.changed",
            "integration.connected",
            "policy.updated",
            "schedule.updated",
        ]
        const actor = actors[index % actors.length] ?? "System"
        const action = actions[index % actions.length] ?? "policy.updated"
        const day = String(1 + (index % 28)).padStart(2, "0")
        const hour = String(8 + (index % 11)).padStart(2, "0")
        const minute = String((index * 7) % 60).padStart(2, "0")

        return {
            action,
            actor,
            details: `Generated audit event ${String(index + 1)} for ${action}.`,
            id: `audit-generated-${String(index + 1)}`,
            occurredAt: `2026-02-${day}T${hour}:${minute}:00Z`,
            target: `resource:${String(index + 1)}`,
        }
    },
)

const ALL_AUDIT_LOGS: ReadonlyArray<IAuditLogEntry> = [...INITIAL_AUDIT_LOGS, ...EXTRA_AUDIT_LOGS]

function mapActionChipColor(action: TAuditAction): "default" | "primary" | "success" | "warning" {
    if (action === "integration.connected") {
        return "success"
    }
    if (action === "role.changed") {
        return "primary"
    }
    if (action === "policy.updated") {
        return "warning"
    }
    return "default"
}

function formatActionLabel(action: TAuditAction): string {
    if (action === "integration.connected") {
        return "Integration connected"
    }
    if (action === "member.invited") {
        return "Member invited"
    }
    if (action === "policy.updated") {
        return "Policy updated"
    }
    if (action === "role.changed") {
        return "Role changed"
    }
    return "Schedule updated"
}

function formatOccurredAt(value: string): string {
    const parsed = new Date(value)
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

function parseDateBoundary(dateValue: string, boundary: "from" | "to"): number | undefined {
    if (dateValue.trim().length === 0) {
        return undefined
    }

    const suffix = boundary === "from" ? "T00:00:00.000Z" : "T23:59:59.999Z"
    const parsed = new Date(`${dateValue}${suffix}`)
    const timestamp = parsed.getTime()

    if (Number.isNaN(timestamp)) {
        return undefined
    }

    return timestamp
}

function escapeCsvValue(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

function buildAuditCsv(entries: ReadonlyArray<IAuditLogEntry>): string {
    const header = ["id", "occurredAt", "actor", "action", "target", "details"]
    const rows = entries.map((entry): string =>
        [
            escapeCsvValue(entry.id),
            escapeCsvValue(entry.occurredAt),
            escapeCsvValue(entry.actor),
            escapeCsvValue(entry.action),
            escapeCsvValue(entry.target),
            escapeCsvValue(entry.details),
        ].join(","),
    )

    return `${header.join(",")}\n${rows.join("\n")}`
}

function triggerCsvDownload(csvPayload: string, fileName: string): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return
    }
    if (typeof URL.createObjectURL !== "function") {
        return
    }

    const blob = new Blob([csvPayload], { type: "text/csv;charset=utf-8;" })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.style.display = "none"
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
}

function filterAuditLogs(
    logs: ReadonlyArray<IAuditLogEntry>,
    filters: IAuditFilters,
): ReadonlyArray<IAuditLogEntry> {
    const fromBoundary = parseDateBoundary(filters.dateFrom, "from")
    const toBoundary = parseDateBoundary(filters.dateTo, "to")

    return logs.filter((entry): boolean => {
        const actorMatches = filters.actor === "all" || entry.actor === filters.actor
        const actionMatches = filters.action === "all" || entry.action === filters.action
        const occurredAtMs = new Date(entry.occurredAt).getTime()
        const fromMatches = fromBoundary === undefined || occurredAtMs >= fromBoundary
        const toMatches = toBoundary === undefined || occurredAtMs <= toBoundary

        return actorMatches && actionMatches && fromMatches && toMatches
    })
}

/**
 * Страница просмотра аудита изменений с виртуализированным списком.
 *
 * @param props Внешний список логов для теста/интеграции.
 * @returns Экран Audit Logs.
 */
export function SettingsAuditLogsPage(props: ISettingsAuditLogsPageProps = {}): ReactElement {
    const sourceLogs = props.logs ?? ALL_AUDIT_LOGS
    const [filters, setFilters] = useState<IAuditFilters>({
        action: "all",
        actor: "all",
        dateFrom: "",
        dateTo: "",
    })
    const [exportMessage, setExportMessage] = useState<string>("")

    const actorOptions = useMemo((): ReadonlyArray<string> => {
        const actorSet = new Set<string>()
        sourceLogs.forEach((entry): void => {
            actorSet.add(entry.actor)
        })
        return Array.from(actorSet).sort((left, right): number => left.localeCompare(right))
    }, [sourceLogs])

    const filteredLogs = useMemo(
        (): ReadonlyArray<IAuditLogEntry> => filterAuditLogs(sourceLogs, filters),
        [sourceLogs, filters],
    )

    const handleExport = (): void => {
        const payload = buildAuditCsv(filteredLogs)
        const timestamp = new Date().toISOString().slice(0, 10)
        const fileName = `audit-logs-${timestamp}.csv`

        triggerCsvDownload(payload, fileName)
        setExportMessage(`Exported ${filteredLogs.length} rows to CSV.`)
        showToastSuccess("Audit logs exported.")
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>Audit logs</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                Review change history, filter by actor and action, inspect selected date range, and
                export filtered results.
            </p>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>Filters</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto]">
                        <select
                            aria-label="Filter by actor"
                            className={NATIVE_FORM.select}
                            id="audit-filter-actor"
                            value={filters.actor}
                            onChange={(event): void => {
                                const nextValue = event.currentTarget.value
                                if (nextValue.length === 0) {
                                    return
                                }
                                setFilters(
                                    (previous): IAuditFilters => ({
                                        ...previous,
                                        actor: nextValue,
                                    }),
                                )
                            }}
                        >
                            <option value="all">All actors</option>
                            {actorOptions.map(
                                (actor): ReactElement => (
                                    <option key={actor} value={actor}>
                                        {actor}
                                    </option>
                                ),
                            )}
                        </select>
                        <select
                            aria-label="Filter by action"
                            className={NATIVE_FORM.select}
                            id="audit-filter-action"
                            value={filters.action}
                            onChange={(event): void => {
                                const nextValue = event.currentTarget.value
                                if (
                                    nextValue === "all" ||
                                    nextValue === "integration.connected" ||
                                    nextValue === "member.invited" ||
                                    nextValue === "policy.updated" ||
                                    nextValue === "role.changed" ||
                                    nextValue === "schedule.updated"
                                ) {
                                    setFilters(
                                        (previous): IAuditFilters => ({
                                            ...previous,
                                            action: nextValue,
                                        }),
                                    )
                                }
                            }}
                        >
                            <option value="all">All actions</option>
                            <option value="member.invited">Member invited</option>
                            <option value="role.changed">Role changed</option>
                            <option value="integration.connected">Integration connected</option>
                            <option value="policy.updated">Policy updated</option>
                            <option value="schedule.updated">Schedule updated</option>
                        </select>
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-text-tertiary"
                                htmlFor="audit-filter-date-from"
                            >
                                Date from
                            </label>
                            <input
                                aria-label="Date from"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                id="audit-filter-date-from"
                                type="date"
                                value={filters.dateFrom}
                                onChange={(event): void => {
                                    const nextDateFrom = event.currentTarget.value
                                    setFilters(
                                        (previous): IAuditFilters => ({
                                            ...previous,
                                            dateFrom: nextDateFrom,
                                        }),
                                    )
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-text-tertiary"
                                htmlFor="audit-filter-date-to"
                            >
                                Date to
                            </label>
                            <input
                                aria-label="Date to"
                                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                                id="audit-filter-date-to"
                                type="date"
                                value={filters.dateTo}
                                onChange={(event): void => {
                                    const nextDateTo = event.currentTarget.value
                                    setFilters(
                                        (previous): IAuditFilters => ({
                                            ...previous,
                                            dateTo: nextDateTo,
                                        }),
                                    )
                                }}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                className="w-full md:w-auto"
                                variant="flat"
                                onPress={handleExport}
                            >
                                Export CSV
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-text-secondary">
                        Showing {filteredLogs.length} of {sourceLogs.length} entries.
                    </p>
                    {exportMessage.length > 0 ? (
                        <Alert color="success" title="Export completed" variant="flat">
                            {exportMessage}
                        </Alert>
                    ) : null}
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="flex items-center justify-between">
                    <p className={TYPOGRAPHY.sectionTitle}>Changes list</p>
                    <Chip size="sm" variant="flat">
                        {filteredLogs.length} entries
                    </Chip>
                </CardHeader>
                <CardBody>
                    <EnterpriseDataTable
                        ariaLabel="Audit log list"
                        columns={[
                            {
                                accessor: (entry): string => entry.id,
                                header: "ID",
                                id: "id",
                                pin: "left",
                                size: 180,
                            },
                            {
                                accessor: (entry): string => entry.actor,
                                header: "Actor",
                                id: "actor",
                                size: 180,
                            },
                            {
                                accessor: (entry): string => entry.action,
                                cell: (entry): ReactElement => (
                                    <Chip
                                        color={mapActionChipColor(entry.action)}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {formatActionLabel(entry.action)}
                                    </Chip>
                                ),
                                header: "Action",
                                id: "action",
                                size: 190,
                            },
                            {
                                accessor: (entry): string => formatOccurredAt(entry.occurredAt),
                                header: "Occurred at",
                                id: "occurredAt",
                                size: 180,
                            },
                            {
                                accessor: (entry): string => entry.details,
                                header: "Details",
                                id: "details",
                                size: 340,
                            },
                            {
                                accessor: (entry): string => entry.target,
                                header: "Target",
                                id: "target",
                                size: 260,
                            },
                        ]}
                        emptyMessage="No audit logs found for current filters."
                        getRowId={(entry): string => entry.id}
                        id="settings-audit-logs-table"
                        rows={filteredLogs}
                    />
                </CardBody>
            </Card>
        </section>
    )
}
