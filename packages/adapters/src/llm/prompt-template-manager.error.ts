/**
 * Typed error codes for prompt template manager failures.
 */
export const PROMPT_TEMPLATE_MANAGER_ERROR_CODE = {
    INVALID_TEMPLATE_NAME: "INVALID_TEMPLATE_NAME",
    INVALID_TEMPLATE_CONTENT: "INVALID_TEMPLATE_CONTENT",
    TEMPLATE_ALREADY_EXISTS: "TEMPLATE_ALREADY_EXISTS",
    TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
    MISSING_VARIABLE: "MISSING_VARIABLE",
} as const

/**
 * Prompt template manager error code literal.
 */
export type PromptTemplateManagerErrorCode =
    (typeof PROMPT_TEMPLATE_MANAGER_ERROR_CODE)[keyof typeof PROMPT_TEMPLATE_MANAGER_ERROR_CODE]

/**
 * Structured metadata for prompt template manager failures.
 */
export interface IPromptTemplateManagerErrorDetails {
    /**
     * Template name when available.
     */
    readonly templateName?: string

    /**
     * Variable name when available.
     */
    readonly variableName?: string
}

/**
 * Error thrown by prompt template manager.
 */
export class PromptTemplateManagerError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: PromptTemplateManagerErrorCode

    /**
     * Template name when available.
     */
    public readonly templateName?: string

    /**
     * Variable name when available.
     */
    public readonly variableName?: string

    /**
     * Creates prompt template manager error.
     *
     * @param code Stable machine-readable error code.
     * @param details Optional normalized metadata.
     */
    public constructor(
        code: PromptTemplateManagerErrorCode,
        details: IPromptTemplateManagerErrorDetails = {},
    ) {
        super(buildPromptTemplateManagerErrorMessage(code, details))
        this.name = "PromptTemplateManagerError"
        this.code = code
        this.templateName = details.templateName
        this.variableName = details.variableName
    }
}

/**
 * Builds public error message for prompt template manager errors.
 *
 * @param code Error code.
 * @param details Error details.
 * @returns Public error message.
 */
function buildPromptTemplateManagerErrorMessage(
    code: PromptTemplateManagerErrorCode,
    details: IPromptTemplateManagerErrorDetails,
): string {
    const messages: Readonly<Record<PromptTemplateManagerErrorCode, string>> = {
        [PROMPT_TEMPLATE_MANAGER_ERROR_CODE.INVALID_TEMPLATE_NAME]:
            `Prompt template name is invalid: ${details.templateName ?? "<empty>"}`,
        [PROMPT_TEMPLATE_MANAGER_ERROR_CODE.INVALID_TEMPLATE_CONTENT]:
            `Prompt template content is invalid for: ${details.templateName ?? "<unknown>"}`,
        [PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_ALREADY_EXISTS]:
            `Prompt template already exists: ${details.templateName ?? "<unknown>"}`,
        [PROMPT_TEMPLATE_MANAGER_ERROR_CODE.TEMPLATE_NOT_FOUND]:
            `Prompt template not found: ${details.templateName ?? "<unknown>"}`,
        [PROMPT_TEMPLATE_MANAGER_ERROR_CODE.MISSING_VARIABLE]:
            `Prompt template variable is missing: ${details.variableName ?? "<unknown>"}`,
    }

    return messages[code]
}
