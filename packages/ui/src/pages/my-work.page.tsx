import { type ReactElement, useEffect, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TTriageCategory =
    | "assigned_ccr"
    | "critical_issue"
    | "inbox_notification"
    | "pending_approval"
    | "stuck_job"
type TTriageSeverity = "critical" | "high" | "medium"
type TTriageScope = "mine" | "repo" | "team"
type TTriageStatus = "assigned" | "blocked" | "done" | "in_progress" | "snoozed" | "unassigned"
type TTriageOwner = "me" | "team" | "unassigned"
type TReviewerRole = "admin" | "developer" | "lead" | "viewer"
type TSlaState = "breach" | "healthy" | "warning"
type TAuditAction =
    | "assign_to_me"
    | "escalate"
    | "mark_done"
    | "mark_read"
    | "open_context"
    | "snooze"
    | "start_work"

interface ITriageItem {
    /** Идентификатор triage item. */
    readonly id: string
    /** Категория triage. */
    readonly category: TTriageCategory
    /** Заголовок item. */
    readonly title: string
    /** Приоритет/severity. */
    readonly severity: TTriageSeverity
    /** Репозиторий источника. */
    readonly repository: string
    /** Owner item. */
    readonly owner: TTriageOwner
    /** Deep-link в целевой контекст. */
    readonly deepLink: string
    /** Временная метка. */
    readonly timestamp: string
    /** Read status. */
    readonly isRead: boolean
    /** Lifecycle status. */
    readonly status: TTriageStatus
    /** Deadline для SLA. */
    readonly dueAt: string
    /** Целевой SLA в минутах. */
    readonly slaMinutes: number
    /** Уровень эскалации. */
    readonly escalationLevel: "none" | "warn" | "critical"
}

interface IAuditEntry {
    /** Уникальный id записи. */
    readonly id: string
    /** Item, к которому относится запись. */
    readonly itemId: string
    /** Тип выполненного действия. */
    readonly action: TAuditAction
    /** Когда произошло действие. */
    readonly timestamp: string
}

const TRIAGE_ITEMS_DEFAULT: ReadonlyArray<ITriageItem> = [
    {
        category: "assigned_ccr",
        deepLink: "/reviews/412",
        dueAt: "2026-03-04T11:00:00Z",
        escalationLevel: "none",
        id: "MW-1001",
        isRead: false,
        owner: "me",
        repository: "repo-ui",
        severity: "high",
        slaMinutes: 120,
        status: "in_progress",
        timestamp: "2026-03-04T10:10:00Z",
        title: "CCR #412 needs final response",
    },
    {
        category: "critical_issue",
        deepLink: "/issues",
        dueAt: "2026-03-04T10:30:00Z",
        escalationLevel: "warn",
        id: "MW-1002",
        isRead: false,
        owner: "team",
        repository: "repo-core",
        severity: "critical",
        slaMinutes: 60,
        status: "unassigned",
        timestamp: "2026-03-04T09:42:00Z",
        title: "Tenant boundary regression in auth middleware",
    },
    {
        category: "inbox_notification",
        deepLink: "/settings-notifications",
        dueAt: "2026-03-04T11:20:00Z",
        escalationLevel: "none",
        id: "MW-1003",
        isRead: true,
        owner: "me",
        repository: "repo-ui",
        severity: "medium",
        slaMinutes: 240,
        status: "assigned",
        timestamp: "2026-03-04T08:30:00Z",
        title: "Notification digest pending confirmation",
    },
    {
        category: "stuck_job",
        deepLink: "/settings-jobs",
        dueAt: "2026-03-04T10:20:00Z",
        escalationLevel: "warn",
        id: "MW-1004",
        isRead: false,
        owner: "unassigned",
        repository: "repo-api",
        severity: "high",
        slaMinutes: 45,
        status: "blocked",
        timestamp: "2026-03-04T08:15:00Z",
        title: "Scan worker stuck on queue heartbeat",
    },
    {
        category: "pending_approval",
        deepLink: "/reviews/409",
        dueAt: "2026-03-04T10:45:00Z",
        escalationLevel: "none",
        id: "MW-1005",
        isRead: false,
        owner: "team",
        repository: "repo-api",
        severity: "high",
        slaMinutes: 90,
        status: "assigned",
        timestamp: "2026-03-04T07:58:00Z",
        title: "Approval pending for CCR #409",
    },
]

const ASSIGNABLE_ROLES: ReadonlyArray<TReviewerRole> = ["developer", "lead", "admin"]
const ESCALATION_ROLES: ReadonlyArray<TReviewerRole> = ["lead", "admin"]

function formatTimestamp(rawValue: string): string {
    const date = new Date(rawValue)
    if (Number.isNaN(date.getTime())) {
        return "—"
    }

    return date.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
    })
}

function severityWeight(severity: TTriageSeverity): number {
    if (severity === "critical") {
        return 3
    }
    if (severity === "high") {
        return 2
    }
    return 1
}

function isRoleAllowed(role: TReviewerRole, allowedRoles: ReadonlyArray<TReviewerRole>): boolean {
    return allowedRoles.includes(role)
}

function getSlaState(item: ITriageItem, nowTimestamp: number): TSlaState {
    const dueTimestamp = new Date(item.dueAt).getTime()
    if (Number.isNaN(dueTimestamp)) {
        return "warning"
    }

    const millisecondsLeft = dueTimestamp - nowTimestamp
    if (millisecondsLeft <= 0) {
        return "breach"
    }

    if (millisecondsLeft <= 30 * 60 * 1000) {
        return "warning"
    }

    return "healthy"
}

function getSlaColor(state: TSlaState): "danger" | "success" | "warning" {
    if (state === "breach") {
        return "danger"
    }
    if (state === "healthy") {
        return "success"
    }
    return "warning"
}

function getStatusColor(
    status: TTriageStatus,
): "danger" | "default" | "primary" | "success" | "warning" {
    if (status === "blocked") {
        return "danger"
    }
    if (status === "in_progress") {
        return "primary"
    }
    if (status === "done") {
        return "success"
    }
    if (status === "snoozed") {
        return "warning"
    }
    return "default"
}

function getEscalationColor(
    level: ITriageItem["escalationLevel"],
): "danger" | "default" | "warning" {
    if (level === "critical") {
        return "danger"
    }
    if (level === "warn") {
        return "warning"
    }
    return "default"
}

function getSlaLabel(state: TSlaState): string {
    if (state === "breach") {
        return "SLA breach"
    }
    if (state === "warning") {
        return "SLA warning"
    }
    return "SLA healthy"
}

function formatAuditAction(action: TAuditAction): string {
    if (action === "assign_to_me") {
        return "assigned to current reviewer"
    }
    if (action === "mark_read") {
        return "marked as read"
    }
    if (action === "snooze") {
        return "snoozed"
    }
    if (action === "open_context") {
        return "opened context"
    }
    if (action === "escalate") {
        return "escalated"
    }
    if (action === "start_work") {
        return "moved to in progress"
    }
    return "marked as done"
}

/**
 * Unified triage hub "My Work".
 *
 * @returns Единый экран triage с приоритизацией, ownership и escalation.
 */
export function MyWorkPage(): ReactElement {
    const [scope, setScope] = useState<TTriageScope>("mine")
    const [reviewerRole, setReviewerRole] = useState<TReviewerRole>("lead")
    const [items, setItems] = useState<ReadonlyArray<ITriageItem>>(TRIAGE_ITEMS_DEFAULT)
    const [lastActionSummary, setLastActionSummary] = useState("No triage actions yet.")
    const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now())
    const [auditTrail, setAuditTrail] = useState<ReadonlyArray<IAuditEntry>>([])

    const filteredItems = useMemo((): ReadonlyArray<ITriageItem> => {
        const scopeItems = items.filter((item): boolean => {
            if (scope === "mine") {
                return item.owner === "me"
            }
            if (scope === "team") {
                return item.owner === "team" || item.owner === "me"
            }
            return item.repository === "repo-api" || item.repository === "repo-core"
        })

        return [...scopeItems].sort((left, right): number => {
            const severityDelta = severityWeight(right.severity) - severityWeight(left.severity)
            if (severityDelta !== 0) {
                return severityDelta
            }

            const leftSlaRank = getSlaState(left, nowTimestamp) === "breach" ? 1 : 0
            const rightSlaRank = getSlaState(right, nowTimestamp) === "breach" ? 1 : 0
            if (rightSlaRank - leftSlaRank !== 0) {
                return rightSlaRank - leftSlaRank
            }

            return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
        })
    }, [items, nowTimestamp, scope])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const handleKeyboardShortcut = (event: KeyboardEvent): void => {
            if (event.altKey !== true) {
                return
            }

            if (event.key === "1") {
                setScope("mine")
            } else if (event.key === "2") {
                setScope("team")
            } else if (event.key === "3") {
                setScope("repo")
            } else {
                return
            }

            event.preventDefault()
        }

        window.addEventListener("keydown", handleKeyboardShortcut)
        return (): void => {
            window.removeEventListener("keydown", handleKeyboardShortcut)
        }
    }, [])

    useEffect((): (() => void) | void => {
        if (typeof window === "undefined") {
            return
        }

        const timerId = window.setInterval((): void => {
            setNowTimestamp(Date.now())
        }, 30_000)

        return (): void => {
            window.clearInterval(timerId)
        }
    }, [])

    const addAuditEntry = (itemId: string, action: TAuditAction): void => {
        setAuditTrail((previous): ReadonlyArray<IAuditEntry> => {
            const nextEntry: IAuditEntry = {
                action,
                id: `${Date.now()}-${itemId}-${action}`,
                itemId,
                timestamp: new Date().toISOString(),
            }

            return [nextEntry, ...previous].slice(0, 12)
        })
    }

    const handleAssignToMe = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ASSIGNABLE_ROLES) !== true) {
            setLastActionSummary("Current role cannot assign triage ownership.")
            return
        }

        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }
                    return {
                        ...item,
                        owner: "me",
                        status: item.status === "unassigned" ? "assigned" : item.status,
                    }
                }),
        )
        setLastActionSummary(`Assigned ${itemId} to current reviewer.`)
        addAuditEntry(itemId, "assign_to_me")
    }

    const handleMarkRead = (itemId: string): void => {
        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }
                    return {
                        ...item,
                        isRead: true,
                    }
                }),
        )
        setLastActionSummary(`Marked ${itemId} as read.`)
        addAuditEntry(itemId, "mark_read")
    }

    const handleSnooze = (itemId: string): void => {
        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }
                    return {
                        ...item,
                        status: "snoozed",
                    }
                }),
        )
        setLastActionSummary(`Snoozed ${itemId} until next triage cycle.`)
        addAuditEntry(itemId, "snooze")
        showToastInfo("Item snoozed.")
    }

    const handleOpenReview = (itemId: string): void => {
        const item = items.find((candidate): boolean => candidate.id === itemId)
        if (item === undefined) {
            return
        }

        if (typeof window !== "undefined") {
            window.location.assign(item.deepLink)
        }
        setLastActionSummary(`Opened ${item.id} context: ${item.deepLink}`)
        addAuditEntry(itemId, "open_context")
        showToastSuccess("Context opened.")
    }

    const handleEscalate = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ESCALATION_ROLES) !== true) {
            setLastActionSummary("Current role cannot escalate triage items.")
            return
        }

        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }
                    return {
                        ...item,
                        escalationLevel: item.escalationLevel === "none" ? "warn" : "critical",
                        status: item.status === "done" ? item.status : "blocked",
                    }
                }),
        )

        setLastActionSummary(`Escalated ${itemId} and notified owner channel.`)
        addAuditEntry(itemId, "escalate")
        showToastInfo("Escalation sent.")
    }

    const handleStartWork = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ASSIGNABLE_ROLES) !== true) {
            setLastActionSummary("Current role cannot update ownership status.")
            return
        }

        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }

                    return {
                        ...item,
                        owner: item.owner === "unassigned" ? "me" : item.owner,
                        status: "in_progress",
                    }
                }),
        )
        setLastActionSummary(`Moved ${itemId} to in_progress.`)
        addAuditEntry(itemId, "start_work")
    }

    const handleMarkDone = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ASSIGNABLE_ROLES) !== true) {
            setLastActionSummary("Current role cannot close triage items.")
            return
        }

        setItems(
            (previous): ReadonlyArray<ITriageItem> =>
                previous.map((item): ITriageItem => {
                    if (item.id !== itemId) {
                        return item
                    }
                    return {
                        ...item,
                        status: "done",
                    }
                }),
        )
        setLastActionSummary(`Marked ${itemId} as done.`)
        addAuditEntry(itemId, "mark_done")
    }

    const breachCount = filteredItems.filter((item): boolean => {
        return getSlaState(item, nowTimestamp) === "breach"
    }).length

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">My Work / Triage</h1>
            <p className="text-sm text-foreground/70">
                Unified hub for assigned CCRs, critical issues, inbox notifications, stuck jobs and
                pending approvals with ownership + escalation model.
            </p>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-foreground">
                        Scope and ownership controls
                    </p>
                    <Chip size="sm" variant="flat">
                        Keyboard: Alt+1 mine · Alt+2 team · Alt+3 repo
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Triage scope"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm md:max-w-[220px]"
                            value={scope}
                            onChange={(event): void => {
                                const nextScope = event.currentTarget.value
                                if (
                                    nextScope === "mine" ||
                                    nextScope === "team" ||
                                    nextScope === "repo"
                                ) {
                                    setScope(nextScope)
                                }
                            }}
                        >
                            <option value="mine">mine</option>
                            <option value="team">team</option>
                            <option value="repo">repo</option>
                        </select>

                        <select
                            aria-label="Reviewer role"
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm md:max-w-[220px]"
                            value={reviewerRole}
                            onChange={(event): void => {
                                const nextRole = event.currentTarget.value
                                if (
                                    nextRole === "viewer" ||
                                    nextRole === "developer" ||
                                    nextRole === "lead" ||
                                    nextRole === "admin"
                                ) {
                                    setReviewerRole(nextRole)
                                }
                            }}
                        >
                            <option value="viewer">viewer</option>
                            <option value="developer">developer</option>
                            <option value="lead">lead</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>

                    <Alert color="primary" title="Last triage action" variant="flat">
                        {lastActionSummary}
                    </Alert>
                    {breachCount > 0 ? (
                        <Alert color="danger" title="Escalation watchlist" variant="flat">
                            {`${breachCount} item(s) are in SLA breach and require immediate ownership action.`}
                        </Alert>
                    ) : null}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Unified triage list</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {filteredItems.length === 0 ? (
                        <SystemStateCard
                            ctaLabel="Switch scope"
                            description="No triage items match current filters. Change scope or run refresh."
                            title="No triage items in this view"
                            variant="empty"
                            onCtaPress={(): void => {
                                setScope("team")
                            }}
                        />
                    ) : (
                        <ul aria-label="My work triage list" className="space-y-2">
                            {filteredItems.map((item): ReactElement => {
                                const slaState = getSlaState(item, nowTimestamp)
                                return (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3"
                                        key={item.id}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {item.title}
                                            </p>
                                            <Chip size="sm" variant="flat">
                                                {item.category}
                                            </Chip>
                                            <Chip
                                                color={
                                                    item.severity === "critical"
                                                        ? "danger"
                                                        : "warning"
                                                }
                                                size="sm"
                                                variant="flat"
                                            >
                                                {item.severity}
                                            </Chip>
                                            <Chip size="sm" variant="flat">
                                                owner: {item.owner}
                                            </Chip>
                                            <Chip
                                                color={getStatusColor(item.status)}
                                                size="sm"
                                                variant="flat"
                                            >
                                                status: {item.status}
                                            </Chip>
                                            <Chip
                                                color={getEscalationColor(item.escalationLevel)}
                                                size="sm"
                                                title={`Escalation: ${item.escalationLevel}`}
                                                variant="flat"
                                            >
                                                escalation: {item.escalationLevel}
                                            </Chip>
                                            <Chip
                                                color={getSlaColor(slaState)}
                                                size="sm"
                                                title={`Due at ${formatTimestamp(item.dueAt)}`}
                                                variant="flat"
                                            >
                                                {getSlaLabel(slaState)}
                                            </Chip>
                                        </div>
                                        <p className="mt-1 text-xs text-foreground/70">
                                            {item.repository} · created{" "}
                                            {formatTimestamp(item.timestamp)} · due{" "}
                                            {formatTimestamp(item.dueAt)} · sla {item.slaMinutes}m
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleMarkRead(item.id)
                                                }}
                                            >
                                                Mark read
                                            </Button>
                                            <Button
                                                isDisabled={
                                                    isRoleAllowed(
                                                        reviewerRole,
                                                        ASSIGNABLE_ROLES,
                                                    ) !== true
                                                }
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleAssignToMe(item.id)
                                                }}
                                            >
                                                Assign to me
                                            </Button>
                                            <Button
                                                isDisabled={
                                                    isRoleAllowed(
                                                        reviewerRole,
                                                        ASSIGNABLE_ROLES,
                                                    ) !== true
                                                }
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleStartWork(item.id)
                                                }}
                                            >
                                                Start work
                                            </Button>
                                            <Button
                                                isDisabled={
                                                    isRoleAllowed(
                                                        reviewerRole,
                                                        ASSIGNABLE_ROLES,
                                                    ) !== true
                                                }
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleMarkDone(item.id)
                                                }}
                                            >
                                                Mark done
                                            </Button>
                                            <Button
                                                isDisabled={
                                                    isRoleAllowed(
                                                        reviewerRole,
                                                        ESCALATION_ROLES,
                                                    ) !== true
                                                }
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleEscalate(item.id)
                                                }}
                                            >
                                                Escalate
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleSnooze(item.id)
                                                }}
                                            >
                                                Snooze
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={(): void => {
                                                    handleOpenReview(item.id)
                                                }}
                                            >
                                                Open review
                                            </Button>
                                            <a
                                                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-foreground/80"
                                                href={item.deepLink}
                                            >
                                                Deep-link
                                            </a>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Ownership audit trail</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {auditTrail.length === 0 ? (
                        <p className="text-sm text-foreground/70">No ownership changes yet.</p>
                    ) : (
                        <ul aria-label="Ownership audit trail" className="space-y-1">
                            {auditTrail.map(
                                (entry): ReactElement => (
                                    <li
                                        className="text-xs text-foreground/80"
                                        key={entry.id}
                                    >{`${entry.itemId} ${formatAuditAction(entry.action)} at ${formatTimestamp(entry.timestamp)}`}</li>
                                ),
                            )}
                        </ul>
                    )}
                </CardBody>
            </Card>
        </section>
    )
}
