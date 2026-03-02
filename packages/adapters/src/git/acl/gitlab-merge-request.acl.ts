import {Result, hash} from "@codenautic/core"

import {type IAntiCorruptionLayer} from "../../shared/acl/anti-corruption-layer.interface"
import {
    GIT_FILE_CHANGE_STATUS,
    GIT_PROVIDER,
    type IGitMergeRequestChangedFileDto,
    type IGitMergeRequestDto,
    type IGitMergeRequestFetchRequest,
} from "../contracts/merge-request.contract"
import {GIT_ACL_ERROR_CODE, GitAclError, type GitAclErrorCode} from "../errors/git-acl.error"

type UnknownRecord = Record<string, unknown>

interface ICoreMergeRequestFields {
    readonly repositoryExternalId: string
    readonly mergeRequestExternalId: string
    readonly title: string
    readonly sourceBranch: string
    readonly targetBranch: string
}

interface IAuthorFields {
    readonly externalId: string
    readonly username: string
    readonly displayName: string
}

interface IDiffRefsFields {
    readonly baseSha: string
    readonly headSha: string
}

interface ICreateNormalizedErrorParams {
    readonly code: GitAclErrorCode
    readonly message: string
    readonly statusCode?: number
    readonly retryable: boolean
    readonly idempotentSafe: boolean
    readonly retryAfterSeconds?: number
    readonly cause?: Error
}

/**
 * GitLab merge request ACL with stable external-to-domain mapping contract.
 */
export class GitLabMergeRequestAcl
    implements IAntiCorruptionLayer<unknown, IGitMergeRequestDto, GitAclError>
{
    /**
     * Creates GitLab merge request ACL instance.
     */
    public constructor() {}

    /**
     * Converts GitLab response payload into stable merge request DTO.
     *
     * @param external GitLab SDK payload.
     * @returns Normalized merge request DTO or validation error.
     */
    public transform(external: unknown): Result<IGitMergeRequestDto, GitAclError> {
        const payload = toRecord(external)
        if (payload === undefined) {
            return Result.fail(
                this.createInvalidPayloadError("GitLab payload must be a non-null object"),
            )
        }

        const coreFields = this.extractCoreFields(payload)
        if (coreFields.isFail) {
            return Result.fail(coreFields.error)
        }

        const authorPayload = readRecord(payload, "author")
        if (authorPayload === undefined) {
            return Result.fail(this.createInvalidPayloadError("GitLab payload is missing author"))
        }

        const authorFields = this.extractAuthorFields(authorPayload)
        if (authorFields.isFail) {
            return Result.fail(authorFields.error)
        }

        const diffRefsPayload = readRecord(payload, "diff_refs")
        if (diffRefsPayload === undefined) {
            return Result.fail(this.createInvalidPayloadError("GitLab payload is missing diff_refs"))
        }

        const diffRefsFields = this.extractDiffRefsFields(diffRefsPayload)
        if (diffRefsFields.isFail) {
            return Result.fail(diffRefsFields.error)
        }

        const description = readOptionalString(payload, "description")
        const webUrl = readOptionalString(payload, "web_url")

        return Result.ok({
            provider: GIT_PROVIDER.GITLAB,
            repositoryExternalId: coreFields.value.repositoryExternalId,
            mergeRequestExternalId: coreFields.value.mergeRequestExternalId,
            title: coreFields.value.title,
            description: description ?? "",
            sourceBranch: coreFields.value.sourceBranch,
            targetBranch: coreFields.value.targetBranch,
            webUrl: webUrl ?? "",
            author: authorFields.value,
            diffRefs: diffRefsFields.value,
            changedFiles: this.mapChangedFiles(payload["changes"]),
        })
    }

    /**
     * Converts provider-specific errors to stable adapter error model.
     *
     * @param error Unknown provider error.
     * @returns Normalized Git ACL error.
     */
    public normalizeError(error: unknown): GitAclError {
        if (error instanceof GitAclError) {
            return error
        }

        const statusCode = extractStatusCode(error)
        const message = extractErrorMessage(error)
        const retryAfterSeconds = extractRetryAfterSeconds(error)

        if (statusCode === 429) {
            return this.createError({
                code: GIT_ACL_ERROR_CODE.RATE_LIMITED,
                message,
                statusCode,
                retryable: true,
                idempotentSafe: true,
                retryAfterSeconds,
                cause: toError(error),
            })
        }

        if (statusCode === 401 || statusCode === 403) {
            return this.createError({
                code: GIT_ACL_ERROR_CODE.UNAUTHORIZED,
                message,
                statusCode,
                retryable: false,
                idempotentSafe: false,
                cause: toError(error),
            })
        }

        if (statusCode !== undefined && statusCode >= 500) {
            return this.createError({
                code: GIT_ACL_ERROR_CODE.UPSTREAM_UNAVAILABLE,
                message,
                statusCode,
                retryable: true,
                idempotentSafe: true,
                cause: toError(error),
            })
        }

        if (statusCode !== undefined && statusCode >= 400) {
            return this.createError({
                code: GIT_ACL_ERROR_CODE.INVALID_PAYLOAD,
                message,
                statusCode,
                retryable: false,
                idempotentSafe: false,
                cause: toError(error),
            })
        }

        return this.createError({
            code: GIT_ACL_ERROR_CODE.UNKNOWN,
            message,
            statusCode,
            retryable: false,
            idempotentSafe: false,
            cause: toError(error),
        })
    }

    /**
     * Returns retry decision for normalized Git ACL error.
     *
     * @param error Normalized Git ACL error.
     * @returns True when request should be retried.
     */
    public shouldRetry(error: GitAclError): boolean {
        return error.retryable
    }

    /**
     * Builds deterministic idempotency key for Git fetch request.
     *
     * @param request Merge request fetch descriptor.
     * @returns Deterministic request idempotency key.
     */
    public createIdempotencyKey(request: IGitMergeRequestFetchRequest): string {
        const payload = [
            `provider:${request.provider}`,
            `project:${request.projectExternalId}`,
            `mr:${request.mergeRequestExternalId}`,
            `changes:${request.includeChanges ? "1" : "0"}`,
        ].join("|")

        return hash(payload)
    }

    private mapChangedFiles(changesPayload: unknown): readonly IGitMergeRequestChangedFileDto[] {
        if (Array.isArray(changesPayload) === false) {
            return []
        }

        const changedFiles: IGitMergeRequestChangedFileDto[] = []
        for (const item of changesPayload) {
            const change = toRecord(item)
            if (change === undefined) {
                continue
            }

            const newPath = readOptionalString(change, "new_path")
            const oldPath = readOptionalString(change, "old_path")
            const path = newPath ?? oldPath
            if (path === undefined || path.length === 0) {
                continue
            }

            const additions = readNonNegativeInteger(change, "additions") ?? 0
            const deletions = readNonNegativeInteger(change, "deletions") ?? 0
            changedFiles.push({
                path,
                status: mapFileStatus(change),
                additions,
                deletions,
            })
        }

        return changedFiles
    }

    private createInvalidPayloadError(message: string): GitAclError {
        return this.createError({
            code: GIT_ACL_ERROR_CODE.INVALID_PAYLOAD,
            message,
            statusCode: 400,
            retryable: false,
            idempotentSafe: false,
        })
    }

    private createError(params: ICreateNormalizedErrorParams): GitAclError {
        return new GitAclError({
            code: params.code,
            message: params.message,
            statusCode: params.statusCode,
            retryable: params.retryable,
            idempotentSafe: params.idempotentSafe,
            retryAfterSeconds: params.retryAfterSeconds,
            cause: params.cause,
        })
    }

    private extractCoreFields(payload: UnknownRecord): Result<ICoreMergeRequestFields, GitAclError> {
        const repositoryExternalId = readIdentifier(payload, "project_id")
        const mergeRequestExternalId = readIdentifier(payload, "iid")
        const title = readRequiredString(payload, "title")
        const sourceBranch = readRequiredString(payload, "source_branch")
        const targetBranch = readRequiredString(payload, "target_branch")

        if (
            repositoryExternalId === undefined ||
            mergeRequestExternalId === undefined ||
            title === undefined ||
            sourceBranch === undefined ||
            targetBranch === undefined
        ) {
            return Result.fail(
                this.createInvalidPayloadError(
                    "GitLab payload is missing required merge request fields",
                ),
            )
        }

        return Result.ok({
            repositoryExternalId,
            mergeRequestExternalId,
            title,
            sourceBranch,
            targetBranch,
        })
    }

    private extractAuthorFields(authorPayload: UnknownRecord): Result<IAuthorFields, GitAclError> {
        const authorId = readIdentifier(authorPayload, "id")
        const authorUsername = readRequiredString(authorPayload, "username")
        if (authorId === undefined || authorUsername === undefined) {
            return Result.fail(
                this.createInvalidPayloadError("GitLab payload has incomplete author data"),
            )
        }

        const displayName = readOptionalString(authorPayload, "name")

        return Result.ok({
            externalId: authorId,
            username: authorUsername,
            displayName: displayName ?? authorUsername,
        })
    }

    private extractDiffRefsFields(
        diffRefsPayload: UnknownRecord,
    ): Result<IDiffRefsFields, GitAclError> {
        const baseSha = readRequiredString(diffRefsPayload, "base_sha")
        const headSha = readRequiredString(diffRefsPayload, "head_sha")
        if (baseSha === undefined || headSha === undefined) {
            return Result.fail(
                this.createInvalidPayloadError("GitLab payload has incomplete diff refs"),
            )
        }

        return Result.ok({
            baseSha,
            headSha,
        })
    }
}

/**
 * Returns record value for unknown input.
 *
 * @param value Unknown input.
 * @returns Record value when input is object.
 */
function toRecord(value: unknown): UnknownRecord | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined
    }

    return value as UnknownRecord
}

/**
 * Reads nested record field.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns Record field when valid object.
 */
function readRecord(value: UnknownRecord, key: string): UnknownRecord | undefined {
    const nested = value[key]
    return toRecord(nested)
}

/**
 * Reads string-like identifier and normalizes to string.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns String identifier when present.
 */
function readIdentifier(value: UnknownRecord, key: string): string | undefined {
    const candidate = value[key]
    if (typeof candidate === "string") {
        return candidate.length > 0 ? candidate : undefined
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return String(candidate)
    }

    return undefined
}

/**
 * Reads required non-empty string.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns Trimmed string when valid.
 */
function readRequiredString(value: UnknownRecord, key: string): string | undefined {
    const candidate = readOptionalString(value, key)
    if (candidate === undefined || candidate.length === 0) {
        return undefined
    }

    return candidate
}

/**
 * Reads optional string and keeps empty result as undefined.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns Trimmed string when provided.
 */
function readOptionalString(value: UnknownRecord, key: string): string | undefined {
    const candidate = value[key]
    if (typeof candidate !== "string") {
        return undefined
    }

    return candidate.trim()
}

/**
 * Reads non-negative integer field.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns Integer when valid.
 */
function readNonNegativeInteger(value: UnknownRecord, key: string): number | undefined {
    const candidate = value[key]
    if (typeof candidate !== "number" || Number.isInteger(candidate) === false) {
        return undefined
    }
    if (candidate < 0) {
        return undefined
    }

    return candidate
}

/**
 * Maps GitLab file flags into normalized file status.
 *
 * @param changePayload GitLab file diff object.
 * @returns Normalized file status.
 */
function mapFileStatus(changePayload: UnknownRecord): IGitMergeRequestChangedFileDto["status"] {
    const deletedFile = changePayload["deleted_file"]
    if (deletedFile === true) {
        return GIT_FILE_CHANGE_STATUS.DELETED
    }

    const newFile = changePayload["new_file"]
    if (newFile === true) {
        return GIT_FILE_CHANGE_STATUS.ADDED
    }

    return GIT_FILE_CHANGE_STATUS.MODIFIED
}

/**
 * Extracts human-readable message from unknown error payload.
 *
 * @param error Unknown provider error.
 * @returns Normalized message string.
 */
function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    const record = toRecord(error)
    if (record !== undefined) {
        const candidate = readOptionalString(record, "message")
        if (candidate !== undefined && candidate.length > 0) {
            return candidate
        }
    }

    return "Unknown Git provider error"
}

/**
 * Extracts HTTP-like status code from provider error payload.
 *
 * @param error Unknown provider error.
 * @returns Numeric status code when present.
 */
function extractStatusCode(error: unknown): number | undefined {
    const record = toRecord(error)
    if (record === undefined) {
        return undefined
    }

    const directStatusCode = readStatusCodeCandidate(record, "statusCode")
    if (directStatusCode !== undefined) {
        return directStatusCode
    }

    const directStatus = readStatusCodeCandidate(record, "status")
    if (directStatus !== undefined) {
        return directStatus
    }

    const responsePayload = readRecord(record, "response")
    if (responsePayload !== undefined) {
        const responseStatusCode = readStatusCodeCandidate(responsePayload, "statusCode")
        if (responseStatusCode !== undefined) {
            return responseStatusCode
        }

        const responseStatus = readStatusCodeCandidate(responsePayload, "status")
        if (responseStatus !== undefined) {
            return responseStatus
        }
    }

    const causePayload = readRecord(record, "cause")
    if (causePayload !== undefined) {
        return extractStatusCode(causePayload)
    }

    return undefined
}

/**
 * Parses status code candidate from a record field.
 *
 * @param value Source record.
 * @param key Field key.
 * @returns Integer status code when valid.
 */
function readStatusCodeCandidate(value: UnknownRecord, key: string): number | undefined {
    const candidate = value[key]
    if (typeof candidate === "number" && Number.isInteger(candidate)) {
        return candidate
    }
    if (typeof candidate === "string" && candidate.length > 0) {
        const parsed = Number.parseInt(candidate, 10)
        if (Number.isInteger(parsed)) {
            return parsed
        }
    }

    return undefined
}

/**
 * Extracts retry-after hint from provider error payload.
 *
 * @param error Unknown provider error.
 * @returns Retry delay in seconds when provided.
 */
function extractRetryAfterSeconds(error: unknown): number | undefined {
    const record = toRecord(error)
    if (record === undefined) {
        return undefined
    }

    const directValue = readStatusCodeCandidate(record, "retryAfterSeconds")
    if (directValue !== undefined) {
        return directValue
    }

    const causePayload = readRecord(record, "cause")
    if (causePayload !== undefined) {
        const causeRetryAfter = extractRetryAfterSeconds(causePayload)
        if (causeRetryAfter !== undefined) {
            return causeRetryAfter
        }
    }

    const response = readRecord(record, "response")
    if (response === undefined) {
        return undefined
    }

    const headers = readRecord(response, "headers")
    if (headers === undefined) {
        return undefined
    }

    const lowerCaseRetryAfter = readStatusCodeCandidate(headers, "retry-after")
    if (lowerCaseRetryAfter !== undefined) {
        return lowerCaseRetryAfter
    }

    return readStatusCodeCandidate(headers, "Retry-After")
}

/**
 * Converts unknown value to Error instance.
 *
 * @param error Unknown value.
 * @returns Error instance when conversion is possible.
 */
function toError(error: unknown): Error | undefined {
    if (error instanceof Error) {
        return error
    }

    return undefined
}
