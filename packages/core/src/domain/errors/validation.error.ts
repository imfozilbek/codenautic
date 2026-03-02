import {DomainError} from "./domain.error"

/**
 * Field-level validation detail.
 */
export interface IValidationErrorField {
    readonly field: string
    readonly message: string
}

/**
 * Domain error for invalid input payload.
 */
export class ValidationError extends DomainError {
    public readonly code = "VALIDATION_ERROR"
    public readonly fields: readonly IValidationErrorField[]

    /**
     * Creates validation error.
     *
     * @param message Summary message.
     * @param fields Field validation details.
     * @param cause Optional upstream error cause.
     */
    public constructor(message: string, fields: readonly IValidationErrorField[], cause?: Error) {
        super(message, cause)
        this.fields = Object.freeze([...fields])
    }

    /**
     * Serializes validation error including field-level details.
     *
     * @returns Serializable error payload.
     */
    public override serialize(): {
        readonly code: string
        readonly message: string
        readonly timestamp: Date
        readonly cause?: string
        readonly fields: readonly IValidationErrorField[]
    } {
        const serialized = super.serialize()
        return {
            ...serialized,
            fields: this.fields,
        }
    }
}
