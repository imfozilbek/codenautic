import {Task, type ITaskProps, type TaskStatus, TASK_STATUS} from "../entities/task.entity"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating task.
 */
export interface ICreateTaskProps {
    readonly type: string
    readonly metadata?: Record<string, unknown>
}

/**
 * Snapshot for task restoration.
 */
export interface IReconstituteTaskProps {
    readonly id: string
    readonly type: string
    readonly status: TaskStatus
    readonly progress: number
    readonly metadata: Record<string, unknown>
    readonly result?: unknown
    readonly error?: unknown
}

/**
 * Task entity factory.
 */
export class TaskFactory implements IEntityFactory<Task, ICreateTaskProps, IReconstituteTaskProps> {
    /**
     * Creates new task entity.
     *
     * @param input Creation input.
     * @returns New task.
     */
    public create(input: ICreateTaskProps): Task {
        const props: ITaskProps = {
            type: input.type,
            status: TASK_STATUS.PENDING,
            progress: 0,
            metadata: input.metadata ?? {},
        }

        return new Task(UniqueId.create(), props)
    }

    /**
     * Restores task from persistence snapshot.
     *
     * @param input Snapshot payload.
     * @returns Restored task.
     */
    public reconstitute(input: IReconstituteTaskProps): Task {
        const props: ITaskProps = {
            type: input.type,
            status: input.status,
            progress: input.progress,
            metadata: input.metadata,
            result: input.result,
            error: input.error,
        }

        return new Task(UniqueId.create(input.id), props)
    }
}
