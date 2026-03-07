import {UniqueId, type MessageBrokerPayload} from "@codenautic/core"

import {normalizeEventType, normalizeMessageKey} from "./messaging-normalization"

const DEFAULT_MAX_RETRIES = 3
const UNLIMITED_PENDING = Number.MAX_SAFE_INTEGER

/**
 * Outbox writer lifecycle statuses.
 */
export const OUTBOX_WRITER_STATUS = {
    PENDING: "PENDING",
    SENT: "SENT",
    FAILED: "FAILED",
} as const

/**
 * Outbox writer message status.
 */
export type OutboxWriterStatus =
    (typeof OUTBOX_WRITER_STATUS)[keyof typeof OUTBOX_WRITER_STATUS]

/**
 * Input payload for outbox write operation.
 */
export interface IOutboxWriteInput {
    /**
     * Idempotency key used to prevent duplicates.
     */
    readonly messageKey: string

    /**
     * Logical event type.
     */
    readonly eventType: string

    /**
     * JSON object payload for downstream broker.
     */
    readonly payload: MessageBrokerPayload

    /**
     * Optional retry cap.
     */
    readonly maxRetries?: number
}

/**
 * Outbox record shape managed by writer.
 */
export interface IOutboxWriterRecord {
    /**
     * Generated message identifier.
     */
    readonly messageId: string

    /**
     * Stable idempotency key.
     */
    readonly messageKey: string

    /**
     * Event type.
     */
    readonly eventType: string

    /**
     * Message payload.
     */
    readonly payload: MessageBrokerPayload

    /**
     * Current lifecycle status.
     */
    readonly status: OutboxWriterStatus

    /**
     * Retry attempts already used.
     */
    readonly retryCount: number

    /**
     * Retry limit.
     */
    readonly maxRetries: number

    /**
     * Creation timestamp.
     */
    readonly createdAt: Date

    /**
     * Last update timestamp.
     */
    readonly updatedAt: Date
}

/**
 * Result of write operation.
 */
export interface IOutboxWriteResult {
    /**
     * True when message key already existed.
     */
    readonly isDuplicate: boolean

    /**
     * Stored record.
     */
    readonly record: IOutboxWriterRecord
}

interface IMutableOutboxWriterRecord {
    messageId: string
    messageKey: string
    eventType: string
    payload: MessageBrokerPayload
    status: OutboxWriterStatus
    retryCount: number
    maxRetries: number
    createdAt: Date
    updatedAt: Date
}

/**
 * Minimal in-memory outbox writer with idempotency by message key.
 */
export class OutboxWriter {
    private readonly recordsByMessageKey: Map<string, IMutableOutboxWriterRecord>
    private readonly now: () => Date

    /**
     * Creates outbox writer instance.
     *
     * @param now Deterministic clock for tests.
     */
    public constructor(now: () => Date = () => new Date()) {
        this.recordsByMessageKey = new Map<string, IMutableOutboxWriterRecord>()
        this.now = now
    }

    /**
     * Writes outbox message idempotently by message key.
     *
     * @param input Write payload.
     * @returns Created or existing record.
     */
    public write(input: IOutboxWriteInput): IOutboxWriteResult {
        const messageKey = normalizeMessageKey(input.messageKey)
        const existing = this.recordsByMessageKey.get(messageKey)
        if (existing !== undefined) {
            return {
                isDuplicate: true,
                record: toReadonlyRecord(existing),
            }
        }

        const now = this.now()
        const record: IMutableOutboxWriterRecord = {
            messageId: UniqueId.create().value,
            messageKey,
            eventType: normalizeEventType(input.eventType),
            payload: normalizePayload(input.payload),
            status: OUTBOX_WRITER_STATUS.PENDING,
            retryCount: 0,
            maxRetries: normalizeMaxRetries(input.maxRetries),
            createdAt: now,
            updatedAt: now,
        }
        this.recordsByMessageKey.set(messageKey, record)

        return {
            isDuplicate: false,
            record: toReadonlyRecord(record),
        }
    }

    /**
     * Finds record by idempotency key.
     *
     * @param messageKey Idempotency key.
     * @returns Record or null.
     */
    public findByMessageKey(messageKey: string): IOutboxWriterRecord | null {
        const normalizedMessageKey = normalizeMessageKey(messageKey)
        const record = this.recordsByMessageKey.get(normalizedMessageKey)
        if (record === undefined) {
            return null
        }

        return toReadonlyRecord(record)
    }

    /**
     * Reads pending records in insertion order.
     *
     * @param limit Optional max record count.
     * @returns Pending records.
     */
    public findPending(limit?: number): readonly IOutboxWriterRecord[] {
        const normalizedLimit = normalizePendingLimit(limit)
        if (normalizedLimit === 0) {
            return []
        }

        const pending: IOutboxWriterRecord[] = []
        for (const record of this.recordsByMessageKey.values()) {
            if (record.status !== OUTBOX_WRITER_STATUS.PENDING) {
                continue
            }

            pending.push(toReadonlyRecord(record))
            if (pending.length >= normalizedLimit) {
                break
            }
        }

        return pending
    }

    /**
     * Marks message as sent.
     *
     * @param messageKey Idempotency key.
     */
    public markSent(messageKey: string): void {
        const normalizedMessageKey = normalizeMessageKey(messageKey)
        const record = this.recordsByMessageKey.get(normalizedMessageKey)
        if (record === undefined) {
            return
        }

        if (record.status === OUTBOX_WRITER_STATUS.FAILED) {
            throw new Error("Failed outbox message cannot be marked as sent")
        }

        if (record.status === OUTBOX_WRITER_STATUS.SENT) {
            return
        }

        record.status = OUTBOX_WRITER_STATUS.SENT
        record.updatedAt = this.now()
    }

    /**
     * Marks one failed delivery attempt and updates retry state.
     *
     * @param messageKey Idempotency key.
     */
    public markFailed(messageKey: string): void {
        const normalizedMessageKey = normalizeMessageKey(messageKey)
        const record = this.recordsByMessageKey.get(normalizedMessageKey)
        if (record === undefined) {
            return
        }

        if (record.status !== OUTBOX_WRITER_STATUS.PENDING) {
            return
        }

        record.retryCount += 1
        record.updatedAt = this.now()
        if (record.retryCount >= record.maxRetries) {
            record.status = OUTBOX_WRITER_STATUS.FAILED
        }
    }
}

/**
 * Converts internal mutable record into immutable snapshot.
 *
 * @param record Internal record.
 * @returns Immutable snapshot.
 */
function toReadonlyRecord(record: IMutableOutboxWriterRecord): IOutboxWriterRecord {
    return {
        messageId: record.messageId,
        messageKey: record.messageKey,
        eventType: record.eventType,
        payload: {...record.payload},
        status: record.status,
        retryCount: record.retryCount,
        maxRetries: record.maxRetries,
        createdAt: new Date(record.createdAt.getTime()),
        updatedAt: new Date(record.updatedAt.getTime()),
    }
}

/**
 * Normalizes max retries.
 *
 * @param value Raw max retries.
 * @returns Finite retry cap.
 */
function normalizeMaxRetries(value: number | undefined): number {
    if (value === undefined) {
        return DEFAULT_MAX_RETRIES
    }

    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error("maxRetries must be finite number")
    }

    const normalized = Math.trunc(value)
    if (normalized < 1) {
        throw new Error("maxRetries must be greater than zero")
    }

    return normalized
}

/**
 * Validates pending query limit.
 *
 * @param value Raw limit.
 * @returns Normalized limit.
 */
function normalizePendingLimit(value: number | undefined): number {
    if (value === undefined) {
        return UNLIMITED_PENDING
    }

    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error("limit must be finite number")
    }

    const normalized = Math.trunc(value)
    if (normalized <= 0) {
        return 0
    }

    return normalized
}

/**
 * Validates payload object and returns safe shallow copy.
 *
 * @param payload Raw payload.
 * @returns Normalized payload.
 */
function normalizePayload(payload: MessageBrokerPayload): MessageBrokerPayload {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        throw new Error("payload must be JSON object")
    }

    return {...payload}
}
