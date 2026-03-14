import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for expert panels.
 */
export const EXPERT_PANEL_MODEL_NAME = "ExpertPanel"

/**
 * MongoDB collection name for expert panels.
 */
export const EXPERT_PANEL_COLLECTION_NAME = "expert_panels"

/**
 * Expert snapshot shape.
 */
export interface IExpertSchema {
    name: string
    role: string
    responsibilities: string[]
    priority: number
}

/**
 * Expert panel persistence document shape.
 */
export interface IExpertPanelSchema {
    _id: string
    name: string
    experts: IExpertSchema[]
    decisionProcess?: string
}

/**
 * Embedded expert schema.
 */
export const expertSchema = new Schema<IExpertSchema>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            required: true,
            trim: true,
        },
        responsibilities: {
            type: [String],
            required: true,
            default: [],
        },
        priority: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        _id: false,
        id: false,
        strict: "throw",
    },
)

/**
 * Expert panel schema.
 */
export const expertPanelSchema = new Schema<IExpertPanelSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        experts: {
            type: [expertSchema],
            required: true,
            default: [],
        },
        decisionProcess: {
            type: String,
            required: false,
            trim: true,
        },
    },
    {
        collection: EXPERT_PANEL_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

expertPanelSchema.index({name: 1}, {unique: true})

/**
 * Inferred expert panel document type from mongoose schema.
 */
export type ExpertPanelDocumentShape = InferSchemaType<typeof expertPanelSchema>
