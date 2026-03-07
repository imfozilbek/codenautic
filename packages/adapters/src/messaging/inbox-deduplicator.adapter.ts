import {UniqueId} from "@codenautic/core"

import {normalizeEventType, normalizeMessageKey} from "./messaging-normalization"

/**
 * Input payload for inbox deduplication.
 */
export interface IInboxDeduplicatorInput {
    /**
     * Stable external message key.
     */
    readonly messageKey: string

    /**
     * Logical event type.
     */
    readonly eventType: string
}

/**
 * Stored inbox deduplication record.
 */
export interface IInboxDeduplicatorRecord {
    /**
     * Internal generated id.
     */
    readonly messageId: string

    /**
     * Stable external message key.
     */
    readonly messageKey: string

    /**
     * Event type of first seen message.
     */
    readonly eventType: string

    /**
     * First processing timestamp.
     */
    readonly processedAt: Date
}

/**
 * Deduplication process result.
 */
export interface IInboxDeduplicatorResult {
    /**
     * True when key was already processed before.
     */
    readonly isDuplicate: boolean

    /**
     * Stored deduplication record.
     */
    readonly record: IInboxDeduplicatorRecord
}

interface IMutableInboxDeduplicatorRecord {
    messageId: string
    messageKey: string
    eventType: string
    processedAt: Date
}

/**
 * Minimal in-memory inbox deduplicator by message key.
 */
export class InboxDeduplicator {
    private readonly recordsByMessageKey: Map<string, IMutableInboxDeduplicatorRecord>
    private readonly now: () => Date

    /**
     * Creates inbox deduplicator instance.
     *
     * @param now Deterministic clock for tests.
     */
    public constructor(now: () => Date = () => new Date()) {
        this.recordsByMessageKey = new Map<string, IMutableInboxDeduplicatorRecord>()
        this.now = now
    }

    /**
     * Checks whether message key was already processed.
     *
     * @param messageKey External message key.
     * @returns True for duplicates.
     */
    public isDuplicate(messageKey: string): boolean {
        const normalizedMessageKey = normalizeMessageKey(messageKey)
        return this.recordsByMessageKey.has(normalizedMessageKey)
    }

    /**
     * Processes message idempotently by key.
     *
     * @param input Deduplication input.
     * @returns Deduplication result.
     */
    public process(input: IInboxDeduplicatorInput): IInboxDeduplicatorResult {
        const messageKey = normalizeMessageKey(input.messageKey)
        const existing = this.recordsByMessageKey.get(messageKey)
        if (existing !== undefined) {
            return {
                isDuplicate: true,
                record: toReadonlyRecord(existing),
            }
        }

        const record: IMutableInboxDeduplicatorRecord = {
            messageId: UniqueId.create().value,
            messageKey,
            eventType: normalizeEventType(input.eventType),
            processedAt: this.now(),
        }
        this.recordsByMessageKey.set(messageKey, record)

        return {
            isDuplicate: false,
            record: toReadonlyRecord(record),
        }
    }

    /**
     * Finds stored record by message key.
     *
     * @param messageKey External message key.
     * @returns Stored record or null.
     */
    public findByMessageKey(messageKey: string): IInboxDeduplicatorRecord | null {
        const normalizedMessageKey = normalizeMessageKey(messageKey)
        const existing = this.recordsByMessageKey.get(normalizedMessageKey)
        if (existing === undefined) {
            return null
        }

        return toReadonlyRecord(existing)
    }
}

/**
 * Converts mutable record into immutable snapshot.
 *
 * @param record Mutable stored record.
 * @returns Immutable snapshot.
 */
function toReadonlyRecord(record: IMutableInboxDeduplicatorRecord): IInboxDeduplicatorRecord {
    return {
        messageId: record.messageId,
        messageKey: record.messageKey,
        eventType: record.eventType,
        processedAt: new Date(record.processedAt.getTime()),
    }
}
