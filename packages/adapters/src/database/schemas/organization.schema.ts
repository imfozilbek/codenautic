import {API_KEY_STATUS, ORG_SETTING_VALUE_TYPE} from "@codenautic/core"

import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for organizations.
 */
export const ORGANIZATION_MODEL_NAME = "Organization"

/**
 * MongoDB collection name for organizations.
 */
export const ORGANIZATION_COLLECTION_NAME = "organizations"

/**
 * Organization member snapshot shape.
 */
export interface IOrganizationMemberSchema {
    userId: string
    role: string
}

/**
 * Organization API key snapshot shape.
 */
export interface IOrganizationApiKeySchema {
    id: string
    provider: string
    keyId: string
    status: string
    createdAt: Date
}

/**
 * Organization aggregate persistence document shape.
 */
export interface IOrganizationSchema {
    _id: string
    name: string
    ownerId: string
    settings: Map<string, unknown>
    apiKeys: IOrganizationApiKeySchema[]
    byokEnabled: boolean
    members: IOrganizationMemberSchema[]
}

/**
 * Embedded organization member schema.
 */
export const organizationMemberSchema = new Schema<IOrganizationMemberSchema>(
    {
        userId: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
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
 * Embedded API key schema.
 */
export const organizationApiKeySchema = new Schema<IOrganizationApiKeySchema>(
    {
        id: {
            type: String,
            required: true,
            trim: true,
        },
        provider: {
            type: String,
            required: true,
            trim: true,
        },
        keyId: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(API_KEY_STATUS),
            required: true,
            trim: true,
        },
        createdAt: {
            type: Date,
            required: true,
        },
    },
    {
        _id: false,
        id: false,
        strict: "throw",
    },
)

/**
 * Organization aggregate schema.
 */
export const organizationSchema = new Schema<IOrganizationSchema>(
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
        ownerId: {
            type: String,
            required: true,
            trim: true,
        },
        settings: {
            type: Map,
            of: Schema.Types.Mixed,
            required: true,
            default: {},
            validate: {
                validator(value: Map<string, unknown> | Record<string, unknown>): boolean {
                    return isOrganizationSettingsMapValid(value)
                },
                message: "Organization settings values must be string, number, or boolean",
            },
        },
        apiKeys: {
            type: [organizationApiKeySchema],
            required: true,
            default: [],
        },
        byokEnabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        members: {
            type: [organizationMemberSchema],
            required: true,
            default: [],
        },
    },
    {
        collection: ORGANIZATION_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

organizationSchema.index({ownerId: 1})
organizationSchema.index({"members.userId": 1})
organizationSchema.index({name: 1})

/**
 * Inferred organization document type from mongoose schema.
 */
export type OrganizationDocumentShape = InferSchemaType<typeof organizationSchema>

/**
 * Validates supported organization setting value type.
 *
 * @param value Raw setting value.
 * @returns True when value is string/number/boolean.
 */
function isPrimitiveSettingValue(value: unknown): boolean {
    return (
        typeof value === ORG_SETTING_VALUE_TYPE.BOOLEAN ||
        typeof value === ORG_SETTING_VALUE_TYPE.NUMBER ||
        typeof value === ORG_SETTING_VALUE_TYPE.STRING
    )
}

/**
 * Validates settings map payload.
 *
 * @param value Settings map or plain object.
 * @returns True when payload is valid.
 */
function isOrganizationSettingsMapValid(
    value: Map<string, unknown> | Record<string, unknown>,
): boolean {
    const entries = value instanceof Map ? [...value.entries()] : Object.entries(value)
    for (const [key, rawValue] of entries) {
        if (key.trim().length === 0) {
            return false
        }
        if (!isPrimitiveSettingValue(rawValue)) {
            return false
        }
    }
    return true
}
