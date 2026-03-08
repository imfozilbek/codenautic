import type {GitAclErrorKind, INormalizedGitAclError} from "./acl"

/**
 * Error thrown by GitHub provider after Git ACL normalization.
 */
export class GitHubProviderError extends Error {
    /**
     * Normalized Git ACL error payload.
     */
    public readonly normalized: INormalizedGitAclError

    /**
     * Creates provider error.
     *
     * @param normalized Normalized git error.
     */
    public constructor(normalized: INormalizedGitAclError) {
        super(normalized.message)
        this.name = "GitHubProviderError"
        this.normalized = normalized
    }

    /**
     * Retryable flag derived from normalized error.
     *
     * @returns True when request may be retried.
     */
    public get isRetryable(): boolean {
        return this.normalized.isRetryable
    }

    /**
     * Normalized error kind.
     *
     * @returns Git ACL error kind.
     */
    public get kind(): GitAclErrorKind {
        return this.normalized.kind
    }

    /**
     * Optional HTTP status code.
     *
     * @returns Status code or undefined.
     */
    public get statusCode(): number | undefined {
        return this.normalized.statusCode
    }

    /**
     * Optional retry-after hint.
     *
     * @returns Delay in milliseconds or undefined.
     */
    public get retryAfterMs(): number | undefined {
        return this.normalized.retryAfterMs
    }
}
