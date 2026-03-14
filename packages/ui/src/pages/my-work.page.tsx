import { type ReactElement, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { useDynamicTranslation } from "@/lib/i18n"
import {
    Alert,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
} from "@/components/ui"
import { SystemStateCard } from "@/components/infrastructure/system-state-card"
import { PageShell } from "@/components/layout/page-shell"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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

/**
 * Максимум записей в audit trail истории действий.
 */
const MAX_AUDIT_TRAIL_ENTRIES = 12

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

/**
 * Unified triage hub "My Work".
 *
 * @returns Единый экран triage с приоритизацией, ownership и escalation.
 */
export function MyWorkPage(): ReactElement {
    const { t } = useTranslation(["dashboard"])
    const { td } = useDynamicTranslation(["dashboard"])
    const [scope, setScope] = useState<TTriageScope>("mine")
    const [reviewerRole, setReviewerRole] = useState<TReviewerRole>("lead")
    const [items, setItems] = useState<ReadonlyArray<ITriageItem>>(TRIAGE_ITEMS_DEFAULT)
    const [lastActionSummary, setLastActionSummary] = useState(
        t("dashboard:myWork.noTriageActions"),
    )
    const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now())
    const [auditTrail, setAuditTrail] = useState<ReadonlyArray<IAuditEntry>>([])

    const slaLabelMap = useMemo(
        (): Record<TSlaState, string> => ({
            breach: t("dashboard:myWork.slaBreachLabel"),
            healthy: t("dashboard:myWork.slaHealthyLabel"),
            warning: t("dashboard:myWork.slaWarningLabel"),
        }),
        [t],
    )

    const auditActionMap = useMemo(
        (): Record<TAuditAction, string> => ({
            assign_to_me: t("dashboard:myWork.assignToMe"),
            escalate: t("dashboard:myWork.escalate"),
            mark_done: t("dashboard:myWork.markDone"),
            mark_read: t("dashboard:myWork.markRead"),
            open_context: t("dashboard:myWork.openReview"),
            snooze: t("dashboard:myWork.snooze"),
            start_work: t("dashboard:myWork.startWork"),
        }),
        [t],
    )

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

            return [nextEntry, ...previous].slice(0, MAX_AUDIT_TRAIL_ENTRIES)
        })
    }

    const handleAssignToMe = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ASSIGNABLE_ROLES) !== true) {
            setLastActionSummary(t("dashboard:myWork.cannotAssign"))
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
        showToastInfo(t("dashboard:myWork.itemSnoozed"))
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
        showToastSuccess(t("dashboard:myWork.contextOpened"))
    }

    const handleEscalate = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ESCALATION_ROLES) !== true) {
            setLastActionSummary(t("dashboard:myWork.cannotEscalate"))
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
        showToastInfo(t("dashboard:myWork.escalationSent"))
    }

    const handleStartWork = (itemId: string): void => {
        if (isRoleAllowed(reviewerRole, ASSIGNABLE_ROLES) !== true) {
            setLastActionSummary(t("dashboard:myWork.cannotUpdateStatus"))
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
            setLastActionSummary(t("dashboard:myWork.cannotClose"))
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
        <PageShell
            subtitle={t("dashboard:myWork.pageSubtitle")}
            title={t("dashboard:myWork.pageTitle")}
        >
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("dashboard:myWork.scopeAndOwnership")}
                    </p>
                    <Chip size="sm" variant="flat">
                        {t("dashboard:myWork.keyboardHint")}
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label={t("dashboard:myWork.triageScopeAriaLabel")}
                            className="w-full rounded-lg border border-border/50 bg-surface/80 px-3 py-2 text-sm text-foreground outline-none backdrop-blur-sm transition-colors duration-150 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 md:max-w-[220px]"
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
                            aria-label={t("dashboard:myWork.reviewerRoleAriaLabel")}
                            className="w-full rounded-lg border border-border/50 bg-surface/80 px-3 py-2 text-sm text-foreground outline-none backdrop-blur-sm transition-colors duration-150 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 md:max-w-[220px]"
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

                    <Alert
                        color="primary"
                        title={t("dashboard:myWork.lastTriageAction")}
                        variant="flat"
                    >
                        {lastActionSummary}
                    </Alert>
                    {breachCount > 0 ? (
                        <Alert
                            color="danger"
                            title={t("dashboard:myWork.escalationWatchlist")}
                            variant="flat"
                        >
                            {td("dashboard:myWork.slaBreachAlert", { count: String(breachCount) })}
                        </Alert>
                    ) : null}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("dashboard:myWork.unifiedTriageList")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {filteredItems.length === 0 ? (
                        <SystemStateCard
                            ctaLabel={t("dashboard:myWork.switchScope")}
                            description={t("dashboard:myWork.noTriageItemsDescription")}
                            title={t("dashboard:myWork.noTriageItemsTitle")}
                            variant="empty"
                            onCtaPress={(): void => {
                                setScope("team")
                            }}
                        />
                    ) : (
                        <ul
                            aria-label={t("dashboard:myWork.triageListAriaLabel")}
                            className="space-y-2"
                        >
                            {filteredItems.map((item): ReactElement => {
                                const slaState = getSlaState(item, nowTimestamp)
                                return (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3"
                                        key={item.id}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className={TYPOGRAPHY.cardTitle}>{item.title}</p>
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
                                                {t("dashboard:myWork.ownerLabel")} {item.owner}
                                            </Chip>
                                            <Chip
                                                color={getStatusColor(item.status)}
                                                size="sm"
                                                variant="flat"
                                            >
                                                {t("dashboard:myWork.statusLabel")} {item.status}
                                            </Chip>
                                            <Chip
                                                color={getEscalationColor(item.escalationLevel)}
                                                size="sm"
                                                title={`${t("dashboard:myWork.escalationTitle")} ${item.escalationLevel}`}
                                                variant="flat"
                                            >
                                                {t("dashboard:myWork.escalationLabel")}{" "}
                                                {item.escalationLevel}
                                            </Chip>
                                            <Chip
                                                color={getSlaColor(slaState)}
                                                size="sm"
                                                title={`${t("dashboard:myWork.dueAtTitle")} ${formatTimestamp(item.dueAt)}`}
                                                variant="flat"
                                            >
                                                {slaLabelMap[slaState]}
                                            </Chip>
                                        </div>
                                        <p className="mt-1 text-xs text-text-secondary">
                                            {item.repository} · {t("dashboard:myWork.createdLabel")}{" "}
                                            {formatTimestamp(item.timestamp)} ·{" "}
                                            {t("dashboard:myWork.dueLabel")}{" "}
                                            {formatTimestamp(item.dueAt)} ·{" "}
                                            {t("dashboard:myWork.slaLabel")} {item.slaMinutes}m
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {/* Primary actions — always visible */}
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
                                                {t("dashboard:myWork.startWork")}
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
                                                {t("dashboard:myWork.markDone")}
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
                                                {t("dashboard:myWork.escalate")}
                                            </Button>

                                            {/* Secondary actions — overflow dropdown */}
                                            <Dropdown>
                                                <DropdownTrigger>
                                                    <Button size="sm" variant="flat">
                                                        {t("dashboard:myWork.moreActions")}
                                                    </Button>
                                                </DropdownTrigger>
                                                <DropdownMenu
                                                    aria-label={t(
                                                        "dashboard:myWork.secondaryActionsAriaLabel",
                                                    )}
                                                >
                                                    <DropdownItem
                                                        key="mark_read"
                                                        onPress={(): void => {
                                                            handleMarkRead(item.id)
                                                        }}
                                                    >
                                                        {t("dashboard:myWork.markRead")}
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        key="assign_to_me"
                                                        isDisabled={
                                                            isRoleAllowed(
                                                                reviewerRole,
                                                                ASSIGNABLE_ROLES,
                                                            ) !== true
                                                        }
                                                        onPress={(): void => {
                                                            handleAssignToMe(item.id)
                                                        }}
                                                    >
                                                        {t("dashboard:myWork.assignToMe")}
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        key="snooze"
                                                        onPress={(): void => {
                                                            handleSnooze(item.id)
                                                        }}
                                                    >
                                                        {t("dashboard:myWork.snooze")}
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        key="open_review"
                                                        onPress={(): void => {
                                                            handleOpenReview(item.id)
                                                        }}
                                                    >
                                                        {t("dashboard:myWork.openReview")}
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        key="deep_link"
                                                        onPress={(): void => {
                                                            if (typeof window !== "undefined") {
                                                                window.location.assign(
                                                                    item.deepLink,
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        {t("dashboard:myWork.deepLink")}
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
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
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("dashboard:myWork.ownershipAuditTrail")}
                    </p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {auditTrail.length === 0 ? (
                        <p className={TYPOGRAPHY.bodyMuted}>
                            {t("dashboard:myWork.noOwnershipChanges")}
                        </p>
                    ) : (
                        <ul
                            aria-label={t("dashboard:myWork.auditTrailAriaLabel")}
                            className="space-y-1"
                        >
                            {auditTrail.map(
                                (entry): ReactElement => (
                                    <li
                                        className="text-xs text-text-tertiary"
                                        key={entry.id}
                                    >{`${entry.itemId} ${auditActionMap[entry.action]} at ${formatTimestamp(entry.timestamp)}`}</li>
                                ),
                            )}
                        </ul>
                    )}
                </CardBody>
            </Card>
        </PageShell>
    )
}
