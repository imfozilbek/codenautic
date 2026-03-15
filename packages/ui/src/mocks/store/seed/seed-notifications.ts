import type { INotificationItem } from "@/lib/api/endpoints/notifications.endpoint"
import type { IInAppMuteRules, TChannelPreferencesMap } from "@/lib/api/endpoints/notifications.endpoint"

import type { NotificationsCollection } from "../collections/notifications-collection"

/**
 * Начальный набор уведомлений для seed.
 */
const SEED_NOTIFICATIONS: ReadonlyArray<INotificationItem> = [
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

/**
 * Начальные канальные предпочтения для seed.
 */
const SEED_CHANNELS: TChannelPreferencesMap = {
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
}

/**
 * Начальные правила приглушения для seed.
 */
const SEED_MUTE_RULES: IInAppMuteRules = {
    muteNonCriticalAtNight: true,
    mutePredictionsForArchivedRepos: false,
    quietHoursEnd: "08:00",
    quietHoursStart: "22:00",
}

/**
 * Заполняет коллекцию уведомлений начальным набором данных.
 *
 * Загружает 4 уведомления, канальные предпочтения и правила приглушения.
 *
 * @param notifications - Коллекция уведомлений для заполнения.
 */
export function seedNotifications(notifications: NotificationsCollection): void {
    notifications.seed({
        notifications: SEED_NOTIFICATIONS,
        channels: SEED_CHANNELS,
        muteRules: SEED_MUTE_RULES,
    })
}
