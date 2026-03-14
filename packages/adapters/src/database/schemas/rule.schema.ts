import {RULE_STATUS} from "@codenautic/core"

import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for rules.
 */
export const RULE_MODEL_NAME = "Rule"

/**
 * MongoDB collection name for rules.
 */
export const RULE_COLLECTION_NAME = "rules"

/**
 * Rule aggregate persistence document shape.
 */
export interface IRuleSchema {
    _id: string
    name: string
    description: string
    expression: string
    status: string
    activatedAt: Date | null
    deactivatedAt: Date | null
    archivedAt: Date | null
}

/**
 * Rule aggregate schema.
 */
export const ruleSchema = new Schema<IRuleSchema>(
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
        description: {
            type: String,
            required: true,
            trim: true,
        },
        expression: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(RULE_STATUS),
            required: true,
            trim: true,
        },
        activatedAt: {
            type: Date,
            default: null,
        },
        deactivatedAt: {
            type: Date,
            default: null,
        },
        archivedAt: {
            type: Date,
            default: null,
        },
    },
    {
        collection: RULE_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

ruleSchema.index({status: 1})
ruleSchema.index({name: 1})

/**
 * Inferred rule document type from mongoose schema.
 */
export type RuleDocumentShape = InferSchemaType<typeof ruleSchema>
