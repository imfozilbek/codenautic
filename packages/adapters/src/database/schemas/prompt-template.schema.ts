import {
    PROMPT_TEMPLATE_CATEGORY,
    PROMPT_TEMPLATE_TYPE,
} from "@codenautic/core"

import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for prompt templates.
 */
export const PROMPT_TEMPLATE_MODEL_NAME = "PromptTemplate"

/**
 * MongoDB collection name for prompt templates.
 */
export const PROMPT_TEMPLATE_COLLECTION_NAME = "prompt_templates"

/**
 * Prompt template variable persistence shape.
 */
export interface IPromptTemplateVariableSchema {
    name: string
}

/**
 * Prompt template persistence document shape.
 */
export interface IPromptTemplateSchema {
    _id: string
    name: string
    category: string
    type: string
    content: string
    variables: IPromptTemplateVariableSchema[]
    version: number
    isGlobal: boolean
    organizationId?: string
}

/**
 * Embedded template variable schema.
 */
export const promptTemplateVariableSchema = new Schema<IPromptTemplateVariableSchema>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        _id: false,
        id: false,
        strict: "throw",
    },
)

/**
 * Prompt template schema.
 */
export const promptTemplateSchema = new Schema<IPromptTemplateSchema>(
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
        category: {
            type: String,
            enum: Object.values(PROMPT_TEMPLATE_CATEGORY),
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: Object.values(PROMPT_TEMPLATE_TYPE),
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        variables: {
            type: [promptTemplateVariableSchema],
            required: true,
            default: [],
        },
        version: {
            type: Number,
            required: true,
            min: 1,
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
        collection: PROMPT_TEMPLATE_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

promptTemplateSchema.index({name: 1, organizationId: 1})
promptTemplateSchema.index({category: 1})
promptTemplateSchema.index({isGlobal: 1})

/**
 * Inferred prompt template document type from mongoose schema.
 */
export type PromptTemplateDocumentShape = InferSchemaType<typeof promptTemplateSchema>
