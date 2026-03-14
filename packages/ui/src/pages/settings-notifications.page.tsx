import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input, Switch } from "@heroui/react"
import { getWindowLocalStorage, safeStorageGet, safeStorageSet } from "@/lib/utils/safe-storage"
import { useAuthAccess } from "@/lib/auth/auth-access"
import { resolveDeepLinkGuard } from "@/lib/navigation/deep-link-guard"
import { FormLayout } from "@/components/forms/form-layout"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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
    const storedValue = safeStorageGet(getWindowLocalStorage(), "codenautic:tenant:active")
    return isTenantId(storedValue) ? storedValue : undefined
}

function writeStoredActiveTenantId(tenantId: TTenantId): void {
    safeStorageSet(getWindowLocalStorage(), "codenautic:tenant:active", tenantId)
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
    const { t } = useTranslation(["settings"])
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
        showToastSuccess(t("settings:notifications.toast.allMarkedAsRead"))
    }

    const handleSaveDeliveryPreferences = (): void => {
        showToastInfo(t("settings:notifications.toast.deliveryPreferencesSaved"))
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
                t("settings:notifications.deepLinkBlocked", { reason: deepLinkResult.reason }),
            )
            showToastError(t("settings:notifications.toast.deepLinkBlocked"))
            return
        }

        if (deepLinkResult.decision === "switch_org") {
            writeStoredActiveTenantId(deepLinkResult.switchTenantId ?? tenantId)
            setDeepLinkGuardNotice(
                t("settings:notifications.deepLinkWorkspaceSwitch", {
                    tenantId: deepLinkResult.switchTenantId,
                }),
            )
            showToastInfo(t("settings:notifications.toast.workspaceSwitched"))
        } else {
            setDeepLinkGuardNotice(
                t("settings:notifications.deepLinkAllowed", { path: deepLinkResult.sanitizedPath }),
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
            t("settings:notifications.bulkMarkAsReadApplied"),
        )
        showToastInfo(t("settings:notifications.toast.bulkActionQueued"))

        bulkPendingTimerRef.current = window.setTimeout((): void => {
            setBulkPendingState((pending): INotificationBulkPendingState | undefined => {
                if (pending?.actionId !== actionId) {
                    return pending
                }

                appendBulkAudit(
                    actionId,
                    "synced",
                    selectedIds,
                    t("settings:notifications.bulkActionSyncedSummary"),
                )
                showToastSuccess(t("settings:notifications.toast.bulkActionSynchronized"))
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
            t("settings:notifications.bulkActionRevertedSummary"),
        )
        setBulkPendingState(undefined)
        showToastInfo(t("settings:notifications.toast.bulkActionReverted"))
    }

    return (
        <FormLayout
            title={t("settings:notifications.pageTitle")}
            description={t("settings:notifications.pageSubtitle")}
        >
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:notifications.inbox")}</p>
                    <Button
                        isDisabled={unreadCount === 0}
                        size="sm"
                        variant="secondary"
                        onPress={handleMarkAllAsRead}
                    >
                        {t("settings:notifications.markAllAsRead")}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.total", { count: notifications.length })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.unread", { count: unreadCount })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.activeChannels", {
                                count: activeChannelCount,
                            })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.selected", {
                                count: selectedNotificationIds.length,
                            })}
                        </Chip>
                    </div>
                    {deepLinkGuardNotice === undefined ? null : (
                        <Alert status="accent">
                            <Alert.Title>{t("settings:notifications.deepLinkGuardTitle")}</Alert.Title>
                            <Alert.Description>{deepLinkGuardNotice}</Alert.Description>
                        </Alert>
                    )}
                    {selectedNotificationIds.length === 0 ? null : (
                        <Alert status="accent">
                            <Alert.Title>{t("settings:notifications.bulkActionsTitle")}</Alert.Title>
                            <Alert.Description>
                                {t("settings:notifications.notificationsSelected", {
                                    count: selectedNotificationIds.length,
                                })}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button size="sm" variant="secondary" onPress={handleBulkMarkRead}>
                                        {t("settings:notifications.markSelectedAsRead")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onPress={(): void => {
                                            setSelectedNotificationIds([])
                                        }}
                                    >
                                        {t("settings:notifications.clearSelection")}
                                    </Button>
                                </div>
                            </Alert.Description>
                        </Alert>
                    )}
                    {bulkPendingState === undefined ? null : (
                        <Alert status="warning">
                            <Alert.Title>{t("settings:notifications.bulkActionPendingSyncTitle")}</Alert.Title>
                            <Alert.Description>
                                {t("settings:notifications.bulkActionPendingSyncDescription")}
                                <div className="mt-2">
                                    <Button size="sm" variant="secondary" onPress={handleUndoBulkAction}>
                                        {t("settings:notifications.undoBulkAction")}
                                    </Button>
                                </div>
                            </Alert.Description>
                        </Alert>
                    )}
                    <div className="md:max-w-[260px]">
                        <select
                            aria-label={t("settings:ariaLabel.notifications.filterEventType")}
                            className={NATIVE_FORM.select}
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
                            <option value="all">
                                {t("settings:notifications.filterAllEvents")}
                            </option>
                            <option value="review.completed">
                                {t("settings:notifications.filterReviewCompleted")}
                            </option>
                            <option value="drift.alert">
                                {t("settings:notifications.filterDriftAlert")}
                            </option>
                            <option value="prediction.alert">
                                {t("settings:notifications.filterPredictionAlert")}
                            </option>
                        </select>
                    </div>

                    <ul
                        aria-label={t("settings:ariaLabel.notifications.inboxList")}
                        className="space-y-2"
                        role="list"
                    >
                        {filteredNotifications.map(
                            (notification): ReactElement => (
                                <li
                                    key={notification.id}
                                    className={`rounded-lg border border-border bg-surface p-3${notification.isRead !== true ? " border-l-2 border-l-primary" : ""}`}
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
                                        <p
                                            className={`text-sm text-foreground${notification.isRead !== true ? " font-semibold" : ""}`}
                                        >
                                            {notification.title}
                                        </p>
                                        <Chip
                                            size="sm"
                                            variant={notification.isRead ? "secondary" : "primary"}
                                        >
                                            {notification.isRead
                                                ? t("settings:notifications.read")
                                                : t("settings:notifications.unreadLabel")}
                                        </Chip>
                                        <Chip size="sm" variant="soft">
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
                                            variant="secondary"
                                            onPress={(): void => {
                                                handleToggleRead(notification.id)
                                            }}
                                        >
                                            {notification.isRead
                                                ? t("settings:notifications.markAsUnread", {
                                                      id: notification.id,
                                                  })
                                                : t("settings:notifications.markAsRead", {
                                                      id: notification.id,
                                                  })}
                                        </Button>
                                        <Button
                                            aria-label={`Open ${notification.id} context`}
                                            size="sm"
                                            variant="secondary"
                                            onPress={(): void => {
                                                handleOpenDeepLink(notification.targetHref)
                                            }}
                                        >
                                            {t("settings:notifications.openContext")}
                                        </Button>
                                    </div>
                                </li>
                            ),
                        )}
                    </ul>
                    {filteredNotifications.length === 0 ? (
                        <Alert status="warning">
                            <Alert.Title>{t("settings:notifications.noNotificationsFoundTitle")}</Alert.Title>
                            <Alert.Description>{t("settings:notifications.noNotificationsFoundDescription")}</Alert.Description>
                        </Alert>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:notifications.deliveryPreferences")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(["slack", "discord", "teams", "inApp"] as const).map(
                        (channelId): ReactElement => {
                            const channel = channelPreferences[channelId]
                            return (
                                <div
                                    key={channelId}
                                    className="grid gap-2 rounded-lg border border-border bg-surface p-3 md:grid-cols-[220px_1fr]"
                                >
                                    <Switch
                                        aria-label={t(
                                            "settings:notifications.enableNotifications",
                                            { channel: CHANNEL_LABELS[channelId] },
                                        )}
                                        isSelected={channel.enabled}
                                        onChange={(isSelected: boolean): void => {
                                            setChannelPreferences((previous) => ({
                                                ...previous,
                                                [channelId]: {
                                                    ...previous[channelId],
                                                    enabled: isSelected,
                                                },
                                            }))
                                        }}
                                    >
                                        {t("settings:notifications.enableNotifications", {
                                            channel: CHANNEL_LABELS[channelId],
                                        })}
                                    </Switch>
                                    <Input
                                        disabled={channel.enabled !== true}
                                        aria-label={t("settings:notifications.channelTarget", {
                                            channel: CHANNEL_LABELS[channelId],
                                        })}
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
                                        onChange={(e): void => {
                                            setChannelPreferences((previous) => ({
                                                ...previous,
                                                [channelId]: {
                                                    ...previous[channelId],
                                                    target: e.target.value,
                                                },
                                            }))
                                        }}
                                    />
                                </div>
                            )
                        },
                    )}
                    <div className="flex justify-end">
                        <Button variant="secondary" onPress={handleSaveDeliveryPreferences}>
                            {t("settings:notifications.saveDeliveryPreferences")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:notifications.inAppMuteRules")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.enabledRules", {
                                count: enabledMuteRulesCount,
                            })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.quietHours", {
                                start: muteRules.quietHoursStart,
                                end: muteRules.quietHoursEnd,
                            })}
                        </Chip>
                    </div>
                    <Switch
                        aria-label={t("settings:notifications.muteNonCritical")}
                        isSelected={muteRules.muteNonCriticalAtNight}
                        onChange={(isSelected: boolean): void => {
                            setMuteRules(
                                (previous): IInAppMuteRules => ({
                                    ...previous,
                                    muteNonCriticalAtNight: isSelected,
                                }),
                            )
                        }}
                    >
                        {t("settings:notifications.muteNonCritical")}
                    </Switch>
                    <Switch
                        aria-label={t("settings:notifications.mutePredictions")}
                        isSelected={muteRules.mutePredictionsForArchivedRepos}
                        onChange={(isSelected: boolean): void => {
                            setMuteRules(
                                (previous): IInAppMuteRules => ({
                                    ...previous,
                                    mutePredictionsForArchivedRepos: isSelected,
                                }),
                            )
                        }}
                    >
                        {t("settings:notifications.mutePredictions")}
                    </Switch>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            aria-label={t("settings:notifications.quietHoursStart")}
                            type="time"
                            value={muteRules.quietHoursStart}
                            onChange={(e): void => {
                                setMuteRules(
                                    (previous): IInAppMuteRules => ({
                                        ...previous,
                                        quietHoursStart: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            aria-label={t("settings:notifications.quietHoursEnd")}
                            type="time"
                            value={muteRules.quietHoursEnd}
                            onChange={(e): void => {
                                setMuteRules(
                                    (previous): IInAppMuteRules => ({
                                        ...previous,
                                        quietHoursEnd: e.target.value,
                                    }),
                                )
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:notifications.bulkActionAudit")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {bulkAudit.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                            {t("settings:notifications.noBulkOperations")}
                        </p>
                    ) : (
                        <ul
                            aria-label={t("settings:ariaLabel.notifications.bulkActionAuditList")}
                            className="space-y-2"
                        >
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
                                            {t("settings:notifications.auditNotifications", {
                                                ids: entry.notificationIds.join(", "),
                                            })}
                                        </p>
                                    </li>
                                ),
                            )}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </FormLayout>
    )
}
