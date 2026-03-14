import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for prompt configurations.
 */
export const PROMPT_CONFIGURATION_MODEL_NAME = "PromptConfiguration"

/**
 * MongoDB collection name for prompt configurations.
 */
export const PROMPT_CONFIGURATION_COLLECTION_NAME = "prompt_configurations"

/**
 * Prompt configuration persistence document shape.
 */
export interface IPromptConfigurationSchema {
    _id: string
    templateId: string
    name: string
    defaults: Record<string, unknown>
    overrides: Record<string, unknown>
    isGlobal: boolean
    organizationId?: string
}

/**
 * Prompt configuration schema.
 */
export const promptConfigurationSchema = new Schema<IPromptConfigurationSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        templateId: {
            type: String,
            required: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        defaults: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },
        overrides: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },
        isGlobal: {
            type: Boolean,
            required: true,
            default: true,
        },
        organizationId: {
            type: String,
            required: false,
            trim: true,
        },
    },
    {
        collection: PROMPT_CONFIGURATION_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

promptConfigurationSchema.index({templateId: 1}, {unique: true})
promptConfigurationSchema.index({name: 1, organizationId: 1})
promptConfigurationSchema.index({isGlobal: 1})

/**
 * Inferred prompt configuration document type from mongoose schema.
 */
export type PromptConfigurationDocumentShape = InferSchemaType<typeof promptConfigurationSchema>
