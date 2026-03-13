/**
 * Typed error codes for git repository workspace provider failures.
 */
export const GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE = {
    INVALID_REMOTE_URL: "INVALID_REMOTE_URL",
    INVALID_ACCESS_TOKEN: "INVALID_ACCESS_TOKEN",
    INVALID_REPOSITORY_ID: "INVALID_REPOSITORY_ID",
    INVALID_REF: "INVALID_REF",
    INVALID_WORKSPACE_ID: "INVALID_WORKSPACE_ID",
    CLONE_FAILED: "CLONE_FAILED",
    CHECKOUT_FAILED: "CHECKOUT_FAILED",
    WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND",
    DISPOSE_FAILED: "DISPOSE_FAILED",
} as const

/**
 * Git repository workspace provider error code literal.
 */
export type GitRepositoryWorkspaceProviderErrorCode =
    (typeof GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE)[keyof typeof GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE]

/**
 * Structured metadata for workspace provider failures.
 */
export interface IGitRepositoryWorkspaceProviderErrorDetails {
    /**
     * Repository identifier when available.
     */
    readonly repositoryId?: string

    /**
     * Remote URL when available.
     */
    readonly remoteUrl?: string

    /**
     * Repository ref when available.
     */
    readonly ref?: string

    /**
     * Workspace identifier when available.
     */
    readonly workspaceId?: string

    /**
     * Workspace path when available.
     */
    readonly workspacePath?: string

    /**
     * Lower-level failure message when available.
     */
    readonly causeMessage?: string
}

/**
 * Typed error raised by git repository workspace provider.
 */
export class GitRepositoryWorkspaceProviderError extends Error {
    /**
     * Stable machine-readable error code.
     */
    public readonly code: GitRepositoryWorkspaceProviderErrorCode

    /**
     * Repository identifier when available.
     */
    public readonly repositoryId?: string

    /**
     * Remote URL when available.
     */
    public readonly remoteUrl?: string

    /**
     * Repository ref when available.
     */
    public readonly ref?: string

    /**
     * Workspace identifier when available.
     */
    public readonly workspaceId?: string

    /**
     * Workspace path when available.
     */
    public readonly workspacePath?: string

    /**
     * Lower-level failure message when available.
     */
    public readonly causeMessage?: string

    /**
     * Creates typed workspace provider error.
     *
     * @param code Stable machine-readable error code.
     * @param details Normalized error metadata.
     */
    public constructor(
        code: GitRepositoryWorkspaceProviderErrorCode,
        details: IGitRepositoryWorkspaceProviderErrorDetails = {},
    ) {
        super(buildGitRepositoryWorkspaceProviderErrorMessage(code, details))

        this.name = "GitRepositoryWorkspaceProviderError"
        this.code = code
        this.repositoryId = details.repositoryId
        this.remoteUrl = details.remoteUrl
        this.ref = details.ref
        this.workspaceId = details.workspaceId
        this.workspacePath = details.workspacePath
        this.causeMessage = details.causeMessage
    }
}

type IGitRepositoryWorkspaceProviderErrorMessageBuilder = (
    details: IGitRepositoryWorkspaceProviderErrorDetails,
) => string

const GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_MESSAGES: Readonly<
    Record<
        GitRepositoryWorkspaceProviderErrorCode,
        IGitRepositoryWorkspaceProviderErrorMessageBuilder
    >
> = {
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REMOTE_URL]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Invalid remote URL for git repository workspace provider: ${details.remoteUrl ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_ACCESS_TOKEN]:
        (): string =>
            "Access token for git repository workspace provider cannot be empty",
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REPOSITORY_ID]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Invalid repository id for git repository workspace provider: ${details.repositoryId ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REF]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Invalid repository ref for git repository workspace provider: ${details.ref ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_WORKSPACE_ID]:
        (): string =>
            "Workspace id for git repository workspace provider cannot be empty",
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CLONE_FAILED]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Failed to clone repository workspace: ${details.remoteUrl ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CHECKOUT_FAILED]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Failed to checkout ref for repository workspace: ${details.ref ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.WORKSPACE_NOT_FOUND]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string => `Repository workspace not found: ${details.workspaceId ?? "<empty>"}`,
    [GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.DISPOSE_FAILED]: (
        details: IGitRepositoryWorkspaceProviderErrorDetails,
    ): string =>
        `Failed to dispose repository workspace: ${details.workspacePath ?? "<unknown>"}`,
}

/**
 * Builds stable public message for workspace provider failures.
 *
 * @param code Stable machine-readable error code.
 * @param details Normalized error metadata.
 * @returns Stable public error message.
 */
function buildGitRepositoryWorkspaceProviderErrorMessage(
    code: GitRepositoryWorkspaceProviderErrorCode,
    details: IGitRepositoryWorkspaceProviderErrorDetails,
): string {
    return GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_MESSAGES[code](details)
}
