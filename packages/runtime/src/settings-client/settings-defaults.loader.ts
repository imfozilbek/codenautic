import {z} from "zod"

import type {IApplicationDefaultsDTO} from "@codenautic/core"

import {SettingsServiceClient, type ISettingsSnapshot} from "./settings-service.client"

const reviewFileDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
    reviewDepthStrategy: z.enum(["auto", "always-light", "always-heavy"]),
    systemPromptName: z.string().min(1),
    reviewerPrompt: z.string().min(1),
}).passthrough()

const reviewCcrDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
    promptName: z.string().min(1),
}).passthrough()

const reviewSummaryDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
    systemPrompt: z.string().min(1),
    userPrompt: z.string().min(1),
}).passthrough()

const reviewCcrSummaryDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
    defaultSystemPromptName: z.string().min(1),
    complementSystemPromptName: z.string().min(1),
}).passthrough()

const fileContextGateDefaultsSchema = z.object({
    batchSize: z.number().int().positive(),
}).passthrough()

const externalContextDefaultsSchema = z.object({
    limit: z.number().int().positive(),
}).passthrough()

const severityDefaultsSchema = z.object({
    threshold: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
}).passthrough()

const priorityDefaultsSchema = z.object({
    limit: z.number().int().min(0),
}).passthrough()

const hallucinationDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
}).passthrough()

const safeguardsDefaultsSchema = z.object({
    severity: severityDefaultsSchema,
    priority: priorityDefaultsSchema,
    hallucination: hallucinationDefaultsSchema,
}).passthrough()

const cadenceDefaultsSchema = z.object({
    autoPauseThreshold: z.number().int().min(0),
}).passthrough()

const throttleDefaultsSchema = z.object({
    windowSeconds: z.number().int().positive(),
    maxReviewsPerWindow: z.number().int().min(1),
}).passthrough()

const initialCommentDefaultsSchema = z.object({
    body: z.string().min(1),
}).passthrough()

const checkRunDefaultsSchema = z.object({
    checkRunName: z.string().min(1),
}).passthrough()

const augmentContextDefaultsSchema = z.object({
    relatedFilesLimit: z.number().int().positive(),
}).passthrough()

const dryRunDefaultsSchema = z.object({
    startAttempt: z.number().int().min(1),
    mutatingStageIds: z.array(z.string().min(1)),
}).passthrough()

const messagingChatDefaultsSchema = z.object({
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
}).passthrough()

const outboxRelayDefaultsSchema = z.object({
    batchSize: z.number().int().positive(),
}).passthrough()

const mentionCommandsSchema = z.array(z.string().min(1)).min(1)

const applyRuleDefaultsSchema = z.object({
    promptModel: z.string().min(1),
    promptMaxTokens: z.number().int().positive(),
    promptRankScore: z.number().int().min(0),
    regexRankScore: z.number().int().min(0),
    ruleSeverity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
}).passthrough()

const listRulesDefaultsSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
}).passthrough()

const falsePositiveDefaultsSchema = z.object({
    threshold: z.number().min(0).max(1),
    deactivateThreshold: z.number().min(0).max(1),
    minSampleSize: z.number().int().min(1),
    minDeactivateSampleSize: z.number().int().min(1),
}).passthrough()

const learnTeamDefaultsSchema = z.object({
    minSampleSize: z.number().int().min(1),
    minConfidence: z.number().min(0).max(1),
    minWeightDelta: z.number().min(0).max(1),
    maxAdjustments: z.number().int().min(1),
}).passthrough()

const clusteringDefaultsSchema = z.object({
    mode: z.enum(["MINIMAL", "SMART", "FULL"]),
    similarityThreshold: z.number().min(0).max(1),
    embeddingModel: z.string().min(1),
}).passthrough()

const mcpDefaultsSchema = z.object({
    protocolVersion: z.literal("2025-01-01"),
}).passthrough()

type IReviewDefaults = {
    fileReview: z.infer<typeof reviewFileDefaultsSchema>
    ccrReview: z.infer<typeof reviewCcrDefaultsSchema>
    summary: z.infer<typeof reviewSummaryDefaultsSchema>
    ccrSummary: z.infer<typeof reviewCcrSummaryDefaultsSchema>
    fileContextGate: z.infer<typeof fileContextGateDefaultsSchema>
    externalContext: z.infer<typeof externalContextDefaultsSchema>
    safeguards: z.infer<typeof safeguardsDefaultsSchema>
    cadence: z.infer<typeof cadenceDefaultsSchema>
    throttle: z.infer<typeof throttleDefaultsSchema>
    initialComment: z.infer<typeof initialCommentDefaultsSchema>
    checkRun: z.infer<typeof checkRunDefaultsSchema>
    augmentContext: z.infer<typeof augmentContextDefaultsSchema>
    dryRun: z.infer<typeof dryRunDefaultsSchema>
}

type IMessagingDefaults = {
    chat: z.infer<typeof messagingChatDefaultsSchema>
    outboxRelay: z.infer<typeof outboxRelayDefaultsSchema>
    mentionCommands: {
        allowedCommands: z.infer<typeof mentionCommandsSchema>
    }
}

type IRulesDefaults = {
    applyRule: z.infer<typeof applyRuleDefaultsSchema>
    listRules: z.infer<typeof listRulesDefaultsSchema>
}

type IAnalyticsDefaults = {
    falsePositiveDetection: z.infer<typeof falsePositiveDefaultsSchema>
    learnTeamPatterns: z.infer<typeof learnTeamDefaultsSchema>
}

type IClusteringDefaults = z.infer<typeof clusteringDefaultsSchema>
type IMcpDefaults = z.infer<typeof mcpDefaultsSchema>

/**
 * Error raised when defaults payload fails validation.
 */
export class SettingsDefaultsValidationError extends Error {
    public readonly key: string
    public readonly issues: readonly string[]

    /**
     * Creates defaults validation error.
     *
     * @param key Settings key.
     * @param issues Validation issues.
     */
    public constructor(key: string, issues: readonly string[]) {
        super(`Settings defaults '${key}' failed validation: ${issues.join("; ")}`)
        this.name = "SettingsDefaultsValidationError"
        this.key = key
        this.issues = issues
    }
}

/**
 * Loader that builds application defaults from settings-service.
 */
export class SettingsDefaultsLoader {
    private readonly client: SettingsServiceClient

    /**
     * Creates defaults loader.
     *
     * @param client Settings-service client.
     */
    public constructor(client: SettingsServiceClient) {
        this.client = client
    }

    /**
     * Loads defaults required by core use cases.
     *
     * @returns Fully assembled defaults payload.
     */
    public async loadApplicationDefaults(): Promise<IApplicationDefaultsDTO> {
        const snapshot = await this.client.getSettingsSnapshot()
        const lookup = buildLookup(snapshot)

        const review: IReviewDefaults = buildReviewDefaults(lookup)
        const messaging: IMessagingDefaults = buildMessagingDefaults(lookup)
        const rules: IRulesDefaults = buildRulesDefaults(lookup)
        const analytics: IAnalyticsDefaults = buildAnalyticsDefaults(lookup)
        const clustering: IClusteringDefaults = buildClusteringDefaults(lookup)
        const mcp: IMcpDefaults = buildMcpDefaults(lookup)

        const defaults: IApplicationDefaultsDTO = {
            review,
            messaging,
            rules,
            analytics,
            clustering,
            mcp,
        }

        return defaults
    }
}

function buildLookup(snapshot: ISettingsSnapshot): Map<string, unknown> {
    const lookup = new Map<string, unknown>()
    for (const item of snapshot.items) {
        lookup.set(item.key, item.value)
    }

    return lookup
}

function buildReviewDefaults(lookup: Map<string, unknown>): IReviewDefaults {
    return {
        fileReview: readSetting(lookup, "review.file_defaults", reviewFileDefaultsSchema),
        ccrReview: readSetting(lookup, "review.ccr_defaults", reviewCcrDefaultsSchema),
        summary: readSetting(lookup, "review.summary_defaults", reviewSummaryDefaultsSchema),
        ccrSummary: readSetting(
            lookup,
            "review.ccr_summary_defaults",
            reviewCcrSummaryDefaultsSchema,
        ),
        fileContextGate: readSetting(
            lookup,
            "review.file_context_gate_defaults",
            fileContextGateDefaultsSchema,
        ),
        externalContext: readSetting(
            lookup,
            "review.external_context_defaults",
            externalContextDefaultsSchema,
        ),
        safeguards: readSetting(
            lookup,
            "review.safeguards_defaults",
            safeguardsDefaultsSchema,
        ),
        cadence: readSetting(lookup, "review.cadence_defaults", cadenceDefaultsSchema),
        throttle: readSetting(lookup, "review.throttle_defaults", throttleDefaultsSchema),
        initialComment: readSetting(
            lookup,
            "review.initial_comment_defaults",
            initialCommentDefaultsSchema,
        ),
        checkRun: readSetting(
            lookup,
            "review.check_run_defaults",
            checkRunDefaultsSchema,
        ),
        augmentContext: readSetting(
            lookup,
            "review.augment_context_defaults",
            augmentContextDefaultsSchema,
        ),
        dryRun: readSetting(lookup, "review.dry_run_defaults", dryRunDefaultsSchema),
    }
}

function buildMessagingDefaults(lookup: Map<string, unknown>): IMessagingDefaults {
    const allowedCommands = readSetting(
        lookup,
        "mention.available_commands",
        mentionCommandsSchema,
    )

    return {
        chat: readSetting(lookup, "messaging.chat_defaults", messagingChatDefaultsSchema),
        outboxRelay: readSetting(
            lookup,
            "messaging.outbox_relay_defaults",
            outboxRelayDefaultsSchema,
        ),
        mentionCommands: {
            allowedCommands,
        },
    }
}

function buildRulesDefaults(lookup: Map<string, unknown>): IRulesDefaults {
    return {
        applyRule: readSetting(lookup, "rules.apply_defaults", applyRuleDefaultsSchema),
        listRules: readSetting(lookup, "rules.list_defaults", listRulesDefaultsSchema),
    }
}

function buildAnalyticsDefaults(lookup: Map<string, unknown>): IAnalyticsDefaults {
    return {
        falsePositiveDetection: readSetting(
            lookup,
            "detection.false_positive_thresholds",
            falsePositiveDefaultsSchema,
        ),
        learnTeamPatterns: readSetting(
            lookup,
            "analytics.learn_team_patterns_defaults",
            learnTeamDefaultsSchema,
        ),
    }
}

function buildClusteringDefaults(lookup: Map<string, unknown>): IClusteringDefaults {
    return readSetting(
        lookup,
        "analytics.suggestion_clustering_defaults",
        clusteringDefaultsSchema,
    )
}

function buildMcpDefaults(lookup: Map<string, unknown>): IMcpDefaults {
    return readSetting(lookup, "mcp.defaults", mcpDefaultsSchema)
}

function readSetting<TValue>(
    lookup: Map<string, unknown>,
    key: string,
    schema: z.ZodType<TValue>,
): TValue {
    if (!lookup.has(key)) {
        throw new SettingsDefaultsValidationError(key, ["settings key is missing"])
    }

    const value = lookup.get(key)
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => {
            if (issue.path.length === 0) {
                return issue.message
            }
            return `${issue.path.join(".")}: ${issue.message}`
        })

        throw new SettingsDefaultsValidationError(key, issues)
    }

    return parsed.data
}
