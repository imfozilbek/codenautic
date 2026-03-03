import type {UniqueId} from "../../../domain/value-objects/unique-id.value-object"
import type {AuditLog} from "../../../domain/entities/audit-log.entity"

/**
 * Pagination options for audit log queries.
 */
export interface IAuditLogPaginationOptions {
    /**
     * 1-based page index.
     */
    readonly page?: number

    /**
     * Items per page.
     */
    readonly pageSize?: number
}

/**
 * Outbound persistence contract for audit logs.
 */
export interface IAuditLogRepository {
    /**
     * Persists audit entry.
     *
     * @param log Audit log entry.
     */
    append(log: AuditLog): Promise<void>

    /**
     * Finds logs by actor.
     *
     * @param actorId Actor identifier.
     * @param options Pagination options.
     * @returns Matching audit logs.
     */
    findByActor(
        actorId: UniqueId,
        options?: IAuditLogPaginationOptions,
    ): Promise<readonly AuditLog[]>

    /**
     * Finds logs by target entity.
     *
     * @param targetType Target object type.
     * @param targetId Target identifier.
     * @param options Pagination options.
     * @returns Matching audit logs.
     */
    findByTarget(
        targetType: string,
        targetId: string,
        options?: IAuditLogPaginationOptions,
    ): Promise<readonly AuditLog[]>

    /**
     * Finds logs by time range.
     *
     * @param from Start timestamp.
     * @param to End timestamp.
     * @param options Pagination options.
     * @returns Matching audit logs.
     */
    findByDateRange(
        from: Date,
        to: Date,
        options?: IAuditLogPaginationOptions,
    ): Promise<readonly AuditLog[]>
}
