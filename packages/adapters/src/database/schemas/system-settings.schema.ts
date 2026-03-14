import {Schema, type InferSchemaType} from "mongoose"

/**
 * Mongoose model name for system settings.
 */
export const SYSTEM_SETTINGS_MODEL_NAME = "SystemSetting"

/**
 * MongoDB collection name for system settings.
 */
export const SYSTEM_SETTINGS_COLLECTION_NAME = "system_settings"

/**
 * System setting persistence document shape.
 */
export interface ISystemSettingSchema {
    _id: string
    key: string
    value: unknown
}

/**
 * System setting schema.
 */
export const systemSettingSchema = new Schema<ISystemSettingSchema>(
    {
        _id: {
            type: String,
            required: true,
            trim: true,
        },
        key: {
            type: String,
            required: true,
            trim: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    {
        collection: SYSTEM_SETTINGS_COLLECTION_NAME,
        strict: "throw",
        timestamps: true,
        versionKey: false,
    },
)

systemSettingSchema.index({key: 1}, {unique: true})

/**
 * Inferred system setting document type from mongoose schema.
 */
export type SystemSettingDocumentShape = InferSchemaType<typeof systemSettingSchema>
