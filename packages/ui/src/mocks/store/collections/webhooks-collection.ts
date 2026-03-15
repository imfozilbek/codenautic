import type {
    IWebhookDeliveryLog,
    IWebhookEndpoint,
    TWebhookDeliveryStatus,
} from "@/lib/api/endpoints/webhooks.endpoint"

/**
 * Входные данные для создания webhook endpoint (без id).
 */
export interface ICreateWebhookData {
    /** URL endpoint. */
    readonly url: string
    /** Типы событий. */
    readonly eventTypes: ReadonlyArray<string>
}

/**
 * Частичные данные для обновления webhook endpoint.
 */
export interface IUpdateWebhookData {
    /** Включен ли endpoint. */
    readonly isEnabled?: boolean
    /** Ротировать секрет. */
    readonly rotateSecret?: boolean
}

/**
 * Коллекция webhook endpoints для mock API.
 *
 * Хранит in-memory данные endpoints и delivery logs.
 * Поддерживает CRUD, search, seed и clear.
 */
export class WebhooksCollection {
    /**
     * Хранилище endpoints по ID.
     */
    private webhooks: Map<string, IWebhookEndpoint> = new Map()

    /**
     * Delivery logs.
     */
    private deliveryLogs: IWebhookDeliveryLog[] = []

    /**
     * Счётчик для генерации уникальных ID.
     */
    private idCounter: number = 1000

    /**
     * Счётчик для генерации уникальных log ID.
     */
    private logIdCounter: number = 0

    /**
     * Возвращает все webhook endpoints.
     *
     * @returns Массив endpoints.
     */
    public listWebhooks(): ReadonlyArray<IWebhookEndpoint> {
        return Array.from(this.webhooks.values())
    }

    /**
     * Возвращает webhook endpoint по идентификатору.
     *
     * @param id - Идентификатор endpoint.
     * @returns Endpoint или undefined, если не найден.
     */
    public getWebhookById(id: string): IWebhookEndpoint | undefined {
        return this.webhooks.get(id)
    }

    /**
     * Возвращает все delivery logs.
     *
     * @returns Массив логов доставки.
     */
    public listDeliveryLogs(): ReadonlyArray<IWebhookDeliveryLog> {
        return [...this.deliveryLogs]
    }

    /**
     * Возвращает delivery logs для конкретного endpoint.
     *
     * @param endpointId - Идентификатор endpoint.
     * @returns Массив логов для указанного endpoint.
     */
    public getDeliveriesForEndpoint(endpointId: string): ReadonlyArray<IWebhookDeliveryLog> {
        return this.deliveryLogs.filter(
            (log): boolean => log.endpointId === endpointId,
        )
    }

    /**
     * Создаёт новый webhook endpoint.
     *
     * @param data - Данные для создания.
     * @returns Созданный webhook endpoint.
     */
    public createWebhook(data: ICreateWebhookData): IWebhookEndpoint {
        this.idCounter += 1
        const id = `wh-${String(this.idCounter)}`
        const suffix = id.slice(-4).padStart(4, "0")

        const webhook: IWebhookEndpoint = {
            eventTypes: data.eventTypes,
            id,
            isEnabled: true,
            lastDeliveryAt: undefined,
            secretPreview: `whsec_****${suffix}`,
            status: "retrying" as TWebhookDeliveryStatus,
            url: data.url,
        }

        this.webhooks.set(id, webhook)
        return webhook
    }

    /**
     * Обновляет существующий webhook endpoint.
     *
     * @param id - Идентификатор endpoint.
     * @param patch - Частичные данные для обновления.
     * @returns Обновлённый endpoint или undefined, если не найден.
     */
    public updateWebhook(id: string, patch: IUpdateWebhookData): IWebhookEndpoint | undefined {
        const existing = this.webhooks.get(id)
        if (existing === undefined) {
            return undefined
        }

        let updated = { ...existing }

        if (patch.isEnabled !== undefined) {
            const newStatus: TWebhookDeliveryStatus = patch.isEnabled
                ? existing.status
                : "disconnected"
            updated = { ...updated, isEnabled: patch.isEnabled, status: newStatus }
        }

        if (patch.rotateSecret === true) {
            const suffix = `${id}-${Date.now().toString()}`.slice(-4).padStart(4, "0")
            updated = {
                ...updated,
                secretPreview: `whsec_****${suffix}`,
                status: "retrying" as TWebhookDeliveryStatus,
            }
        }

        this.webhooks.set(id, updated)
        return updated
    }

    /**
     * Удаляет webhook endpoint и его delivery logs.
     *
     * @param id - Идентификатор endpoint.
     * @returns true если endpoint был удалён, false если не найден.
     */
    public deleteWebhook(id: string): boolean {
        const removed = this.webhooks.delete(id)
        if (removed) {
            this.deliveryLogs = this.deliveryLogs.filter(
                (log): boolean => log.endpointId !== id,
            )
        }
        return removed
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * @param webhooks - Начальные webhook endpoints.
     * @param deliveryLogs - Начальные delivery logs.
     */
    public seed(
        webhooks: ReadonlyArray<IWebhookEndpoint>,
        deliveryLogs: ReadonlyArray<IWebhookDeliveryLog>,
    ): void {
        this.clear()

        for (const webhook of webhooks) {
            this.webhooks.set(webhook.id, webhook)
        }

        this.deliveryLogs = [...deliveryLogs]
        this.logIdCounter = deliveryLogs.length

        const maxNumericId = webhooks.reduce((maxValue, endpoint): number => {
            const match = /^wh-(\d+)$/u.exec(endpoint.id)
            if (match === null) {
                return maxValue
            }
            const parsedValue = Number.parseInt(match[1] ?? "", 10)
            if (Number.isNaN(parsedValue)) {
                return maxValue
            }
            return parsedValue > maxValue ? parsedValue : maxValue
        }, 1000)

        this.idCounter = maxNumericId
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.webhooks.clear()
        this.deliveryLogs = []
        this.idCounter = 1000
        this.logIdCounter = 0
    }
}
