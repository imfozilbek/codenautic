import type {
    IInAppMuteRules,
    INotificationChannelPreference,
    INotificationItem,
    TChannelPreferencesMap,
    TNotificationChannelId,
} from "@/lib/api/endpoints/notifications.endpoint"

/**
 * Данные для seed-инициализации NotificationsCollection.
 */
export interface INotificationsSeedData {
    /**
     * Начальный набор уведомлений.
     */
    readonly notifications: ReadonlyArray<INotificationItem>
    /**
     * Канальные предпочтения.
     */
    readonly channels: TChannelPreferencesMap
    /**
     * Правила приглушения.
     */
    readonly muteRules: IInAppMuteRules
}

/**
 * Коллекция уведомлений для mock API.
 *
 * Хранит in-memory уведомления, канальные предпочтения и правила приглушения.
 */
export class NotificationsCollection {
    /**
     * Хранилище уведомлений по ID.
     */
    private notifications: Map<string, INotificationItem> = new Map()

    /**
     * Канальные предпочтения.
     */
    private channels: Record<TNotificationChannelId, INotificationChannelPreference> = {
        discord: { enabled: false, target: "" },
        inApp: { enabled: true, target: "inbox" },
        slack: { enabled: false, target: "" },
        teams: { enabled: false, target: "" },
    }

    /**
     * Правила приглушения.
     */
    private muteRules: IInAppMuteRules = {
        muteNonCriticalAtNight: false,
        mutePredictionsForArchivedRepos: false,
        quietHoursEnd: "08:00",
        quietHoursStart: "22:00",
    }

    /**
     * Возвращает список всех уведомлений.
     *
     * @returns Массив всех уведомлений.
     */
    public listNotifications(): ReadonlyArray<INotificationItem> {
        return Array.from(this.notifications.values())
    }

    /**
     * Возвращает уведомление по идентификатору.
     *
     * @param id - Идентификатор уведомления.
     * @returns Уведомление или undefined, если не найдено.
     */
    public getNotificationById(id: string): INotificationItem | undefined {
        return this.notifications.get(id)
    }

    /**
     * Отмечает уведомление как прочитанное.
     *
     * @param id - Идентификатор уведомления.
     * @returns true если уведомление было найдено и обновлено.
     */
    public markAsRead(id: string): boolean {
        const notification = this.notifications.get(id)
        if (notification === undefined) {
            return false
        }

        this.notifications.set(id, { ...notification, isRead: true })
        return true
    }

    /**
     * Возвращает текущие канальные предпочтения.
     *
     * @returns Копия канальных предпочтений.
     */
    public getChannels(): TChannelPreferencesMap {
        return { ...this.channels }
    }

    /**
     * Обновляет канальные предпочтения.
     *
     * @param channels - Новые канальные предпочтения.
     */
    public setChannels(channels: TChannelPreferencesMap): void {
        this.channels = { ...channels }
    }

    /**
     * Возвращает текущие правила приглушения.
     *
     * @returns Копия правил приглушения.
     */
    public getMuteRules(): IInAppMuteRules {
        return { ...this.muteRules }
    }

    /**
     * Обновляет правила приглушения.
     *
     * @param muteRules - Новые правила приглушения.
     */
    public setMuteRules(muteRules: IInAppMuteRules): void {
        this.muteRules = { ...muteRules }
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: INotificationsSeedData): void {
        this.clear()

        for (const notification of data.notifications) {
            this.notifications.set(notification.id, notification)
        }

        this.channels = { ...data.channels }
        this.muteRules = { ...data.muteRules }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.notifications.clear()
        this.channels = {
            discord: { enabled: false, target: "" },
            inApp: { enabled: true, target: "inbox" },
            slack: { enabled: false, target: "" },
            teams: { enabled: false, target: "" },
        }
        this.muteRules = {
            muteNonCriticalAtNight: false,
            mutePredictionsForArchivedRepos: false,
            quietHoursEnd: "08:00",
            quietHoursStart: "22:00",
        }
    }
}
