import {
    toMessageBrokerEnvelope,
    type IMessageBroker,
    type IOutboxRelayResult,
    type IOutboxRelayService,
    type IOutboxRepository,
} from "@codenautic/core"

const DEFAULT_MAX_ATTEMPTS_PER_RUN = 3
const DEFAULT_INITIAL_BACKOFF_MS = 200
const DEFAULT_BACKOFF_MULTIPLIER = 2

/**
 * Sleep function used for retry backoff.
 */
export type OutboxRelaySleep = (delayMs: number) => Promise<void>

/**
 * Constructor options for outbox relay service implementation.
 */
export interface IOutboxRelayServiceImplOptions {
    /**
     * Outbox repository implementation.
     */
    readonly outboxRepository: IOutboxRepository

    /**
     * Message broker implementation.
     */
    readonly messageBroker: IMessageBroker

    /**
     * Relay batch size.
     */
    readonly batchSize: number

    /**
     * Maximum delivery attempts per message within a single relay run.
     */
    readonly maxAttemptsPerRun?: number

    /**
     * Initial retry backoff in milliseconds.
     */
    readonly initialBackoffMs?: number

    /**
     * Exponential backoff multiplier.
     */
    readonly backoffMultiplier?: number

    /**
     * Optional sleep implementation for tests.
     */
    readonly sleep?: OutboxRelaySleep
}

/**
 * Adapter-level outbox relay service with retry/backoff support.
 */
export class OutboxRelayServiceImpl implements IOutboxRelayService {
    private readonly outboxRepository: IOutboxRepository
    private readonly messageBroker: IMessageBroker
    private readonly batchSize: number
    private readonly maxAttemptsPerRun: number
    private readonly initialBackoffMs: number
    private readonly backoffMultiplier: number
    private readonly sleep: OutboxRelaySleep

    /**
     * Creates relay service instance.
     *
     * @param options Relay dependencies.
     */
    public constructor(options: IOutboxRelayServiceImplOptions) {
        this.outboxRepository = options.outboxRepository
        this.messageBroker = options.messageBroker
        this.batchSize = normalizePositiveInteger(options.batchSize, "batchSize")
        this.maxAttemptsPerRun = normalizePositiveInteger(
            options.maxAttemptsPerRun ?? DEFAULT_MAX_ATTEMPTS_PER_RUN,
            "maxAttemptsPerRun",
        )
        this.initialBackoffMs = normalizeNonNegativeInteger(
            options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS,
            "initialBackoffMs",
        )
        this.backoffMultiplier = normalizePositiveFinite(
            options.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER,
            "backoffMultiplier",
        )
        this.sleep = options.sleep ?? defaultSleep
    }

    /**
     * Runs a relay batch with per-message retry/backoff policy.
     *
     * @returns Relay summary.
     */
    public async relay(): Promise<IOutboxRelayResult> {
        const messages = await this.outboxRepository.findPending(this.batchSize)
        const result: IOutboxRelayResult = {
            total: messages.length,
            sent: 0,
            failed: 0,
            retriable: 0,
            permanentlyFailed: 0,
        }

        for (const message of messages) {
            await this.relaySingleMessage(message, result)
        }

        return result
    }

    /**
     * Relays single message with retries.
     *
     * @param message Pending outbox message.
     * @param result Accumulated batch result.
     */
    private async relaySingleMessage(
        message: Parameters<IOutboxRepository["save"]>[0],
        result: IOutboxRelayResult,
    ): Promise<void> {
        let attempt = 0
        while (attempt < this.maxAttemptsPerRun) {
            try {
                const envelope = toMessageBrokerEnvelope(message)
                await this.messageBroker.publish(envelope.eventType, envelope.payload)
                message.markSent()
                await this.outboxRepository.markSent(message.id)
                result.sent += 1
                return
            } catch {
                message.markFailed()

                if (message.isFailed()) {
                    await this.outboxRepository.markFailed(message.id)
                    result.failed += 1
                    result.permanentlyFailed += 1
                    return
                }

                await this.outboxRepository.save(message)
                attempt += 1
                if (attempt >= this.maxAttemptsPerRun || message.canRetry() === false) {
                    result.failed += 1
                    result.retriable += 1
                    return
                }

                await this.sleep(this.calculateBackoff(attempt))
            }
        }
    }

    /**
     * Calculates exponential backoff for retry attempt.
     *
     * @param retryAttempt Retry attempt number starting from 1.
     * @returns Delay in milliseconds.
     */
    private calculateBackoff(retryAttempt: number): number {
        const multiplier = Math.pow(this.backoffMultiplier, retryAttempt - 1)
        return Math.trunc(this.initialBackoffMs * multiplier)
    }
}

/**
 * Default sleep implementation.
 *
 * @param delayMs Delay in milliseconds.
 * @returns Promise resolved after timeout.
 */
function defaultSleep(delayMs: number): Promise<void> {
    return new Promise((resolve): void => {
        setTimeout(resolve, delayMs)
    })
}

/**
 * Validates positive finite integer value.
 *
 * @param value Raw numeric value.
 * @param fieldName Field name for error message.
 * @returns Normalized integer value.
 */
function normalizePositiveInteger(value: number, fieldName: string): number {
    const normalized = normalizeFiniteInteger(value, fieldName)
    if (normalized < 1) {
        throw new Error(`${fieldName} must be greater than zero`)
    }

    return normalized
}

/**
 * Validates non-negative finite integer value.
 *
 * @param value Raw numeric value.
 * @param fieldName Field name for error message.
 * @returns Normalized integer value.
 */
function normalizeNonNegativeInteger(value: number, fieldName: string): number {
    const normalized = normalizeFiniteInteger(value, fieldName)
    if (normalized < 0) {
        throw new Error(`${fieldName} must be greater or equal to zero`)
    }

    return normalized
}

/**
 * Validates positive finite number.
 *
 * @param value Raw numeric value.
 * @param fieldName Field name for error message.
 * @returns Original finite number.
 */
function normalizePositiveFinite(value: number, fieldName: string): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error(`${fieldName} must be finite number`)
    }
    if (value <= 0) {
        throw new Error(`${fieldName} must be greater than zero`)
    }

    return value
}

/**
 * Validates finite integer value.
 *
 * @param value Raw numeric value.
 * @param fieldName Field name for error message.
 * @returns Normalized integer value.
 */
function normalizeFiniteInteger(value: number, fieldName: string): number {
    if (Number.isFinite(value) === false || Number.isNaN(value)) {
        throw new Error(`${fieldName} must be finite number`)
    }

    return Math.trunc(value)
}
