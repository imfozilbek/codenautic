import {Entity} from "./entity"
import {UniqueId} from "../value-objects/unique-id.value-object"

/**
 * Supported task statuses.
 */
export const TASK_STATUS = {
    PENDING: "PENDING",
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const

/**
 * Task lifecycle status type.
 */
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

/**
 * Task state container.
 */
export interface ITaskProps {
    type: string
    status: TaskStatus
    progress: number
    metadata: Record<string, unknown>
    result?: unknown
    error?: unknown
}

/**
 * Task entity for long-running async operations.
 */
export class Task extends Entity<ITaskProps> {
    /**
     * Creates task entity.
     *
 * @param id Entity identifier.
     * @param props Task state.
     */
    public constructor(id: UniqueId, props: ITaskProps) {
        super(id, props)
        this.props.type = normalizeRequiredText(props.type, "Task type cannot be empty")
        this.props.status = normalizeTaskStatus(props.status)
        this.props.progress = normalizeProgress(props.progress)
        this.props.metadata = normalizeMetadata(props.metadata)
        this.props.result = props.result
        this.props.error = props.error
        this.ensureStateIsValid()
    }

    /**
     * Task type.
     *
     * @returns Task type.
     */
    public get type(): string {
        return this.props.type
    }

    /**
     * Task lifecycle status.
     *
     * @returns Current status.
     */
    public get status(): TaskStatus {
        return this.props.status
    }

    /**
     * Progress in percent.
     *
     * @returns Progress value from 0 to 100.
     */
    public get progress(): number {
        return this.props.progress
    }

    /**
     * Task metadata.
     *
     * @returns Metadata snapshot.
     */
    public get metadata(): Record<string, unknown> {
        return {...this.props.metadata}
    }

    /**
     * Task result.
     *
     * @returns Result payload.
     */
    public get result(): unknown {
        return this.props.result
    }

    /**
     * Task execution error.
     *
     * @returns Error payload.
     */
    public get error(): unknown {
        return this.props.error
    }

    /**
     * Starts task execution.
     *
     * @returns Updated task.
     */
    public start(): void {
        if (this.props.status !== TASK_STATUS.PENDING) {
            throw new Error(`Cannot start task in status ${this.props.status}`)
        }

        this.props.status = TASK_STATUS.RUNNING
        this.props.progress = 0
        this.props.error = undefined
        this.props.result = undefined
    }

    /**
     * Updates progress for running task.
     *
     * @param value Progress value from 0 to 100.
     */
    public updateProgress(value: number): void {
        if (this.props.status !== TASK_STATUS.RUNNING) {
            throw new Error("Cannot update progress for non-running task")
        }

        this.props.progress = normalizeProgress(value)
    }

    /**
     * Marks task as completed and stores optional result.
     *
     * @param result Optional completion result.
     */
    public complete(result?: unknown): void {
        if (
            this.props.status !== TASK_STATUS.PENDING &&
            this.props.status !== TASK_STATUS.RUNNING
        ) {
            throw new Error(`Cannot complete task in status ${this.props.status}`)
        }

        this.props.status = TASK_STATUS.COMPLETED
        this.props.progress = 100
        this.props.result = result
        this.props.error = undefined
    }

    /**
     * Marks task as failed and stores error.
     *
     * @param reason Failure reason.
     */
    public fail(reason?: unknown): void {
        if (
            this.props.status !== TASK_STATUS.PENDING &&
            this.props.status !== TASK_STATUS.RUNNING
        ) {
            throw new Error(`Cannot fail task in status ${this.props.status}`)
        }

        this.props.status = TASK_STATUS.FAILED
        this.props.error = reason
        this.props.result = undefined
        this.props.progress = 100
    }

    /**
     * Ensures task invariants.
     *
     * @throws Error When state is invalid.
     */
    private ensureStateIsValid(): void {
        if (this.props.status === TASK_STATUS.COMPLETED && this.props.progress < 100) {
            throw new Error("Completed task progress must be 100")
        }

        if (this.props.status !== TASK_STATUS.FAILED && this.props.error !== undefined) {
            throw new Error("Only failed task can contain error")
        }

        if (this.props.status === TASK_STATUS.FAILED && this.props.progress < 100) {
            throw new Error("Failed task progress must be 100")
        }
    }
}

/**
 * Validates required text value.
 *
 * @param value Raw value.
 * @param errorMessage Error message.
 * @returns Normalized value.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(errorMessage)
    }

    return normalized
}

/**
 * Validates status literal.
 *
 * @param value Raw status.
 * @returns Normalized status.
 */
function normalizeTaskStatus(value: TaskStatus): TaskStatus {
    if (Object.values(TASK_STATUS).includes(value) === false) {
        throw new Error(`Unknown task status: ${String(value)}`)
    }
    return value
}

/**
 * Validates progress value.
 *
 * @param value Raw progress.
 * @returns Normalized number.
 */
function normalizeProgress(value: number): number {
    if (Number.isNaN(value) || Number.isFinite(value) === false) {
        throw new Error("Task progress must be finite number")
    }
    if (value < 0 || value > 100) {
        throw new Error("Task progress must be between 0 and 100")
    }

    return value
}

/**
 * Validates metadata payload.
 *
 * @param metadata Raw metadata.
 * @returns Metadata object.
 */
function normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return {...metadata}
}
