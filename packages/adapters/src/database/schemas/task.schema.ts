import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for tasks.
 */
export const TASK_MODEL_NAME = "Task"

/**
 * MongoDB collection name for tasks.
 */
export const TASK_COLLECTION_NAME = "tasks"

/**
 * Supported task lifecycle values in persistence.
 */
export const TASK_STATUS_VALUES = [
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "FAILED",
] as const

/**
 * Task persistence document shape.
 */
export interface ITaskSchema {
    _id: string
    type: string
    status: (typeof TASK_STATUS_VALUES)[number]
    progress: number
    metadata: Record<string, unknown>
    result?: unknown
    error?: unknown
}

/**
 * Task entity schema.
 */
export const taskSchema = new Schema<ITaskSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: TASK_STATUS_VALUES,
            required: true,
            trim: true,
        },
        progress: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        metadata: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },
        result: {
            type: Schema.Types.Mixed,
            required: false,
        },
        error: {
            type: Schema.Types.Mixed,
            required: false,
        },
    },
    {
        collection: TASK_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

taskSchema.index({status: 1})
taskSchema.index({type: 1})
taskSchema.index({updatedAt: 1})

/**
 * Inferred task document type from mongoose schema.
 */
export type TaskDocumentShape = InferSchemaType<typeof taskSchema>
