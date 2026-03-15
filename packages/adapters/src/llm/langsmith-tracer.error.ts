/**
 * Typed error codes for LangSmith tracer failures.
 */
export const LANGSMITH_TRACER_ERROR_CODE = {
    INVALID_CLIENT: "INVALID_CLIENT",
    INVALID_PROJECT_NAME: "INVALID_PROJECT_NAME",
    INVALID_RUN_NAME: "INVALID_RUN_NAME",
    INVALID_RUN_ID: "INVALID_RUN_ID",
    CREATE_RUN_FAILED: "CREATE_RUN_FAILED",
    UPDATE_RUN_FAILED: "UPDATE_RUN_FAILED",
} as const

/**
 * LangSmith tracer error code literal.
 */
export type LangSmithTracerErrorCode =
    (typeof LANGSMITH_TRACER_ERROR_CODE)[keyof typeof LANGSMITH_TRACER_ERROR_CODE]

/**
 * Structured metadata for LangSmith tracer failures.
 */
export interface ILangSmithTracerErrorDetails {
    /**
     * Original lower-level error message when available.
     */
    readonly causeMessage?: string
}

/**
 * Error thrown by LangSmith tracer.
 */
export class LangSmithTracerError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: LangSmithTracerErrorCode

    /**
     * Original lower-level error message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates LangSmith tracer error.
     *
     * @param code Stable machine-readable error code.
     * @param details Optional normalized metadata.
     */
    public constructor(
        code: LangSmithTracerErrorCode,
        details: ILangSmithTracerErrorDetails = {},
    ) {
        super(buildLangSmithTracerErrorMessage(code))
        this.name = "LangSmithTracerError"
        this.code = code
        this.causeMessage = details.causeMessage
    }
}

/**
 * Builds public error message for tracer error code.
 *
 * @param code Error code.
 * @returns Public error message.
 */
function buildLangSmithTracerErrorMessage(code: LangSmithTracerErrorCode): string {
    switch (code) {
        case LANGSMITH_TRACER_ERROR_CODE.INVALID_CLIENT:
            return "LangSmith tracer requires client with createRun and updateRun methods"
        case LANGSMITH_TRACER_ERROR_CODE.INVALID_PROJECT_NAME:
            return "LangSmith tracer project name cannot be empty"
        case LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_NAME:
            return "LangSmith tracer run name cannot be empty"
        case LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_ID:
            return "LangSmith tracer run id cannot be empty"
        case LANGSMITH_TRACER_ERROR_CODE.CREATE_RUN_FAILED:
            return "LangSmith tracer failed to create run"
        case LANGSMITH_TRACER_ERROR_CODE.UPDATE_RUN_FAILED:
            return "LangSmith tracer failed to update run"
    }
}
