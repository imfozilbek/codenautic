import {REVIEW_STATUS} from "@codenautic/core"

import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for reviews.
 */
export const REVIEW_MODEL_NAME = "Review"

/**
 * MongoDB collection name for reviews.
 */
export const REVIEW_COLLECTION_NAME = "reviews"

/**
 * Review issue snapshot shape stored inside review documents.
 */
export interface IReviewIssueSchema {
    id: string
    filePath: string
    lineRange: string
    severity: string
    category: string
    message: string
    suggestion?: string
    codeBlock?: string
}

/**
 * Review aggregate persistence document shape.
 */
export interface IReviewSchema {
    _id: string
    repositoryId: string
    mergeRequestId: string
    status: string
    issues: IReviewIssueSchema[]
    severityBudget: number
    consumedSeverity: number
    startedAt: Date | null
    completedAt: Date | null
    failedAt: Date | null
    failureReason: string | null
}

/**
 * Embedded issue document schema.
 */
export const reviewIssueSchema = new Schema<IReviewIssueSchema>(
    {
        id: {
            type: String,
            required: true,
            trim: true,
        },
        filePath: {
            type: String,
            required: true,
            trim: true,
        },
        lineRange: {
            type: String,
            required: true,
            trim: true,
        },
        severity: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        suggestion: {
            type: String,
            trim: true,
        },
        codeBlock: {
            type: String,
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
 * Review aggregate schema.
 */
export const reviewSchema = new Schema<IReviewSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        repositoryId: {
            type: String,
            required: true,
            trim: true,
        },
        mergeRequestId: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(REVIEW_STATUS),
            required: true,
            trim: true,
        },
        issues: {
            type: [reviewIssueSchema],
            required: true,
            default: [],
        },
        severityBudget: {
            type: Number,
            required: true,
            min: 0,
        },
        consumedSeverity: {
            type: Number,
            required: true,
            min: 0,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        failedAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        collection: REVIEW_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

reviewSchema.index({mergeRequestId: 1}, {unique: true})
reviewSchema.index({status: 1})
reviewSchema.index({repositoryId: 1})
reviewSchema.index({completedAt: 1})

/**
 * Inferred review document type from mongoose schema.
 */
export type ReviewDocumentShape = InferSchemaType<typeof reviewSchema>
