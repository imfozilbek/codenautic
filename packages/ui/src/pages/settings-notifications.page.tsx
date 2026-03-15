import { type ReactElement, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input, Switch } from "@heroui/react"
import { getWindowLocalStorage, safeStorageGet, safeStorageSet } from "@/lib/utils/safe-storage"
import { useAuthAccess } from "@/lib/auth/auth-access"
import { resolveDeepLinkGuard } from "@/lib/navigation/deep-link-guard"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { useNotifications } from "@/lib/hooks/queries/use-notifications"
import type { TTenantId } from "@/lib/access/access-types"
import type {
    IInAppMuteRules,
    INotificationItem,
    TChannelPreferencesMap,
    TNotificationChannelId,
    TNotificationEventType,
} from "@/lib/api/endpoints/notifications.endpoint"

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
    const {
        historyQuery,
        channelsQuery,
        muteRulesQuery,
        markRead,
        updateChannels,
        updateMuteRules,
    } = useNotifications()
    const [eventTypeFilter, setEventTypeFilter] = useState<"all" | TNotificationEventType>("all")

    const notifications: ReadonlyArray<INotificationItem> = useMemo((): ReadonlyArray<INotificationItem> => {
        if (historyQuery.data === undefined) {
            return []
        }
        return dedupeNotificationsById(historyQuery.data.notifications)
    }, [historyQuery.data])

    const channelPreferences: TChannelPreferencesMap = useMemo((): TChannelPreferencesMap => {
        if (channelsQuery.data === undefined) {
            return {
                discord: { enabled: false, target: "" },
                inApp: { enabled: true, target: "inbox" },
                slack: { enabled: false, target: "" },
                teams: { enabled: false, target: "" },
            }
        }
        return channelsQuery.data.channels
    }, [channelsQuery.data])

    const [localChannelPreferences, setLocalChannelPreferences] = useState<TChannelPreferencesMap>(channelPreferences)

    useEffect((): void => {
        setLocalChannelPreferences(channelPreferences)
    }, [channelPreferences])

    const muteRules: IInAppMuteRules = useMemo((): IInAppMuteRules => {
        if (muteRulesQuery.data === undefined) {
            return {
                muteNonCriticalAtNight: false,
                mutePredictionsForArchivedRepos: false,
                quietHoursEnd: "08:00",
                quietHoursStart: "22:00",
            }
        }
        return muteRulesQuery.data.muteRules
    }, [muteRulesQuery.data])

    const [localMuteRules, setLocalMuteRules] = useState<IInAppMuteRules>(muteRules)

    useEffect((): void => {
        setLocalMuteRules(muteRules)
    }, [muteRules])
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
        return Object.values(localChannelPreferences).reduce((count, channel): number => {
            return channel.enabled ? count + 1 : count
        }, 0)
    }, [localChannelPreferences])

    const enabledMuteRulesCount = useMemo((): number => {
        return [localMuteRules.muteNonCriticalAtNight, localMuteRules.mutePredictionsForArchivedRepos].filter(
            (value): boolean => value === true,
        ).length
    }, [localMuteRules])

    const handleToggleRead = (id: string): void => {
        markRead.mutate(id)
    }

    const handleMarkAllAsRead = (): void => {
        for (const notification of notifications) {
            if (notification.isRead !== true) {
                markRead.mutate(notification.id)
            }
        }
        showToastSuccess(t("settings:notifications.toast.allMarkedAsRead"))
    }

    const handleSaveDeliveryPreferences = (): void => {
        updateChannels.mutate(localChannelPreferences, {
            onSuccess: (): void => {
                showToastInfo(t("settings:notifications.toast.deliveryPreferencesSaved"))
            },
        })
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

        setSelectedNotificationIds([])
        setBulkPendingState({
            actionId,
            previousNotifications: notifications,
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

                for (const id of selectedIds) {
                    markRead.mutate(id)
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
        <div className="space-y-6 mx-auto max-w-[1400px]">
            <div className="space-y-1.5">
                <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:notifications.pageTitle")}</h1>
                <p className={TYPOGRAPHY.bodyMuted}>{t("settings:notifications.pageSubtitle")}</p>
            </div>
            <div className="space-y-6">
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
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
                            <Alert.Title>
                                {t("settings:notifications.deepLinkGuardTitle")}
                            </Alert.Title>
                            <Alert.Description>{deepLinkGuardNotice}</Alert.Description>
                        </Alert>
                    )}
                    {selectedNotificationIds.length === 0 ? null : (
                        <Alert status="accent">
                            <Alert.Title>
                                {t("settings:notifications.bulkActionsTitle")}
                            </Alert.Title>
                            <Alert.Description>
                                {t("settings:notifications.notificationsSelected", {
                                    count: selectedNotificationIds.length,
                                })}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onPress={handleBulkMarkRead}
                                    >
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
                            <Alert.Title>
                                {t("settings:notifications.bulkActionPendingSyncTitle")}
                            </Alert.Title>
                            <Alert.Description>
                                {t("settings:notifications.bulkActionPendingSyncDescription")}
                                <div className="mt-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onPress={handleUndoBulkAction}
                                    >
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
                                    className={`rounded-lg border border-border bg-surface p-3${notification.isRead !== true ? " border-l-2 border-l-accent" : ""}`}
                                    role="listitem"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            aria-label={`Select ${notification.id}`}
                                            checked={selectedNotificationIds.includes(
                                                notification.id,
                                            )}
                                            className="h-4 w-4 accent-accent"
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
                                        <p className="text-xs text-muted">
                                            {formatNotificationTime(notification.occurredAt)}
                                        </p>
                                    </div>
                                    <p className="mt-1 text-sm text-muted">
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
                            <Alert.Title>
                                {t("settings:notifications.noNotificationsFoundTitle")}
                            </Alert.Title>
                            <Alert.Description>
                                {t("settings:notifications.noNotificationsFoundDescription")}
                            </Alert.Description>
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
                            const channel = localChannelPreferences[channelId]
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
                                            setLocalChannelPreferences((previous) => ({
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
                                            setLocalChannelPreferences((previous) => ({
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.enabledRules", {
                                count: enabledMuteRulesCount,
                            })}
                        </Chip>
                        <Chip size="sm" variant="soft">
                            {t("settings:notifications.quietHours", {
                                start: localMuteRules.quietHoursStart,
                                end: localMuteRules.quietHoursEnd,
                            })}
                        </Chip>
                    </div>
                    <Switch
                        aria-label={t("settings:notifications.muteNonCritical")}
                        isSelected={localMuteRules.muteNonCriticalAtNight}
                        onChange={(isSelected: boolean): void => {
                            const nextRules: IInAppMuteRules = {
                                ...localMuteRules,
                                muteNonCriticalAtNight: isSelected,
                            }
                            setLocalMuteRules(nextRules)
                            updateMuteRules.mutate(nextRules)
                        }}
                    >
                        {t("settings:notifications.muteNonCritical")}
                    </Switch>
                    <Switch
                        aria-label={t("settings:notifications.mutePredictions")}
                        isSelected={localMuteRules.mutePredictionsForArchivedRepos}
                        onChange={(isSelected: boolean): void => {
                            const nextRules: IInAppMuteRules = {
                                ...localMuteRules,
                                mutePredictionsForArchivedRepos: isSelected,
                            }
                            setLocalMuteRules(nextRules)
                            updateMuteRules.mutate(nextRules)
                        }}
                    >
                        {t("settings:notifications.mutePredictions")}
                    </Switch>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            aria-label={t("settings:notifications.quietHoursStart")}
                            type="time"
                            value={localMuteRules.quietHoursStart}
                            onChange={(e): void => {
                                setLocalMuteRules(
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
                            value={localMuteRules.quietHoursEnd}
                            onChange={(e): void => {
                                setLocalMuteRules(
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
                        <p className="text-sm text-muted">
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
                                        <p className="text-muted">{entry.summary}</p>
                                        <p className="text-muted">
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
            </div>
        </div>
    )
}
