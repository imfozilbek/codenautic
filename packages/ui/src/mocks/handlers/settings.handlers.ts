import { http, HttpResponse, delay } from "msw"

import { getMockStore } from "../store/create-mock-store"
import { api } from "./handler-utils"

/**
 * MSW handlers для пользовательских настроек и предпочтений.
 *
 * Используют SettingsCollection из mock store для хранения состояния.
 */
export const settingsHandlers = [
    /**
     * GET /user/settings — возвращает пользовательские настройки.
     */
    http.get(api("/user/settings"), async () => {
        await delay(50)
        const store = getMockStore()
        const settings = store.settings.getUserSettings()
        return HttpResponse.json(settings)
    }),

    /**
     * POST /user/settings — полностью заменяет пользовательские настройки.
     */
    http.post(api("/user/settings"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.replaceUserSettings(body)
        return HttpResponse.json({ updated: true })
    }),

    /**
     * PUT /user/settings — полностью заменяет пользовательские настройки.
     */
    http.put(api("/user/settings"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.replaceUserSettings(body)
        return HttpResponse.json({ updated: true })
    }),

    /**
     * PATCH /user/settings — частично обновляет пользовательские настройки.
     */
    http.patch(api("/user/settings"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.updateUserSettings(body)
        return HttpResponse.json({ updated: true })
    }),

    /**
     * GET /user/preferences — возвращает пользовательские предпочтения.
     */
    http.get(api("/user/preferences"), async () => {
        await delay(50)
        const store = getMockStore()
        const preferences = store.settings.getUserPreferences()
        return HttpResponse.json(preferences)
    }),

    /**
     * POST /user/preferences — полностью заменяет пользовательские предпочтения.
     */
    http.post(api("/user/preferences"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.replaceUserPreferences(body)
        return HttpResponse.json({ updated: true })
    }),

    /**
     * PUT /user/preferences — полностью заменяет пользовательские предпочтения.
     */
    http.put(api("/user/preferences"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.replaceUserPreferences(body)
        return HttpResponse.json({ updated: true })
    }),

    /**
     * PATCH /user/preferences — частично обновляет пользовательские предпочтения.
     */
    http.patch(api("/user/preferences"), async ({ request }) => {
        await delay(100)
        const store = getMockStore()
        const body = (await request.json()) as Record<string, unknown>
        store.settings.updateUserPreferences(body)
        return HttpResponse.json({ updated: true })
    }),
]
