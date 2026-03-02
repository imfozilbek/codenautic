import {DomainError} from "./domain.error"

/**
 * Error thrown when unique identifier value is invalid.
 */
export class InvalidUniqueIdError extends DomainError {
    public static readonly CODE = "INVALID_UNIQUE_ID"
    public readonly code = InvalidUniqueIdError.CODE

    /**
     * Creates invalid unique id error.
     *
     * @param message Error description.
     */
    public constructor(message = "UniqueId cannot be empty") {
        super(message)
    }
}
