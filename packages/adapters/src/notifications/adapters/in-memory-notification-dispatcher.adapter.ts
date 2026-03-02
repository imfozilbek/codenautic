import {Result, hash} from "@codenautic/core"

import {
    NOTIFICATION_DELIVERY_STATUS,
    type INotificationDeliveryResult,
    type INotificationDispatchRequest,
} from "../contracts/notification.contract"
import {
    NOTIFICATION_ADAPTER_ERROR_CODE,
    NotificationAdapterError,
} from "../errors/notification-adapter.error"

/**
 * In-memory notification dispatcher with idempotent delivery keys.
 */
export class InMemoryNotificationDispatcherAdapter {
    private readonly deliveries: Map<string, INotificationDeliveryResult>
    private readonly now: () => Date

    /**
     * Creates in-memory notification dispatcher.
     *
     * @param now Clock provider for deterministic tests.
     */
    public constructor(now: () => Date = () => new Date()) {
        this.deliveries = new Map<string, INotificationDeliveryResult>()
        this.now = now
    }

    /**
     * Dispatches notification request with idempotency by key.
     *
     * @param request Notification dispatch request.
     * @returns Sent or duplicate delivery result.
     */
    public dispatch(
        request: INotificationDispatchRequest,
    ): Result<INotificationDeliveryResult, NotificationAdapterError> {
        const idempotencyKey = normalizeNonEmptyString(request.idempotencyKey)
        const recipient = normalizeNonEmptyString(request.recipient)
        const body = normalizeNonEmptyString(request.body)
        if (idempotencyKey === undefined || recipient === undefined || body === undefined) {
            return Result.fail(
                createInvalidRequestError(
                    "idempotencyKey, recipient and body must be non-empty strings",
                ),
            )
        }

        if (request.metadata !== undefined && isPlainObject(request.metadata) === false) {
            return Result.fail(createInvalidRequestError("metadata must be a plain object"))
        }

        const existing = this.deliveries.get(idempotencyKey)
        if (existing !== undefined) {
            return Result.ok({
                ...cloneDelivery(existing),
                status: NOTIFICATION_DELIVERY_STATUS.DUPLICATE,
            })
        }

        const delivered: INotificationDeliveryResult = {
            status: NOTIFICATION_DELIVERY_STATUS.SENT,
            messageId: createMessageId(request.channel, recipient, idempotencyKey),
            channel: request.channel,
            recipient,
            dispatchedAt: this.now(),
        }
        this.deliveries.set(idempotencyKey, delivered)

        return Result.ok(cloneDelivery(delivered))
    }
}

/**
 * Creates normalized invalid request error.
 *
 * @param message Error message.
 * @returns Notification adapter validation error.
 */
function createInvalidRequestError(message: string): NotificationAdapterError {
    return new NotificationAdapterError({
        code: NOTIFICATION_ADAPTER_ERROR_CODE.INVALID_REQUEST,
        message,
        retryable: false,
    })
}

/**
 * Normalizes unknown value into trimmed non-empty string.
 *
 * @param value Unknown value.
 * @returns Trimmed string when valid.
 */
function normalizeNonEmptyString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        return undefined
    }

    return normalized
}

/**
 * Checks whether value is plain object.
 *
 * @param value Unknown value.
 * @returns True when value is plain object.
 */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null) {
        return false
    }

    return Array.isArray(value) === false
}

/**
 * Creates deterministic message id from delivery fields.
 *
 * @param channel Notification channel.
 * @param recipient Recipient identifier.
 * @param key Idempotency key.
 * @returns Stable notification message id.
 */
function createMessageId(channel: string, recipient: string, key: string): string {
    const digest = hash(`${channel}|${recipient}|${key}`)
    return `notif-${digest.slice(0, 16)}`
}

/**
 * Creates immutable delivery result clone.
 *
 * @param delivery Source delivery result.
 * @returns Cloned delivery result.
 */
function cloneDelivery(delivery: INotificationDeliveryResult): INotificationDeliveryResult {
    return {
        status: delivery.status,
        messageId: delivery.messageId,
        channel: delivery.channel,
        recipient: delivery.recipient,
        dispatchedAt: new Date(delivery.dispatchedAt),
    }
}
