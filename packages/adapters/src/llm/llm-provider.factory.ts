import type {ILLMProvider} from "@codenautic/core"

import {
    LLM_PROVIDER_FACTORY_ERROR_CODE,
    LlmProviderFactoryError,
} from "./llm-provider-factory.error"

/**
 * Supported LLM provider types for factory resolution.
 */
export const LLM_PROVIDER_TYPE = {
    OPENAI: "OPENAI",
    ANTHROPIC: "ANTHROPIC",
    OPENROUTER: "OPENROUTER",
    GROQ: "GROQ",
    GOOGLE: "GOOGLE",
    CEREBRAS: "CEREBRAS",
} as const

/**
 * Canonical LLM provider type.
 */
export type LlmProviderType = (typeof LLM_PROVIDER_TYPE)[keyof typeof LLM_PROVIDER_TYPE]

/**
 * One provider registration entry for factory lookup.
 */
export interface ILlmProviderRegistration {
    /**
     * Provider implementation.
     */
    readonly provider: ILLMProvider

    /**
     * Supported model names for deterministic config validation.
     */
    readonly supportedModels?: readonly string[]
}

/**
 * Factory registry options.
 */
export interface ILlmProviderFactoryOptions {
    /**
     * OpenAI provider registration.
     */
    readonly openai?: ILlmProviderRegistration

    /**
     * Anthropic provider registration.
     */
    readonly anthropic?: ILlmProviderRegistration

    /**
     * OpenRouter provider registration.
     */
    readonly openrouter?: ILlmProviderRegistration

    /**
     * Groq provider registration.
     */
    readonly groq?: ILlmProviderRegistration

    /**
     * Google provider registration.
     */
    readonly google?: ILlmProviderRegistration

    /**
     * Cerebras provider registration.
     */
    readonly cerebras?: ILlmProviderRegistration
}

/**
 * Optional fallback configuration.
 */
export interface ILlmProviderFallbackConfig {
    /**
     * Fallback provider type.
     */
    readonly providerType: string

    /**
     * Fallback model name.
     */
    readonly model: string
}

/**
 * Factory create input.
 */
export interface ILlmProviderFactoryCreateOptions {
    /**
     * Primary provider type.
     */
    readonly providerType: string

    /**
     * Primary model name.
     */
    readonly model: string

    /**
     * Optional BYOK api key override.
     */
    readonly apiKey?: string

    /**
     * Optional fallback configuration.
     */
    readonly fallback?: ILlmProviderFallbackConfig
}

/**
 * Sanitized LLM provider configuration resolved by factory.
 */
export interface IResolvedLlmProviderConfiguration {
    /**
     * Canonical primary provider type.
     */
    readonly providerType: LlmProviderType

    /**
     * Normalized primary model.
     */
    readonly model: string

    /**
     * Whether BYOK override is active.
     */
    readonly usesByok: boolean

    /**
     * Optional normalized fallback configuration.
     */
    readonly fallback?: {
        readonly providerType: LlmProviderType
        readonly model: string
    }
}

/**
 * LLM provider factory contract.
 */
export interface ILlmProviderFactory {
    /**
     * Resolves provider by sanitized configuration.
     *
     * @param options Factory input.
     * @returns Matching provider implementation.
     */
    create(options: ILlmProviderFactoryCreateOptions): ILLMProvider

    /**
     * Resolves sanitized configuration without exposing secrets.
     *
     * @param options Factory input.
     * @returns Sanitized configuration.
     */
    resolveConfiguration(
        options: ILlmProviderFactoryCreateOptions,
    ): IResolvedLlmProviderConfiguration
}

const LLM_PROVIDER_ALIAS_TO_TYPE: Readonly<Record<string, LlmProviderType>> = {
    openai: LLM_PROVIDER_TYPE.OPENAI,
    anthropic: LLM_PROVIDER_TYPE.ANTHROPIC,
    claude: LLM_PROVIDER_TYPE.ANTHROPIC,
    openrouter: LLM_PROVIDER_TYPE.OPENROUTER,
    groq: LLM_PROVIDER_TYPE.GROQ,
    google: LLM_PROVIDER_TYPE.GOOGLE,
    gemini: LLM_PROVIDER_TYPE.GOOGLE,
    cerebras: LLM_PROVIDER_TYPE.CEREBRAS,
}

/**
 * Factory for LLM provider selection and config validation.
 */
export class LlmProviderFactory implements ILlmProviderFactory {
    private readonly registrations: ReadonlyMap<LlmProviderType, ILlmProviderRegistration>

    /**
     * Creates LLM provider factory.
     *
     * @param options Provider registrations.
     */
    public constructor(options: ILlmProviderFactoryOptions) {
        this.registrations = buildRegistrationMap(options)
    }

    /**
     * Resolves primary provider implementation.
     *
     * @param options Factory input.
     * @returns Matching provider implementation.
     */
    public create(options: ILlmProviderFactoryCreateOptions): ILLMProvider {
        const configuration = this.resolveConfiguration(options)
        const registration = this.registrations.get(configuration.providerType)

        if (registration === undefined) {
            throw new LlmProviderFactoryError(
                LLM_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
                options.providerType,
            )
        }

        return registration.provider
    }

    /**
     * Resolves sanitized configuration without exposing api keys.
     *
     * @param options Factory input.
     * @returns Sanitized primary and fallback configuration.
     */
    public resolveConfiguration(
        options: ILlmProviderFactoryCreateOptions,
    ): IResolvedLlmProviderConfiguration {
        const providerType = normalizeLlmProviderType(options.providerType)
        const registration = this.registrations.get(providerType)

        if (registration === undefined) {
            throw new LlmProviderFactoryError(
                LLM_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
                options.providerType,
            )
        }

        const model = normalizeModel(
            options.model,
            providerType,
            registration,
            LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_MODEL,
        )
        const usesByok = normalizeByokApiKey(options.apiKey, providerType)
        const fallback = resolveFallbackConfiguration(options.fallback, this.registrations)

        return {
            providerType,
            model,
            usesByok,
            fallback,
        }
    }
}

/**
 * Normalizes provider type into canonical value.
 *
 * @param providerType Raw provider type.
 * @returns Canonical provider type.
 */
export function normalizeLlmProviderType(providerType: string): LlmProviderType {
    const normalizedValue = providerType.trim().toLowerCase()
    const normalizedType = LLM_PROVIDER_ALIAS_TO_TYPE[normalizedValue]

    if (normalizedType === undefined) {
        throw new LlmProviderFactoryError(
            LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            providerType,
        )
    }

    return normalizedType
}

/**
 * Builds immutable provider registration map.
 *
 * @param options Registry options.
 * @returns Immutable registration map.
 */
function buildRegistrationMap(
    options: ILlmProviderFactoryOptions,
): ReadonlyMap<LlmProviderType, ILlmProviderRegistration> {
    const registrations = new Map<LlmProviderType, ILlmProviderRegistration>()

    if (options.openai !== undefined) {
        registrations.set(LLM_PROVIDER_TYPE.OPENAI, normalizeRegistration(options.openai))
    }

    if (options.anthropic !== undefined) {
        registrations.set(
            LLM_PROVIDER_TYPE.ANTHROPIC,
            normalizeRegistration(options.anthropic),
        )
    }

    if (options.openrouter !== undefined) {
        registrations.set(
            LLM_PROVIDER_TYPE.OPENROUTER,
            normalizeRegistration(options.openrouter),
        )
    }

    if (options.groq !== undefined) {
        registrations.set(LLM_PROVIDER_TYPE.GROQ, normalizeRegistration(options.groq))
    }

    if (options.google !== undefined) {
        registrations.set(LLM_PROVIDER_TYPE.GOOGLE, normalizeRegistration(options.google))
    }

    if (options.cerebras !== undefined) {
        registrations.set(LLM_PROVIDER_TYPE.CEREBRAS, normalizeRegistration(options.cerebras))
    }

    return registrations
}

/**
 * Normalizes registration models into trimmed immutable list.
 *
 * @param registration Provider registration.
 * @returns Normalized registration.
 */
function normalizeRegistration(registration: ILlmProviderRegistration): ILlmProviderRegistration {
    const supportedModels = registration.supportedModels?.map((model) => model.trim())
        .filter((model) => model.length > 0)

    if (supportedModels === undefined) {
        return registration
    }

    return {
        provider: registration.provider,
        supportedModels,
    }
}

/**
 * Normalizes and validates model against optional registry constraints.
 *
 * @param model Raw model name.
 * @param providerType Canonical provider type.
 * @param registration Provider registration.
 * @param errorCode Error code for invalid model branch.
 * @returns Normalized model.
 */
function normalizeModel(
    model: string,
    providerType: LlmProviderType,
    registration: ILlmProviderRegistration,
    errorCode:
        | typeof LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_MODEL
        | typeof LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_FALLBACK_MODEL,
): string {
    const normalizedModel = model.trim()
    if (normalizedModel.length === 0) {
        throw new LlmProviderFactoryError(errorCode, providerType)
    }

    const supportedModels = registration.supportedModels
    if (supportedModels !== undefined && supportedModels.includes(normalizedModel) === false) {
        throw new LlmProviderFactoryError(errorCode, providerType)
    }

    return normalizedModel
}

/**
 * Validates optional BYOK api key without exposing secret value.
 *
 * @param apiKey Optional api key.
 * @param providerType Canonical provider type.
 * @returns True when BYOK override is active.
 */
function normalizeByokApiKey(apiKey: string | undefined, providerType: LlmProviderType): boolean {
    if (apiKey === undefined) {
        return false
    }

    if (apiKey.trim().length === 0) {
        throw new LlmProviderFactoryError(
            LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_BYOK_API_KEY,
            providerType,
        )
    }

    return true
}

/**
 * Resolves sanitized fallback configuration.
 *
 * @param fallback Raw fallback config.
 * @param registrations Provider registrations.
 * @returns Sanitized fallback config or undefined.
 */
function resolveFallbackConfiguration(
    fallback: ILlmProviderFallbackConfig | undefined,
    registrations: ReadonlyMap<LlmProviderType, ILlmProviderRegistration>,
): IResolvedLlmProviderConfiguration["fallback"] {
    if (fallback === undefined) {
        return undefined
    }

    const fallbackProviderType = normalizeFallbackProviderType(fallback.providerType)
    const registration = registrations.get(fallbackProviderType)

    if (registration === undefined) {
        throw new LlmProviderFactoryError(
            LLM_PROVIDER_FACTORY_ERROR_CODE.FALLBACK_PROVIDER_NOT_CONFIGURED,
            fallback.providerType,
        )
    }

    return {
        providerType: fallbackProviderType,
        model: normalizeModel(
            fallback.model,
            fallbackProviderType,
            registration,
            LLM_PROVIDER_FACTORY_ERROR_CODE.INVALID_FALLBACK_MODEL,
        ),
    }
}

/**
 * Normalizes fallback provider type with dedicated error code.
 *
 * @param providerType Raw fallback provider type.
 * @returns Canonical fallback provider type.
 */
function normalizeFallbackProviderType(providerType: string): LlmProviderType {
    const normalizedValue = providerType.trim().toLowerCase()
    const normalizedType = LLM_PROVIDER_ALIAS_TO_TYPE[normalizedValue]

    if (normalizedType === undefined) {
        throw new LlmProviderFactoryError(
            LLM_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_FALLBACK_PROVIDER,
            providerType,
        )
    }

    return normalizedType
}
