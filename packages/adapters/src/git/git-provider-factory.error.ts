/**
 * Typed error codes for Git provider factory failures.
 */
export const GIT_PROVIDER_FACTORY_ERROR_CODE = {
    UNKNOWN_PROVIDER: "UNKNOWN_PROVIDER",
    PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
} as const

/**
 * Git provider factory error code.
 */
export type GitProviderFactoryErrorCode =
    (typeof GIT_PROVIDER_FACTORY_ERROR_CODE)[keyof typeof GIT_PROVIDER_FACTORY_ERROR_CODE]

/**
 * Typed error raised by Git provider factory.
 */
export class GitProviderFactoryError extends Error {
    /**
     * Typed error code.
     */
    public readonly code: GitProviderFactoryErrorCode

    /**
     * Raw provider type input that triggered error.
     */
    public readonly providerType: string

    /**
     * Creates factory error.
     *
     * @param code Typed error code.
     * @param providerType Raw provider type.
     */
    public constructor(code: GitProviderFactoryErrorCode, providerType: string) {
        super(buildMessage(code, providerType))
        this.name = "GitProviderFactoryError"
        this.code = code
        this.providerType = providerType
    }
}

/**
 * Builds stable error message for factory failures.
 *
 * @param code Error code.
 * @param providerType Raw provider type.
 * @returns Error message.
 */
function buildMessage(code: GitProviderFactoryErrorCode, providerType: string): string {
    const normalizedProviderType = providerType.trim()
    const providerLabel = normalizedProviderType.length > 0 ? normalizedProviderType : "<empty>"

    if (code === GIT_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER) {
        return `Unknown git provider type: ${providerLabel}`
    }

    return `Git provider is not configured for type: ${providerLabel}`
}
