/**
 * Typed error codes for LLM provider factory configuration failures.
 */
export const LLM_PROVIDER_FACTORY_ERROR_CODE = {
    UNKNOWN_PROVIDER: "UNKNOWN_PROVIDER",
    PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
    INVALID_MODEL: "INVALID_MODEL",
    INVALID_BYOK_API_KEY: "INVALID_BYOK_API_KEY",
    UNKNOWN_FALLBACK_PROVIDER: "UNKNOWN_FALLBACK_PROVIDER",
    FALLBACK_PROVIDER_NOT_CONFIGURED: "FALLBACK_PROVIDER_NOT_CONFIGURED",
    INVALID_FALLBACK_MODEL: "INVALID_FALLBACK_MODEL",
} as const

/**
 * LLM provider factory error code.
 */
export type LlmProviderFactoryErrorCode =
    (typeof LLM_PROVIDER_FACTORY_ERROR_CODE)[keyof typeof LLM_PROVIDER_FACTORY_ERROR_CODE]

/**
 * Typed configuration error raised by LLM provider factory.
 */
export class LlmProviderFactoryError extends Error {
    /**
     * Typed error code.
     */
    public readonly code: LlmProviderFactoryErrorCode

    /**
     * Raw provider type from user configuration.
     */
    public readonly providerType: string

    /**
     * Creates typed factory error.
     *
     * @param code Typed error code.
     * @param providerType Raw provider type.
     */
    public constructor(code: LlmProviderFactoryErrorCode, providerType: string) {
        super(buildMessage(code, providerType))
        this.name = "LlmProviderFactoryError"
        this.code = code
        this.providerType = providerType
    }
}

/**
 * Builds stable public error message without leaking secrets.
 *
 * @param code Typed error code.
 * @param providerType Raw provider type.
 * @returns Safe error message.
 */
function buildMessage(code: LlmProviderFactoryErrorCode, providerType: string): string {
    const normalizedProviderType = providerType.trim()
    const providerLabel = normalizedProviderType.length > 0 ? normalizedProviderType : "<empty>"

    switch (code) {
        case LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER:
            return `Unknown llm provider type: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED:
            return `LLM provider is not configured for type: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_MODEL:
            return `LLM model configuration is invalid for provider: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_BYOK_API_KEY:
            return `BYOK api key is invalid for provider: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_FALLBACK_PROVIDER:
            return `Unknown fallback llm provider type: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.FALLBACK_PROVIDER_NOT_CONFIGURED:
            return `Fallback llm provider is not configured for type: ${providerLabel}`
        case LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_FALLBACK_MODEL:
            return `Fallback llm model configuration is invalid for provider: ${providerLabel}`
    }
}
