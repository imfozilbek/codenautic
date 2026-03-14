import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for rule categories.
 */
export const RULE_CATEGORY_MODEL_NAME = "RuleCategory"

/**
 * MongoDB collection name for rule categories.
 */
export const RULE_CATEGORY_COLLECTION_NAME = "rule_categories"

/**
 * Rule category persistence document shape.
 */
export interface IRuleCategorySchema {
    _id: string
    slug: string
    name: string
    description: string
    weight: number
    isActive: boolean
}

/**
 * Rule category entity schema.
 */
export const ruleCategorySchema = new Schema<IRuleCategorySchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
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
        weight: {
            type: Number,
            required: true,
            min: 0,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    {
        collection: RULE_CATEGORY_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

ruleCategorySchema.index({slug: 1}, {unique: true})
ruleCategorySchema.index({isActive: 1})

/**
 * Inferred rule category document type from mongoose schema.
 */
export type RuleCategoryDocumentShape = InferSchemaType<typeof ruleCategorySchema>
