/**
 * Stable error codes exposed by Git ACL adapters.
 */
export const GIT_ACL_ERROR_CODE = {
    INVALID_PAYLOAD: "GIT_ACL_INVALID_PAYLOAD",
    RATE_LIMITED: "GIT_ACL_RATE_LIMITED",
    UNAUTHORIZED: "GIT_ACL_UNAUTHORIZED",
    UPSTREAM_UNAVAILABLE: "GIT_ACL_UPSTREAM_UNAVAILABLE",
    UNKNOWN: "GIT_ACL_UNKNOWN",
} as const

/**
 * Union type for Git ACL error codes.
 */
export type GitAclErrorCode = (typeof GIT_ACL_ERROR_CODE)[keyof typeof GIT_ACL_ERROR_CODE]

/**
 * Construction params for normalized Git ACL errors.
 */
export interface ICreateGitAclErrorParams {
    readonly code: GitAclErrorCode
    readonly message: string
    readonly statusCode?: number
    readonly retryable: boolean
    readonly idempotentSafe: boolean
    readonly retryAfterSeconds?: number
    readonly cause?: Error
}

/**
 * Normalized adapter error used by Git ACL contracts.
 */
export class GitAclError extends Error {
    public readonly code: GitAclErrorCode
    public readonly statusCode?: number
    public readonly retryable: boolean
    public readonly idempotentSafe: boolean
    public readonly retryAfterSeconds?: number
    public readonly cause?: Error

    /**
     * Creates normalized Git ACL error instance.
     *
     * @param params Error initialization parameters.
     */
    public constructor(params: ICreateGitAclErrorParams) {
        super(params.message)
        this.name = "GitAclError"
        this.code = params.code
        this.statusCode = params.statusCode
        this.retryable = params.retryable
        this.idempotentSafe = params.idempotentSafe
        this.retryAfterSeconds = params.retryAfterSeconds
        this.cause = params.cause
    }
}
