import { http, HttpResponse, delay } from "msw"

import type {
    IInAppMuteRules,
    TChannelPreferencesMap,
} from "@/lib/api/endpoints/notifications.endpoint"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для Notifications API.
 *
 * Обрабатывают операции уведомлений: history, markRead, channels CRUD, mute rules CRUD.
 * Используют NotificationsCollection из mock store для хранения состояния.
 */
export const notificationsHandlers = [
    /**
     * GET /notifications — возвращает историю уведомлений.
     */
    http.get(api("/notifications"), async () => {
        await delay(100)
        const store = getMockStore()
        const notifications = store.notifications.listNotifications()

        return HttpResponse.json({
            notifications,
            total: notifications.length,
        })
    }),

    /**
     * PATCH /notifications/:id/read — отмечает уведомление как прочитанное.
     */
    http.patch(api("/notifications/:id/read"), async ({ params }) => {
        await delay(100)
        const store = getMockStore()
        const id = params["id"] as string

        const success = store.notifications.markAsRead(id)

        if (success !== true) {
            return HttpResponse.json(
                { error: "Notification not found", id },
                { status: 404 },
            )
        }

        return HttpResponse.json({ success: true })
    }),

    /**
     * GET /notifications/channels — возвращает канальные предпочтения.
     */
    http.get(api("/notifications/channels"), async () => {
        await delay(100)
        const store = getMockStore()
        const channels = store.notifications.getChannels()

        return HttpResponse.json({ channels })
    }),

    /**
     * PUT /notifications/channels — обновляет канальные предпочтения.
     */
    http.put(api("/notifications/channels"), async ({ request }) => {
        await delay(150)
        const store = getMockStore()
        const body = (await request.json()) as { readonly channels: TChannelPreferencesMap }

        store.notifications.setChannels(body.channels)
        const channels = store.notifications.getChannels()

        return HttpResponse.json({ channels })
    }),

    /**
     * GET /notifications/mute-rules — возвращает правила приглушения.
     */
    http.get(api("/notifications/mute-rules"), async () => {
        await delay(100)
        const store = getMockStore()
        const muteRules = store.notifications.getMuteRules()

        return HttpResponse.json({ muteRules })
    }),

    /**
     * PUT /notifications/mute-rules — обновляет правила приглушения.
     */
    http.put(api("/notifications/mute-rules"), async ({ request }) => {
        await delay(150)
        const store = getMockStore()
        const body = (await request.json()) as { readonly muteRules: IInAppMuteRules }

        store.notifications.setMuteRules(body.muteRules)
        const muteRules = store.notifications.getMuteRules()

        return HttpResponse.json({ muteRules })
    }),
]
