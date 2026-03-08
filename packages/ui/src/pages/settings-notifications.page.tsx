import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Alert, Button, Card, CardBody, CardHeader, Chip, Input, Switch } from "@/components/ui"
import { useAuthAccess } from "@/lib/auth/auth-access"
import { resolveDeepLinkGuard } from "@/lib/navigation/deep-link-guard"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { useUiRole } from "@/lib/permissions/ui-policy"
import type { TTenantId } from "@/lib/access/access-types"

type TNotificationEventType = "drift.alert" | "prediction.alert" | "review.completed"
type TNotificationChannelId = "discord" | "inApp" | "slack" | "teams"

interface INotificationItem {
    /** Уникальный id события. */
    readonly id: string
    /** Тип уведомления. */
    readonly type: TNotificationEventType
    /** Заголовок уведомления. */
    readonly title: string
    /** Краткое описание события. */
    readonly message: string
    /** Время события. */
    readonly occurredAt: string
    /** Прочитано ли уведомление. */
    readonly isRead: boolean
    /** Deep-link для перехода в контекст. */
    readonly targetHref: string
}

interface INotificationChannelPreference {
    /** Включен ли канал. */
    readonly enabled: boolean
    /** Канал назначения (URL/channel name). */
    readonly target: string
}

interface IInAppMuteRules {
    /** Приглушать non-critical ночью. */
    readonly muteNonCriticalAtNight: boolean
    /** Приглушать prediction alerts для архивных repo. */
    readonly mutePredictionsForArchivedRepos: boolean
    /** Начало quiet hours. */
    readonly quietHoursStart: string
    /** Окончание quiet hours. */
    readonly quietHoursEnd: string
}

interface INotificationBulkAuditEntry {
    /** Идентификатор bulk события. */
    readonly id: string
    /** Идентификаторы затронутых уведомлений. */
    readonly notificationIds: ReadonlyArray<string>
    /** Текущий lifecycle bulk операции. */
    readonly status: "pending_sync" | "reverted" | "synced"
    /** Краткое описание действия. */
    readonly summary: string
    /** Время действия. */
    readonly occurredAt: string
}

interface INotificationBulkPendingState {
    /** Идентификатор pending действия. */
    readonly actionId: string
    /** Снимок для rollback. */
    readonly previousNotifications: ReadonlyArray<INotificationItem>
    /** Затронутые уведомления. */
    readonly selectedIds: ReadonlyArray<string>
}

const INITIAL_NOTIFICATIONS: ReadonlyArray<INotificationItem> = [
    {
        id: "NTF-1001",
        isRead: false,
        message: "CCR #412 finished with 3 high-priority suggestions.",
        occurredAt: "2026-03-04T11:10:00Z",
        targetHref: "/reviews/412",
        title: "Review completed",
        type: "review.completed",
    },
    {
        id: "NTF-1002",
        isRead: false,
        message: "Service layer imports crossed domain boundary in api-gateway.",
        occurredAt: "2026-03-04T09:36:00Z",
        targetHref: "/dashboard/code-city",
        title: "Architecture drift alert",
        type: "drift.alert",
    },
    {
        id: "NTF-1003",
        isRead: true,
        message: "Predicted hotspot confidence increased for src/scan-worker.ts.",
        occurredAt: "2026-03-03T18:45:00Z",
        targetHref: "/reviews",
        title: "Prediction alert",
        type: "prediction.alert",
    },
    {
        id: "NTF-1004",
        isRead: false,
        message: "CCR #409 completed and ready for final approval.",
        occurredAt: "2026-03-03T16:12:00Z",
        targetHref: "/reviews/409",
        title: "Review completed",
        type: "review.completed",
    },
]

const CHANNEL_LABELS: Readonly<Record<TNotificationChannelId, string>> = {
    discord: "Discord",
    inApp: "In-app",
    slack: "Slack",
    teams: "Teams",
}

const EVENT_TYPE_LABELS: Readonly<Record<TNotificationEventType, string>> = {
    "drift.alert": "Drift alert",
    "prediction.alert": "Prediction alert",
    "review.completed": "Review completed",
}

function isTenantId(value: string | undefined): value is TTenantId {
    return value === "platform-team" || value === "frontend-team" || value === "runtime-team"
}

function readStoredActiveTenantId(): TTenantId | undefined {
    if (typeof window === "undefined") {
        return undefined
    }

    try {
        const storedValue = window.localStorage.getItem("codenautic:tenant:active") ?? undefined
        return isTenantId(storedValue) ? storedValue : undefined
    } catch {
        return undefined
    }
}

function writeStoredActiveTenantId(tenantId: TTenantId): void {
    if (typeof window === "undefined") {
        return
    }

    try {
        window.localStorage.setItem("codenautic:tenant:active", tenantId)
    } catch {
        return
    }
}

function dedupeNotificationsById(
    notifications: ReadonlyArray<INotificationItem>,
): ReadonlyArray<INotificationItem> {
    const seen = new Set<string>()
    const deduped: Array<INotificationItem> = []

    notifications.forEach((notification): void => {
        if (seen.has(notification.id)) {
            return
        }
        seen.add(notification.id)
        deduped.push(notification)
    })

    return deduped
}

function formatNotificationTime(rawValue: string): string {
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

/**
 * Страница Notification Center.
 *
 * @returns Inbox лента и настройки доставки уведомлений.
 */
export function SettingsNotificationsPage(): ReactElement {
    const activeRole = useUiRole()
    const authAccess = useAuthAccess()
    const navigate = useNavigate()
    const [eventTypeFilter, setEventTypeFilter] = useState<"all" | TNotificationEventType>("all")
    const [notifications, setNotifications] = useState<ReadonlyArray<INotificationItem>>(() =>
        dedupeNotificationsById(INITIAL_NOTIFICATIONS),
    )
    const [channelPreferences, setChannelPreferences] = useState<
        Readonly<Record<TNotificationChannelId, INotificationChannelPreference>>
    >({
        discord: {
            enabled: false,
            target: "",
        },
        inApp: {
            enabled: true,
            target: "inbox",
        },
        slack: {
            enabled: true,
            target: "#code-review",
        },
        teams: {
            enabled: true,
            target: "CodeNautic Review Squad",
        },
    })
    const [muteRules, setMuteRules] = useState<IInAppMuteRules>({
        muteNonCriticalAtNight: true,
        mutePredictionsForArchivedRepos: false,
        quietHoursEnd: "08:00",
        quietHoursStart: "22:00",
    })
    const [deepLinkGuardNotice, setDeepLinkGuardNotice] = useState<string | undefined>(undefined)
    const [selectedNotificationIds, setSelectedNotificationIds] = useState<ReadonlyArray<string>>(
        [],
    )
    const [bulkPendingState, setBulkPendingState] = useState<
        INotificationBulkPendingState | undefined
    >(undefined)
    const [bulkAudit, setBulkAudit] = useState<ReadonlyArray<INotificationBulkAuditEntry>>([])
    const bulkPendingTimerRef = useRef<number | undefined>(undefined)

    const filteredNotifications = useMemo((): ReadonlyArray<INotificationItem> => {
        const byType = notifications.filter((notification): boolean => {
            if (eventTypeFilter === "all") {
                return true
            }
            return notification.type === eventTypeFilter
        })

        return byType.sort((left, right): number => {
            return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        })
    }, [eventTypeFilter, notifications])

    const unreadCount = useMemo((): number => {
        return notifications.filter((notification): boolean => notification.isRead !== true).length
    }, [notifications])

    const activeChannelCount = useMemo((): number => {
        return Object.values(channelPreferences).reduce((count, channel): number => {
            return channel.enabled ? count + 1 : count
        }, 0)
    }, [channelPreferences])

    const enabledMuteRulesCount = useMemo((): number => {
        return [muteRules.muteNonCriticalAtNight, muteRules.mutePredictionsForArchivedRepos].filter(
            (value): boolean => value === true,
        ).length
    }, [muteRules])

    const handleToggleRead = (id: string): void => {
        setNotifications(
            (previous): ReadonlyArray<INotificationItem> =>
                previous.map((notification): INotificationItem => {
                    if (notification.id !== id) {
                        return notification
                    }
                    return {
                        ...notification,
                        isRead: notification.isRead !== true,
                    }
                }),
        )
    }

    const handleMarkAllAsRead = (): void => {
        setNotifications(
            (previous): ReadonlyArray<INotificationItem> =>
                previous.map(
                    (notification): INotificationItem => ({
                        ...notification,
                        isRead: true,
                    }),
                ),
        )
        showToastSuccess("All notifications marked as read.")
    }

    const handleSaveDeliveryPreferences = (): void => {
        showToastInfo("Delivery preferences saved.")
    }

    const handleOpenDeepLink = (targetHref: string): void => {
        const tenantId = readStoredActiveTenantId() ?? authAccess?.tenantId ?? "platform-team"
        const deepLinkResult = resolveDeepLinkGuard(targetHref, {
            isAuthenticated: true,
            role: activeRole,
            tenantId,
        })

        if (deepLinkResult.decision === "deny") {
            setDeepLinkGuardNotice(
                `Deep-link blocked: ${deepLinkResult.reason}. Fallback route was suggested.`,
            )
            showToastError("Deep-link blocked by security guard.")
            return
        }

        if (deepLinkResult.decision === "switch_org") {
            writeStoredActiveTenantId(deepLinkResult.switchTenantId ?? tenantId)
            setDeepLinkGuardNotice(
                `Deep-link required workspace switch to ${deepLinkResult.switchTenantId}.`,
            )
            showToastInfo("Workspace switched before opening deep-link.")
        } else {
            setDeepLinkGuardNotice(
                `Deep-link allowed and sanitized to ${deepLinkResult.sanitizedPath}.`,
            )
        }

        void navigate({
            to: deepLinkResult.sanitizedPath,
        })
    }

    const clearBulkPendingTimer = (): void => {
        if (bulkPendingTimerRef.current === undefined) {
            return
        }

        window.clearTimeout(bulkPendingTimerRef.current)
        bulkPendingTimerRef.current = undefined
    }

    useEffect((): (() => void) => {
        return (): void => {
            clearBulkPendingTimer()
        }
    }, [])

    const appendBulkAudit = (
        actionId: string,
        status: "pending_sync" | "reverted" | "synced",
        selectedIds: ReadonlyArray<string>,
        summary: string,
    ): void => {
        setBulkAudit(
            (previous): ReadonlyArray<INotificationBulkAuditEntry> => [
                {
                    id: actionId,
                    notificationIds: selectedIds,
                    occurredAt: new Date().toISOString(),
                    status,
                    summary,
                },
                ...previous.filter((entry): boolean => entry.id !== actionId),
            ],
        )
    }

    const handleToggleNotificationSelection = (notificationId: string): void => {
        setSelectedNotificationIds((previous): ReadonlyArray<string> => {
            if (previous.includes(notificationId)) {
                return previous.filter((id): boolean => id !== notificationId)
            }

            return [...previous, notificationId]
        })
    }

    const handleBulkMarkRead = (): void => {
        if (selectedNotificationIds.length === 0) {
            return
        }

        clearBulkPendingTimer()

        const actionId = `bulk-${Date.now().toString(36)}`
        const selectedIds = selectedNotificationIds
        const previousSnapshot = notifications

        setNotifications(
            (previous): ReadonlyArray<INotificationItem> =>
                previous.map((notification): INotificationItem => {
                    if (selectedIds.includes(notification.id) !== true) {
                        return notification
                    }

                    return {
                        ...notification,
                        isRead: true,
                    }
                }),
        )
        setSelectedNotificationIds([])
        setBulkPendingState({
            actionId,
            previousNotifications: previousSnapshot,
            selectedIds,
        })
        appendBulkAudit(
            actionId,
            "pending_sync",
            selectedIds,
            "Bulk mark as read applied optimistically.",
        )
        showToastInfo("Bulk action queued. Undo is available for 5 seconds.")

        bulkPendingTimerRef.current = window.setTimeout((): void => {
            setBulkPendingState((pending): INotificationBulkPendingState | undefined => {
                if (pending?.actionId !== actionId) {
                    return pending
                }

                appendBulkAudit(
                    actionId,
                    "synced",
                    selectedIds,
                    "Bulk action synced with server reconciliation.",
                )
                showToastSuccess("Bulk action synchronized.")
                return undefined
            })
            bulkPendingTimerRef.current = undefined
        }, 5000)
    }

    const handleUndoBulkAction = (): void => {
        const pending = bulkPendingState
        if (pending === undefined) {
            return
        }

        clearBulkPendingTimer()
        setNotifications(pending.previousNotifications)
        appendBulkAudit(
            pending.actionId,
            "reverted",
            pending.selectedIds,
            "Bulk action reverted through undo timer.",
        )
        setBulkPendingState(undefined)
        showToastInfo("Bulk action reverted.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">Notification center</h1>
            <p className="text-sm text-text-secondary">
                Unified inbox for review, drift and prediction events with channel-level delivery
                controls.
            </p>

            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-foreground">Inbox</p>
                    <Button
                        isDisabled={unreadCount === 0}
                        size="sm"
                        variant="flat"
                        onPress={handleMarkAllAsRead}
                    >
                        Mark all as read
                    </Button>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Chip size="sm" variant="flat">
                            Total: {notifications.length}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            Unread: {unreadCount}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            Active channels: {activeChannelCount}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            Selected: {selectedNotificationIds.length}
                        </Chip>
                    </div>
                    {deepLinkGuardNotice === undefined ? null : (
                        <Alert color="primary" title="Deep-link guard" variant="flat">
                            {deepLinkGuardNotice}
                        </Alert>
                    )}
                    {selectedNotificationIds.length === 0 ? null : (
                        <Alert color="primary" title="Bulk actions" variant="flat">
                            {selectedNotificationIds.length} notifications selected.
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Button size="sm" variant="flat" onPress={handleBulkMarkRead}>
                                    Mark selected as read
                                </Button>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={(): void => {
                                        setSelectedNotificationIds([])
                                    }}
                                >
                                    Clear selection
                                </Button>
                            </div>
                        </Alert>
                    )}
                    {bulkPendingState === undefined ? null : (
                        <Alert color="warning" title="Bulk action pending sync" variant="flat">
                            Undo is available while reconciliation is pending.
                            <div className="mt-2">
                                <Button size="sm" variant="flat" onPress={handleUndoBulkAction}>
                                    Undo bulk action
                                </Button>
                            </div>
                        </Alert>
                    )}
                    <div className="flex flex-col gap-1 md:max-w-[260px]">
                        <label
                            className="text-sm text-text-tertiary"
                            htmlFor="notifications-event-type-filter"
                        >
                            Filter event type
                        </label>
                        <select
                            aria-label="Filter event type"
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            id="notifications-event-type-filter"
                            value={eventTypeFilter}
                            onChange={(event): void => {
                                const value = event.currentTarget.value
                                if (
                                    value === "all" ||
                                    value === "review.completed" ||
                                    value === "drift.alert" ||
                                    value === "prediction.alert"
                                ) {
                                    setEventTypeFilter(value)
                                }
                            }}
                        >
                            <option value="all">All events</option>
                            <option value="review.completed">Review completed</option>
                            <option value="drift.alert">Drift alert</option>
                            <option value="prediction.alert">Prediction alert</option>
                        </select>
                    </div>

                    <ul aria-label="Notification inbox list" className="space-y-2" role="list">
                        {filteredNotifications.map(
                            (notification): ReactElement => (
                                <li
                                    key={notification.id}
                                    className="rounded-lg border border-border bg-surface p-3"
                                    role="listitem"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            aria-label={`Select ${notification.id}`}
                                            checked={selectedNotificationIds.includes(
                                                notification.id,
                                            )}
                                            className="h-4 w-4 accent-primary"
                                            type="checkbox"
                                            onChange={(): void => {
                                                handleToggleNotificationSelection(notification.id)
                                            }}
                                        />
                                        <p className="text-sm font-semibold text-foreground">
                                            {notification.title}
                                        </p>
                                        <Chip
                                            size="sm"
                                            variant={notification.isRead ? "flat" : "solid"}
                                        >
                                            {notification.isRead ? "Read" : "Unread"}
                                        </Chip>
                                        <Chip size="sm" variant="flat">
                                            {EVENT_TYPE_LABELS[notification.type]}
                                        </Chip>
                                        <p className="text-xs text-text-secondary">
                                            {formatNotificationTime(notification.occurredAt)}
                                        </p>
                                    </div>
                                    <p className="mt-1 text-sm text-text-tertiary">
                                        {notification.message}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            onPress={(): void => {
                                                handleToggleRead(notification.id)
                                            }}
                                        >
                                            {notification.isRead
                                                ? `Mark as unread ${notification.id}`
                                                : `Mark as read ${notification.id}`}
                                        </Button>
                                        <Button
                                            aria-label={`Open ${notification.id} context`}
                                            size="sm"
                                            variant="flat"
                                            onPress={(): void => {
                                                handleOpenDeepLink(notification.targetHref)
                                            }}
                                        >
                                            Open context
                                        </Button>
                                    </div>
                                </li>
                            ),
                        )}
                    </ul>
                    {filteredNotifications.length === 0 ? (
                        <Alert color="warning" title="No notifications found" variant="flat">
                            Adjust event type filter to view available notifications.
                        </Alert>
                    ) : null}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Delivery preferences</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    {(["slack", "discord", "teams", "inApp"] as const).map(
                        (channelId): ReactElement => {
                            const channel = channelPreferences[channelId]
                            return (
                                <div
                                    key={channelId}
                                    className="grid gap-2 rounded-lg border border-border bg-surface p-3 md:grid-cols-[220px_1fr]"
                                >
                                    <Switch
                                        aria-label={`Enable ${CHANNEL_LABELS[channelId]} notifications`}
                                        isSelected={channel.enabled}
                                        onValueChange={(isSelected): void => {
                                            setChannelPreferences((previous) => ({
                                                ...previous,
                                                [channelId]: {
                                                    ...previous[channelId],
                                                    enabled: isSelected,
                                                },
                                            }))
                                        }}
                                    >
                                        {`Enable ${CHANNEL_LABELS[channelId]} notifications`}
                                    </Switch>
                                    <Input
                                        isDisabled={channel.enabled !== true}
                                        label={`${CHANNEL_LABELS[channelId]} target`}
                                        placeholder={
                                            channelId === "slack"
                                                ? "#code-review"
                                                : channelId === "discord"
                                                  ? "review-alerts"
                                                  : channelId === "teams"
                                                    ? "CodeNautic Team"
                                                    : "inbox"
                                        }
                                        value={channel.target}
                                        onValueChange={(nextValue): void => {
                                            setChannelPreferences((previous) => ({
                                                ...previous,
                                                [channelId]: {
                                                    ...previous[channelId],
                                                    target: nextValue,
                                                },
                                            }))
                                        }}
                                    />
                                </div>
                            )
                        },
                    )}
                    <div className="flex justify-end">
                        <Button variant="flat" onPress={handleSaveDeliveryPreferences}>
                            Save delivery preferences
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">In-app mute rules</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Chip size="sm" variant="flat">
                            Enabled rules: {enabledMuteRulesCount}
                        </Chip>
                        <Chip size="sm" variant="flat">
                            Quiet hours: {muteRules.quietHoursStart} - {muteRules.quietHoursEnd}
                        </Chip>
                    </div>
                    <Switch
                        aria-label="Mute non-critical alerts in-app"
                        isSelected={muteRules.muteNonCriticalAtNight}
                        onValueChange={(value): void => {
                            setMuteRules(
                                (previous): IInAppMuteRules => ({
                                    ...previous,
                                    muteNonCriticalAtNight: value,
                                }),
                            )
                        }}
                    >
                        Mute non-critical alerts in-app
                    </Switch>
                    <Switch
                        aria-label="Mute prediction alerts for archived repositories"
                        isSelected={muteRules.mutePredictionsForArchivedRepos}
                        onValueChange={(value): void => {
                            setMuteRules(
                                (previous): IInAppMuteRules => ({
                                    ...previous,
                                    mutePredictionsForArchivedRepos: value,
                                }),
                            )
                        }}
                    >
                        Mute prediction alerts for archived repositories
                    </Switch>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            label="Quiet hours start"
                            type="time"
                            value={muteRules.quietHoursStart}
                            onValueChange={(value): void => {
                                setMuteRules(
                                    (previous): IInAppMuteRules => ({
                                        ...previous,
                                        quietHoursStart: value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            label="Quiet hours end"
                            type="time"
                            value={muteRules.quietHoursEnd}
                            onValueChange={(value): void => {
                                setMuteRules(
                                    (previous): IInAppMuteRules => ({
                                        ...previous,
                                        quietHoursEnd: value,
                                    }),
                                )
                            }}
                        />
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-foreground">Bulk action audit</p>
                </CardHeader>
                <CardBody className="space-y-2">
                    {bulkAudit.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                            No bulk operations executed yet.
                        </p>
                    ) : (
                        <ul aria-label="Bulk action audit list" className="space-y-2">
                            {bulkAudit.map(
                                (entry): ReactElement => (
                                    <li
                                        className="rounded-lg border border-border bg-surface p-3 text-xs"
                                        key={entry.id}
                                    >
                                        <p className="font-semibold text-foreground">
                                            {entry.status}
                                        </p>
                                        <p className="text-text-tertiary">{entry.summary}</p>
                                        <p className="text-text-secondary">
                                            Notifications: {entry.notificationIds.join(", ")}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </CardBody>
            </Card>
        </section>
    )
}
