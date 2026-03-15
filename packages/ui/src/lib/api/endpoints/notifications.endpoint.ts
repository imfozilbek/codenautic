import type { IHttpClient } from "../http-client"

/**
 * Тип события уведомления.
 */
export type TNotificationEventType = "drift.alert" | "prediction.alert" | "review.completed"

/**
 * Идентификатор канала доставки уведомлений.
 */
export type TNotificationChannelId = "discord" | "inApp" | "slack" | "teams"

/**
 * Элемент уведомления из ленты.
 */
export interface INotificationItem {
    /**
     * Уникальный id события.
     */
    readonly id: string
    /**
     * Тип уведомления.
     */
    readonly type: TNotificationEventType
    /**
     * Заголовок уведомления.
     */
    readonly title: string
    /**
     * Краткое описание события.
     */
    readonly message: string
    /**
     * Время события (ISO строка).
     */
    readonly occurredAt: string
    /**
     * Прочитано ли уведомление.
     */
    readonly isRead: boolean
    /**
     * Deep-link для перехода в контекст.
     */
    readonly targetHref: string
}

/**
 * Настройки канала доставки уведомлений.
 */
export interface INotificationChannelPreference {
    /**
     * Включен ли канал.
     */
    readonly enabled: boolean
    /**
     * Канал назначения (URL/channel name).
     */
    readonly target: string
}

/**
 * Правила приглушения in-app уведомлений.
 */
export interface IInAppMuteRules {
    /**
     * Приглушать non-critical ночью.
     */
    readonly muteNonCriticalAtNight: boolean
    /**
     * Приглушать prediction alerts для архивных repo.
     */
    readonly mutePredictionsForArchivedRepos: boolean
    /**
     * Начало quiet hours.
     */
    readonly quietHoursStart: string
    /**
     * Окончание quiet hours.
     */
    readonly quietHoursEnd: string
}

/**
 * Ответ списка уведомлений.
 */
export interface INotificationsListResponse {
    /**
     * Массив уведомлений.
     */
    readonly notifications: ReadonlyArray<INotificationItem>
    /**
     * Общее количество уведомлений.
     */
    readonly total: number
}

/**
 * Ответ на отметку уведомления как прочитанного.
 */
export interface IMarkReadResponse {
    /**
     * Флаг успешного обновления.
     */
    readonly success: boolean
}

/**
 * Полный набор канальных предпочтений.
 */
export type TChannelPreferencesMap = Readonly<
    Record<TNotificationChannelId, INotificationChannelPreference>
>

/**
 * Ответ получения канальных предпочтений.
 */
export interface IChannelPreferencesResponse {
    /**
     * Канальные предпочтения по идентификатору канала.
     */
    readonly channels: TChannelPreferencesMap
}

/**
 * Ответ получения правил приглушения.
 */
export interface IMuteRulesResponse {
    /**
     * Правила приглушения уведомлений.
     */
    readonly muteRules: IInAppMuteRules
}

/**
 * API-контракт домена уведомлений.
 */
export interface INotificationsApi {
    /**
     * Возвращает историю уведомлений.
     */
    getHistory(): Promise<INotificationsListResponse>
    /**
     * Отмечает уведомление как прочитанное.
     *
     * @param id - Идентификатор уведомления.
     */
    markRead(id: string): Promise<IMarkReadResponse>
    /**
     * Возвращает настройки каналов доставки.
     */
    getChannels(): Promise<IChannelPreferencesResponse>
    /**
     * Обновляет настройки каналов доставки.
     *
     * @param channels - Новые канальные предпочтения.
     */
    updateChannels(channels: TChannelPreferencesMap): Promise<IChannelPreferencesResponse>
    /**
     * Возвращает правила приглушения уведомлений.
     */
    getMuteRules(): Promise<IMuteRulesResponse>
    /**
     * Обновляет правила приглушения уведомлений.
     *
     * @param muteRules - Новые правила.
     */
    updateMuteRules(muteRules: IInAppMuteRules): Promise<IMuteRulesResponse>
}

/**
 * Endpoint-клиент Notifications API.
 */
export class NotificationsApi implements INotificationsApi {
    /**
     * HTTP-клиент для запросов.
     */
    private readonly httpClient: IHttpClient

    /**
     * Создаёт экземпляр NotificationsApi.
     *
     * @param httpClient - HTTP-клиент.
     */
    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    /**
     * Возвращает историю уведомлений.
     *
     * @returns Список уведомлений.
     */
    public async getHistory(): Promise<INotificationsListResponse> {
        return this.httpClient.request<INotificationsListResponse>({
            method: "GET",
            path: "/api/v1/notifications",
            credentials: "include",
        })
    }

    /**
     * Отмечает уведомление как прочитанное.
     *
     * @param id - Идентификатор уведомления.
     * @returns Результат операции.
     */
    public async markRead(id: string): Promise<IMarkReadResponse> {
        const normalizedId = id.trim()
        if (normalizedId.length === 0) {
            throw new Error("notification id не должен быть пустым")
        }

        return this.httpClient.request<IMarkReadResponse>({
            method: "PATCH",
            path: `/api/v1/notifications/${encodeURIComponent(normalizedId)}/read`,
            credentials: "include",
        })
    }

    /**
     * Возвращает настройки каналов доставки.
     *
     * @returns Канальные предпочтения.
     */
    public async getChannels(): Promise<IChannelPreferencesResponse> {
        return this.httpClient.request<IChannelPreferencesResponse>({
            method: "GET",
            path: "/api/v1/notifications/channels",
            credentials: "include",
        })
    }

    /**
     * Обновляет настройки каналов доставки.
     *
     * @param channels - Новые канальные предпочтения.
     * @returns Обновлённые предпочтения.
     */
    public async updateChannels(
        channels: TChannelPreferencesMap,
    ): Promise<IChannelPreferencesResponse> {
        return this.httpClient.request<IChannelPreferencesResponse>({
            method: "PUT",
            path: "/api/v1/notifications/channels",
            body: { channels },
            credentials: "include",
        })
    }

    /**
     * Возвращает правила приглушения уведомлений.
     *
     * @returns Правила приглушения.
     */
    public async getMuteRules(): Promise<IMuteRulesResponse> {
        return this.httpClient.request<IMuteRulesResponse>({
            method: "GET",
            path: "/api/v1/notifications/mute-rules",
            credentials: "include",
        })
    }

    /**
     * Обновляет правила приглушения уведомлений.
     *
     * @param muteRules - Новые правила.
     * @returns Обновлённые правила.
     */
    public async updateMuteRules(muteRules: IInAppMuteRules): Promise<IMuteRulesResponse> {
        return this.httpClient.request<IMuteRulesResponse>({
            method: "PUT",
            path: "/api/v1/notifications/mute-rules",
            body: { muteRules },
            credentials: "include",
        })
    }
}
