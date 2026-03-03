import {UniqueId} from "../value-objects/unique-id.value-object"
import {Entity} from "./entity"

/**
 * Audit log target metadata.
 */
export interface IAuditLogTarget {
    /**
     * Target aggregate/object type.
     */
    readonly type: string

    /**
     * Target aggregate/object identifier.
     */
    readonly id: string
}

/**
 * Single audit change entry.
 */
export interface IAuditLogChange {
    /**
     * Modified field name.
     */
    readonly field: string

    /**
     * Old value before change.
     */
    readonly oldValue: unknown

    /**
     * New value after change.
     */
    readonly newValue: unknown
}

/**
 * Internal audit log state.
 */
export interface IAuditLogProps {
    /**
     * Action label.
     */
    readonly action: string

    /**
     * Actor who executed the action.
     */
    readonly actor: UniqueId

    /**
     * Target object of the action.
     */
    readonly target: IAuditLogTarget

    /**
     * Changes list.
     */
    readonly changes: readonly IAuditLogChange[]

    /**
     * Log event timestamp.
     */
    readonly timestamp: Date
}

/**
 * Audit log entity with immutable metadata.
 */
export class AuditLog extends Entity<IAuditLogProps> {
    /**
     * Creates audit log entity.
     *
     * @param id Entity identifier.
     * @param props Audit log props.
     * @throws Error when input shape is invalid.
     */
    public constructor(id: UniqueId, props: IAuditLogProps) {
        super(id, normalizeAuditLogProps(props))
    }

    /**
     * Performed action.
     *
     * @returns Action name.
     */
    public get action(): string {
        return this.props.action
    }

    /**
     * Actor identifier.
     *
     * @returns Actor unique id.
     */
    public get actor(): UniqueId {
        return this.props.actor
    }

    /**
     * Target metadata.
     *
     * @returns Target type and id.
     */
    public get target(): IAuditLogTarget {
        return {
            type: this.props.target.type,
            id: this.props.target.id,
        }
    }

    /**
     * Change list.
     *
     * @returns Changes snapshot.
     */
    public get changes(): readonly IAuditLogChange[] {
        return [...this.props.changes]
    }

    /**
     * Event timestamp.
     *
 * @returns Timestamp copy.
     */
    public get timestamp(): Date {
        return new Date(this.props.timestamp)
    }
}

/**
 * Normalizes and validates audit log props before initialization.
 *
 * @param props Raw props.
 * @returns Normalized props.
 */
function normalizeAuditLogProps(props: IAuditLogProps): IAuditLogProps {
    return {
        action: normalizeAction(props.action),
        actor: props.actor,
        target: normalizeTarget(props.target),
        changes: normalizeChanges(props.changes),
        timestamp: cloneTimestamp(props.timestamp),
    }
}

/**
 * Normalize and validate action string.
 *
 * @param action Raw action value.
 * @returns Normalized action.
 */
function normalizeAction(action: string): string {
    if (isValidString(action) === false) {
        throw new Error("Audit log action cannot be empty")
    }

    return action.trim()
}

/**
 * Normalize and validate target metadata.
 *
 * @param target Raw target.
 * @returns Normalized target.
 */
function normalizeTarget(target: IAuditLogTarget): IAuditLogTarget {
    if (
        isValidString(target.type) === false ||
        isValidString(target.id) === false
    ) {
        throw new Error("Audit log target must have non-empty type and id")
    }

    return {
        type: target.type.trim(),
        id: target.id.trim(),
    }
}

/**
 * Normalizes and validates change list.
 *
 * @param changes Raw change entries.
 * @returns Normalized list.
 */
function normalizeChanges(changes: readonly IAuditLogChange[]): readonly IAuditLogChange[] {
    return changes.map((change) => {
        if (isValidString(change.field) === false) {
            throw new Error("Audit log change field cannot be empty")
        }

        return {
            field: change.field.trim(),
            oldValue: change.oldValue,
            newValue: change.newValue,
        }
    })
}

/**
 * Clones timestamp with validation.
 *
 * @param timestamp Raw timestamp.
 * @returns Cloned timestamp.
 */
function cloneTimestamp(timestamp: Date): Date {
    const value = new Date(timestamp)
    if (Number.isNaN(value.getTime())) {
        throw new Error("Audit log timestamp must be valid date")
    }

    return value
}

/**
 * Checks for non-empty string value.
 *
 * @param value Raw value.
 * @returns True when trimmed value is non-empty.
 */
function isValidString(value: string): boolean {
    return typeof value === "string" && value.trim().length > 0
}
