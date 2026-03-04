import { type ReactElement, useEffect, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip } from "@/components/ui"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TTriageCategory =
    | "assigned_ccr"
    | "critical_issue"
    | "inbox_notification"
    | "pending_approval"
    | "stuck_job"
type TTriageSeverity = "critical" | "high" | "medium"
type TTriageScope = "mine" | "repo" | "team"
type TTriageStatus = "active" | "done" | "snoozed"

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
    readonly owner: "me" | "team" | "unassigned"
    /** Deep-link в целевой контекст. */
    readonly deepLink: string
    /** Временная метка. */
    readonly timestamp: string
    /** Read status. */
    readonly isRead: boolean
    /** Lifecycle status. */
    readonly status: TTriageStatus
}

const TRIAGE_ITEMS_DEFAULT: ReadonlyArray<ITriageItem> = [
    {
        category: "assigned_ccr",
        deepLink: "/reviews/412",
        id: "MW-1001",
        isRead: false,
        owner: "me",
        repository: "repo-ui",
        severity: "high",
        status: "active",
        timestamp: "2026-03-04T10:10:00Z",
        title: "CCR #412 needs final response",
    },
    {
        category: "critical_issue",
        deepLink: "/issues",
        id: "MW-1002",
        isRead: false,
        owner: "team",
        repository: "repo-core",
        severity: "critical",
        status: "active",
        timestamp: "2026-03-04T09:42:00Z",
        title: "Tenant boundary regression in auth middleware",
    },
    {
        category: "inbox_notification",
        deepLink: "/settings-notifications",
        id: "MW-1003",
        isRead: true,
        owner: "me",
        repository: "repo-ui",
        severity: "medium",
        status: "active",
        timestamp: "2026-03-04T08:30:00Z",
        title: "Notification digest pending confirmation",
    },
    {
        category: "stuck_job",
        deepLink: "/settings-jobs",
        id: "MW-1004",
        isRead: false,
        owner: "unassigned",
        repository: "repo-api",
        severity: "high",
        status: "active",
        timestamp: "2026-03-04T08:15:00Z",
        title: "Scan worker stuck on queue heartbeat",
    },
    {
        category: "pending_approval",
        deepLink: "/reviews/409",
        id: "MW-1005",
        isRead: false,
        owner: "team",
        repository: "repo-api",
        severity: "high",
        status: "active",
        timestamp: "2026-03-04T07:58:00Z",
        title: "Approval pending for CCR #409",
    },
]

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

/**
 * Unified triage hub "My Work".
 *
 * @returns Единый экран triage с приоритизацией и inline actions.
 */
export function MyWorkPage(): ReactElement {
    const [scope, setScope] = useState<TTriageScope>("mine")
    const [items, setItems] = useState<ReadonlyArray<ITriageItem>>(TRIAGE_ITEMS_DEFAULT)
    const [lastActionSummary, setLastActionSummary] = useState("No triage actions yet.")

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
            return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
        })
    }, [items, scope])

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

    const handleAssignToMe = (itemId: string): void => {
        setItems((previous): ReadonlyArray<ITriageItem> =>
            previous.map((item): ITriageItem => {
                if (item.id !== itemId) {
                    return item
                }
                return {
                    ...item,
                    owner: "me",
                }
            }),
        )
        setLastActionSummary(`Assigned ${itemId} to current reviewer.`)
    }

    const handleMarkRead = (itemId: string): void => {
        setItems((previous): ReadonlyArray<ITriageItem> =>
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
    }

    const handleSnooze = (itemId: string): void => {
        setItems((previous): ReadonlyArray<ITriageItem> =>
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
        showToastInfo("Item snoozed.")
    }

    const handleOpenReview = (itemId: string): void => {
        const item = items.find((candidate): boolean => candidate.id === itemId)
        if (item === undefined) {
            return
        }

        setLastActionSummary(`Opened ${item.id} context: ${item.deepLink}`)
        showToastSuccess("Context opened.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">My Work / Triage</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Unified hub for assigned CCRs, critical issues, inbox notifications, stuck jobs and
                pending approvals.
            </p>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--foreground)]">Scope filters</p>
                    <Chip size="sm" variant="flat">
                        Keyboard: Alt+1 mine · Alt+2 team · Alt+3 repo
                    </Chip>
                </CardHeader>
                <CardBody className="space-y-2">
                    <select
                        aria-label="Triage scope"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm md:max-w-[260px]"
                        value={scope}
                        onChange={(event): void => {
                            const nextScope = event.currentTarget.value
                            if (nextScope === "mine" || nextScope === "team" || nextScope === "repo") {
                                setScope(nextScope)
                            }
                        }}
                    >
                        <option value="mine">mine</option>
                        <option value="team">team</option>
                        <option value="repo">repo</option>
                    </select>
                    <Alert color="primary" title="Last triage action" variant="flat">
                        {lastActionSummary}
                    </Alert>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">Unified triage list</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    <ul aria-label="My work triage list" className="space-y-2">
                        {filteredItems.map((item): ReactElement => (
                            <li
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                                key={item.id}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-[var(--foreground)]">
                                        {item.title}
                                    </p>
                                    <Chip size="sm" variant="flat">
                                        {item.category}
                                    </Chip>
                                    <Chip
                                        color={item.severity === "critical" ? "danger" : "warning"}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {item.severity}
                                    </Chip>
                                    <Chip size="sm" variant="flat">
                                        {item.owner}
                                    </Chip>
                                    <Chip size="sm" variant="flat">
                                        {item.status}
                                    </Chip>
                                </div>
                                <p className="mt-1 text-xs text-[var(--foreground)]/70">
                                    {item.repository} · {formatTimestamp(item.timestamp)}
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
                                        size="sm"
                                        variant="flat"
                                        onPress={(): void => {
                                            handleAssignToMe(item.id)
                                        }}
                                    >
                                        Assign to me
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
                                        className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--foreground)]/80"
                                        href={item.deepLink}
                                    >
                                        Deep-link
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </section>
    )
}
