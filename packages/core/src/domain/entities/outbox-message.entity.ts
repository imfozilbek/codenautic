import {Entity} from "./entity"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Supported outbox message lifecycle states.
 */
export const OUTBOX_MESSAGE_STATUS = {
    PENDING: "PENDING",
    SENT: "SENT",
    FAILED: "FAILED",
} as const

/**
 * Outbox message lifecycle state.
 */
export type OutboxMessageStatus = (typeof OUTBOX_MESSAGE_STATUS)[keyof typeof OUTBOX_MESSAGE_STATUS]

/**
 * Outbox message state container.
 */
export interface IOutboxMessageProps {
    /**
     * Logical event name.
     */
    eventType: string

    /**
     * JSON payload as string.
     */
    payload: string

    /**
     * Lifecycle status.
     */
    status: OutboxMessageStatus

    /**
     * Current retry attempt.
     */
    retryCount: number

    /**
     * Maximum allowed retries.
     */
    maxRetries: number
}

/**
 * Outbox message entity for reliable event publishing.
 */
export class OutboxMessage extends Entity<IOutboxMessageProps> {
    /**
     * Creates outbox message entity.
     *
     * @param id Entity identifier.
     * @param props Message state.
     */
    public constructor(id: UniqueId, props: IOutboxMessageProps) {
        super(id, props)
        this.props.eventType = normalizeEventType(props.eventType)
        this.props.payload = normalizePayload(props.payload)
        this.props.status = normalizeOutboxStatus(props.status)
        this.props.retryCount = normalizeRetryCount(props.retryCount)
        this.props.maxRetries = normalizeMaxRetries(props.maxRetries)
        this.ensureStateIsValid()
    }

    /**
     * Event type.
     *
     * @returns Event name.
     */
    public get eventType(): string {
        return this.props.eventType
    }

    /**
     * Message payload.
     *
     * @returns JSON payload as string.
     */
    public get payload(): string {
        return this.props.payload
    }

    /**
     * Message lifecycle status.
     *
     * @returns Status.
     */
    public get status(): OutboxMessageStatus {
        return this.props.status
    }

    /**
     * Current retry counter.
     *
     * @returns Retry attempts already performed.
     */
    public get retryCount(): number {
        return this.props.retryCount
    }

    /**
     * Maximum retries allowed.
     *
     * @returns Retry cap.
     */
    public get maxRetries(): number {
        return this.props.maxRetries
    }

    /**
     * Marks message as successfully sent.
     */
    public markSent(): void {
        if (this.props.status === OUTBOX_MESSAGE_STATUS.FAILED) {
            throw new Error("Failed outbox message cannot be marked as sent")
        }

        this.props.status = OUTBOX_MESSAGE_STATUS.SENT
    }

    /**
     * Marks message as failed attempt and transitions to FAILED when retries are exhausted.
     */
    public markFailed(): void {
        if (this.props.status !== OUTBOX_MESSAGE_STATUS.PENDING) {
            return
        }

        this.props.retryCount += 1
        if (this.props.retryCount >= this.props.maxRetries) {
            this.props.status = OUTBOX_MESSAGE_STATUS.FAILED
            return
        }

        this.props.status = OUTBOX_MESSAGE_STATUS.PENDING
    }

    /**
     * Checks whether message can be retried again.
     *
     * @returns True if message is pending and retries left.
     */
    public canRetry(): boolean {
        return this.props.status === OUTBOX_MESSAGE_STATUS.PENDING && this.props.retryCount < this.props.maxRetries
    }

    /**
     * Checks whether message is in terminal sent state.
     *
     * @returns True for sent.
     */
    public isSent(): boolean {
        return this.props.status === OUTBOX_MESSAGE_STATUS.SENT
    }

    /**
     * Checks whether message is in terminal failed state.
     *
     * @returns True for failed.
     */
    public isFailed(): boolean {
        return this.props.status === OUTBOX_MESSAGE_STATUS.FAILED
    }

    private ensureStateIsValid(): void {
        if (this.props.status === OUTBOX_MESSAGE_STATUS.SENT && this.props.retryCount !== 0) {
            throw new Error("Sent outbox message cannot have retries")
        }

        if (this.props.status === OUTBOX_MESSAGE_STATUS.FAILED && this.props.retryCount <= this.props.maxRetries) {
            this.props.retryCount = this.props.maxRetries
        }
    }
}

/**
 * Normalizes event type into non-empty trimmed value.
 *
 * @param value Raw event type.
 * @returns Normalized event type.
 */
function normalizeEventType(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Outbox event type cannot be empty")
    }

    return normalized
}

/**
 * Normalizes payload and enforces JSON shape.
 *
 * @param value Raw payload string.
 * @returns Compact payload string.
 */
function normalizePayload(value: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error("Outbox payload cannot be empty")
    }

    try {
        JSON.parse(normalized)
    } catch (error) {
        throw new Error(
            error instanceof Error ? `Outbox payload must be valid JSON: ${error.message}` : "Outbox payload must be valid JSON",
        )
    }

    return normalized
}

/**
 * Normalizes retry count.
 *
 * @param value Raw retry counter.
 * @returns Normalized retry count.
 */
function normalizeRetryCount(value: number): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error("Outbox retry count must be finite number")
    }

    const normalized = Math.trunc(value)
    if (normalized < 0) {
        throw new Error("Outbox retry count cannot be negative")
    }

    return normalized
}

/**
 * Normalizes max retry count.
 *
 * @param value Raw maxRetries.
 * @returns Normalized maxRetries.
 */
function normalizeMaxRetries(value: number): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error("Outbox maxRetries must be finite number")
    }

    const normalized = Math.trunc(value)
    if (normalized < 0) {
        throw new Error("Outbox maxRetries cannot be negative")
    }

    return normalized
}

/**
 * Normalizes outbox status.
 *
 * @param value Raw status.
 * @returns Normalized status.
 */
function normalizeOutboxStatus(value: OutboxMessageStatus): OutboxMessageStatus {
    if (Object.values(OUTBOX_MESSAGE_STATUS).includes(value) === false) {
        throw new Error(`Unknown outbox status: ${String(value)}`)
    }

    return value
}
