/**
 * Public git-provider operation names used by shared wrappers.
 */
export const GIT_PROVIDER_OPERATION_NAMES = [
    "getMergeRequest",
    "getChangedFiles",
    "getFileTree",
    "getFileContentByRef",
    "getBranches",
    "getCommitHistory",
    "getContributorStats",
    "getTemporalCoupling",
    "getTags",
    "getDiffBetweenRefs",
    "postComment",
    "postInlineComment",
    "createCheckRun",
    "updateCheckRun",
    "getBlameData",
    "getBlameDataBatch",
    "createPipelineStatus",
    "updatePipelineStatus",
] as const

/**
 * Fast operation-name lookup for proxy wrappers.
 */
export const GIT_PROVIDER_OPERATION_NAME_SET = new Set<string>(GIT_PROVIDER_OPERATION_NAMES)
