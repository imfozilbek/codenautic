import {REVIEW_ISSUE_TICKET_STATUS} from "@codenautic/core"

import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for review issue tickets.
 */
export const REVIEW_ISSUE_TICKET_MODEL_NAME = "ReviewIssueTicket"

/**
 * MongoDB collection name for review issue tickets.
 */
export const REVIEW_ISSUE_TICKET_COLLECTION_NAME = "review_issue_tickets"

/**
 * Review issue ticket persistence document shape.
 */
export interface IReviewIssueTicketSchema {
    _id: string
    sourceReviewId: string
    sourceSuggestionIds: string[]
    filePath: string
    category: string
    occurrenceCount: number
    status: string
}

/**
 * Review issue ticket schema.
 */
export const reviewIssueTicketSchema = new Schema<IReviewIssueTicketSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        sourceReviewId: {
            type: String,
            required: true,
            trim: true,
        },
        sourceSuggestionIds: {
            type: [String],
            required: true,
            default: [],
        },
        filePath: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        occurrenceCount: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: Object.values(REVIEW_ISSUE_TICKET_STATUS),
            required: true,
            trim: true,
        },
    },
    {
        collection: REVIEW_ISSUE_TICKET_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

reviewIssueTicketSchema.index({sourceReviewId: 1})
reviewIssueTicketSchema.index({filePath: 1})
reviewIssueTicketSchema.index({status: 1})
reviewIssueTicketSchema.index({sourceSuggestionIds: 1})

/**
 * Inferred review issue ticket document type from mongoose schema.
 */
export type ReviewIssueTicketDocumentShape = InferSchemaType<typeof reviewIssueTicketSchema>
