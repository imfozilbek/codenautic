import type {IGitProvider} from "@codenautic/core"

import {
    GIT_PROVIDER_FACTORY_ERROR_CODE,
    GitProviderFactoryError,
} from "./git-provider-factory.error"

/**
 * Supported Git provider types for factory resolution.
 */
export const GIT_PROVIDER_TYPE = {
    GITHUB: "GITHUB",
    GITLAB: "GITLAB",
    AZURE_DEVOPS: "AZURE_DEVOPS",
    BITBUCKET: "BITBUCKET",
} as const

/**
 * Git provider type.
 */
export type GitProviderType = (typeof GIT_PROVIDER_TYPE)[keyof typeof GIT_PROVIDER_TYPE]

/**
 * Registry options for Git provider factory.
 */
export interface IGitProviderFactoryOptions {
    /**
     * GitHub provider implementation.
     */
    readonly github?: IGitProvider

    /**
     * GitLab provider implementation.
     */
    readonly gitlab?: IGitProvider

    /**
     * Azure DevOps provider implementation.
     */
    readonly azureDevops?: IGitProvider

    /**
     * Bitbucket provider implementation.
     */
    readonly bitbucket?: IGitProvider
}

/**
 * Git provider factory contract.
 */
export interface IGitProviderFactory {
    /**
     * Resolves Git provider by type.
     *
     * @param providerType Provider type or alias.
     * @returns Matching provider implementation.
     * @throws GitProviderFactoryError when type is unknown or provider is not configured.
     */
    create(providerType: string): IGitProvider
}

const GIT_PROVIDER_ALIAS_TO_TYPE: Readonly<Record<string, GitProviderType>> = {
    github: GIT_PROVIDER_TYPE.GITHUB,
    gh: GIT_PROVIDER_TYPE.GITHUB,
    gitlab: GIT_PROVIDER_TYPE.GITLAB,
    gl: GIT_PROVIDER_TYPE.GITLAB,
    "azure-devops": GIT_PROVIDER_TYPE.AZURE_DEVOPS,
    azure_devops: GIT_PROVIDER_TYPE.AZURE_DEVOPS,
    azuredevops: GIT_PROVIDER_TYPE.AZURE_DEVOPS,
    az: GIT_PROVIDER_TYPE.AZURE_DEVOPS,
    bitbucket: GIT_PROVIDER_TYPE.BITBUCKET,
    bb: GIT_PROVIDER_TYPE.BITBUCKET,
}

/**
 * Factory for selecting Git provider by configured type.
 */
export class GitProviderFactory implements IGitProviderFactory {
    private readonly providers: ReadonlyMap<GitProviderType, IGitProvider>

    /**
     * Creates Git provider factory.
     *
     * @param options Provider registry.
     */
    public constructor(options: IGitProviderFactoryOptions) {
        this.providers = buildProviderMap(options)
    }

    /**
     * Resolves provider by type.
     *
     * @param providerType Provider type or alias.
     * @returns Matching provider implementation.
     * @throws GitProviderFactoryError when type is unknown or missing in registry.
     */
    public create(providerType: string): IGitProvider {
        const normalizedType = normalizeGitProviderType(providerType)
        const provider = this.providers.get(normalizedType)

        if (provider === undefined) {
            throw new GitProviderFactoryError(
                GIT_PROVIDER_FACTORY_ERROR_CODE.PROVIDER_NOT_CONFIGURED,
                providerType,
            )
        }

        return provider
    }
}

/**
 * Normalizes provider type into canonical enum-like value.
 *
 * @param providerType Raw provider type.
 * @returns Canonical provider type.
 * @throws GitProviderFactoryError when type is unsupported.
 */
export function normalizeGitProviderType(providerType: string): GitProviderType {
    const normalizedValue = providerType.trim().toLowerCase()
    const normalizedType = GIT_PROVIDER_ALIAS_TO_TYPE[normalizedValue]

    if (normalizedType === undefined) {
        throw new GitProviderFactoryError(
            GIT_PROVIDER_FACTORY_ERROR_CODE.UNKNOWN_PROVIDER,
            providerType,
        )
    }

    return normalizedType
}

/**
 * Builds immutable provider map from factory options.
 *
 * @param options Provider registry options.
 * @returns Immutable provider map.
 */
function buildProviderMap(
    options: IGitProviderFactoryOptions,
): ReadonlyMap<GitProviderType, IGitProvider> {
    const providers = new Map<GitProviderType, IGitProvider>()

    if (options.github !== undefined) {
        providers.set(GIT_PROVIDER_TYPE.GITHUB, options.github)
    }

    if (options.gitlab !== undefined) {
        providers.set(GIT_PROVIDER_TYPE.GITLAB, options.gitlab)
    }

    if (options.azureDevops !== undefined) {
        providers.set(GIT_PROVIDER_TYPE.AZURE_DEVOPS, options.azureDevops)
    }

    if (options.bitbucket !== undefined) {
        providers.set(GIT_PROVIDER_TYPE.BITBUCKET, options.bitbucket)
    }

    return providers
}
