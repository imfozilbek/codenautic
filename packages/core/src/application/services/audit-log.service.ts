import type {IValidationErrorField} from "../../domain/errors/validation.error"
import {ValidationError} from "../../domain/errors/validation.error"
import {UniqueId} from "../../domain/value-objects/unique-id.value-object"
import {
    type IAuditLogChange,
    type IAuditLogTarget,
    AuditLog,
} from "../../domain/entities/audit-log.entity"
import type {IAuditLogRepository} from "../ports/outbound/audit-log-repository.port"
import {Result} from "../../shared/result"

/**
 * Dependencies for audit logging service.
 */
export interface IAuditLogServiceDependencies {
    /**
     * Audit log persistence adapter.
     */
    readonly auditLogRepository: IAuditLogRepository
}

/**
 * Input payload for creating one audit entry.
 */
export interface ILogAuditInput {
    /**
     * Performed action.
     */
    readonly action: string

    /**
     * Actor identifier.
     */
    readonly actor: UniqueId

    /**
     * Target object metadata.
     */
    readonly target: IAuditLogTarget

    /**
     * Change payload.
     */
    readonly changes: readonly IAuditLogChange[]
}

/**
 * Application service for recording audit events.
 */
export class AuditLogService {
    private readonly repository: IAuditLogRepository

    /**
     * Creates audit log service.
     *
     * @param dependencies Service dependencies.
     */
    public constructor(dependencies: IAuditLogServiceDependencies) {
        this.repository = dependencies.auditLogRepository
    }

    /**
     * Logs one action and persists resulting audit entry.
     *
     * @param input Audit event payload.
     * @returns Created audit log or validation error.
     */
    public async log(
        input: ILogAuditInput,
    ): Promise<Result<AuditLog, ValidationError>> {
        const validation = this.validateInput(input)
        if (validation.isFail) {
            return Result.fail<AuditLog, ValidationError>(validation.error)
        }

        const auditLog = new AuditLog(UniqueId.create(), {
            action: input.action,
            actor: input.actor,
            target: input.target,
            changes: input.changes,
            timestamp: new Date(),
        })

        await this.repository.append(auditLog)

        return Result.ok<AuditLog, ValidationError>(auditLog)
    }

    /**
     * Validates log input.
     *
     * @param input Input payload.
     * @returns Validation result.
     */
    private validateInput(
        input: ILogAuditInput,
    ): Result<ILogAuditInput, ValidationError> {
        const fields: IValidationErrorField[] = []
        this.validateAction(input, fields)
        this.validateActor(input, fields)
        this.validateTarget(input, fields)

        if (fields.length > 0) {
            return Result.fail<ILogAuditInput, ValidationError>(
                new ValidationError("Audit log input validation failed", fields),
            )
        }

        return Result.ok<ILogAuditInput, ValidationError>(input)
    }

    /**
     * Validates action input.
     *
     * @param input Action payload.
     * @param fields Error accumulator.
     */
    private validateAction(
        input: ILogAuditInput,
        fields: IValidationErrorField[],
    ): void {
        if (input.action.trim().length === 0) {
            fields.push({
                field: "action",
                message: "action must be a non-empty string",
            })
        }
    }

    /**
     * Validates actor input.
     *
     * @param input Action payload.
     * @param fields Error accumulator.
     */
    private validateActor(
        input: ILogAuditInput,
        fields: IValidationErrorField[],
    ): void {
        if (input.actor.value.length === 0) {
            fields.push({
                field: "actor",
                message: "actor must be a valid UniqueId",
            })
        }
    }

    /**
     * Validates target input.
     *
     * @param input Action payload.
     * @param fields Error accumulator.
     */
    private validateTarget(
        input: ILogAuditInput,
        fields: IValidationErrorField[],
    ): void {
        if (
            input.target.type.trim().length === 0 ||
            input.target.id.trim().length === 0
        ) {
            fields.push({
                field: "target",
                message: "target.type and target.id must be non-empty strings",
            })
        }
    }
}
