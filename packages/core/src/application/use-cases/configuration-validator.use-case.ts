import type {IUseCase} from "../ports/inbound/use-case.port"
import {
    REVIEW_DEPTH_STRATEGY,
    type ReviewDepthStrategy,
    type IReviewConfigDTO,
    type IReviewPromptOverridesDTO,
    type ValidatedConfig,
} from "../dto/review/review-config.dto"
import type {IDirectoryConfig} from "../dto/config/directory-config.dto"
import {Result} from "../../shared/result"
import {
    type IValidationErrorField,
    ValidationError,
} from "../../domain/errors/validation.error"

/**
 * Input payload for configuration validation use case.
 */
export type IConfigurationValidatorInput = unknown

/** Allowed severity thresholds. */
const ALLOWED_SEVERITY_THRESHOLDS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const

/** Known review config keys for deterministic validation. */
const REVIEW_CONFIG_KEYS = [
    "severityThreshold",
    "ignorePaths",
    "maxSuggestionsPerFile",
    "maxSuggestionsPerCCR",
    "cadence",
    "customRuleIds",
    "reviewDepthStrategy",
    "directories",
    "promptOverrides",
] as const

/**
 * Pure validator for review configuration payload.
 *
 * Keep deterministic and explicit rule checks without external schema dependencies.
 */
export class ConfigurationValidatorUseCase
    implements IUseCase<IConfigurationValidatorInput, ValidatedConfig, ValidationError> {
    /**
     * Validates and normalizes review config payload.
     *
     * @param input Arbitrary input payload.
     * @returns Validated and normalized payload.
     */
    public execute(input: IConfigurationValidatorInput): Promise<Result<ValidatedConfig, ValidationError>> {
        const fields: IValidationErrorField[] = []
        const payload = this.readPayloadObject(input, fields)
        if (payload === undefined) {
            return Promise.resolve(
                Result.fail<ValidatedConfig, ValidationError>(
                    new ValidationError("Review config validation failed", fields),
                ),
            )
        }

        const normalizedConfig = this.normalizeConfig(payload, fields)
        if (normalizedConfig === undefined || fields.length > 0) {
            return Promise.resolve(
                Result.fail<ValidatedConfig, ValidationError>(
                    new ValidationError("Review config validation failed", fields),
                ),
            )
        }

        const validatedConfig: ValidatedConfig = {
            ...this.pickUnknownFields(payload),
            ...normalizedConfig,
            ...(normalizedConfig.promptOverrides === undefined ? {} : {promptOverrides: normalizedConfig.promptOverrides}),
        }

        return Promise.resolve(Result.ok<ValidatedConfig, ValidationError>(validatedConfig))
    }

    /**
     * Reads review config payload only if it is a non-null object.
     *
     * @param input Raw payload.
     * @param fields Validation accumulator.
     * @returns Payload object or undefined.
     */
    private readPayloadObject(
        input: unknown,
        fields: IValidationErrorField[],
    ): Readonly<Record<string, unknown>> | undefined {
        if (typeof input !== "object" || input === null || Array.isArray(input)) {
            fields.push({
                field: "config",
                message: "must be a non-null object",
            })
            return undefined
        }

        return input as Readonly<Record<string, unknown>>
    }

    /**
     * Normalizes top-level configuration payload.
     *
     * @param payload Raw payload.
     * @param fields Error accumulator.
     * @returns Normalized config payload or undefined.
     */
    private normalizeConfig(
        payload: Readonly<Record<string, unknown>>,
        fields: IValidationErrorField[],
    ): ValidatedConfig | undefined {
        const severityThreshold = this.validateSeverityThreshold(payload["severityThreshold"], fields)
        const ignorePaths = this.validateStringArray(payload["ignorePaths"], "ignorePaths", fields)
        const maxSuggestionsPerFile = this.validatePositiveInteger(
            payload["maxSuggestionsPerFile"],
            "maxSuggestionsPerFile",
            fields,
        )
        const maxSuggestionsPerCCR = this.validatePositiveInteger(
            payload["maxSuggestionsPerCCR"],
            "maxSuggestionsPerCCR",
            fields,
        )
        const cadence = this.validateRequiredString(payload["cadence"], "cadence", fields)
        const customRuleIds = this.validateStringArray(payload["customRuleIds"], "customRuleIds", fields)
        const reviewDepthStrategy = this.validateReviewDepthStrategy(payload["reviewDepthStrategy"], fields)
        const directories = this.validateDirectories(payload["directories"], fields)
        const promptOverrides = this.validatePromptOverrides(payload["promptOverrides"], fields)

        const requiredValues = [
            severityThreshold,
            ignorePaths,
            maxSuggestionsPerFile,
            maxSuggestionsPerCCR,
            cadence,
            customRuleIds,
            reviewDepthStrategy,
            directories,
        ]

        if (requiredValues.some((value) => value === undefined) || fields.length > 0) {
            return undefined
        }

        const normalizedConfig: ValidatedConfig = {
            severityThreshold: severityThreshold as string,
            ignorePaths: ignorePaths as readonly string[],
            maxSuggestionsPerFile: maxSuggestionsPerFile as number,
            maxSuggestionsPerCCR: maxSuggestionsPerCCR as number,
            cadence: cadence as string,
            customRuleIds: customRuleIds as readonly string[],
            reviewDepthStrategy: reviewDepthStrategy as ReviewDepthStrategy,
            directories: directories as readonly IDirectoryConfig[],
            ...(promptOverrides === undefined ? {} : {promptOverrides}),
        }

        return normalizedConfig
    }

    /**
     * Validates severity threshold and normalizes to uppercase enum.
     *
     * @param value Raw value.
     * @param fields Error accumulator.
     * @returns Normalized severity or undefined.
     */
    private validateSeverityThreshold(
        value: unknown,
        fields: IValidationErrorField[],
    ): IReviewConfigDTO["severityThreshold"] | undefined {
        if (typeof value !== "string") {
            fields.push({
                field: "severityThreshold",
                message: "must be a string",
            })
            return undefined
        }

        const normalized = value.trim().toUpperCase()
        if (!ALLOWED_SEVERITY_THRESHOLDS.includes(normalized as (typeof ALLOWED_SEVERITY_THRESHOLDS)[number])) {
            fields.push({
                field: "severityThreshold",
                message: "must be one of LOW | MEDIUM | HIGH | CRITICAL",
            })
            return undefined
        }

        return normalized
    }

    /**
     * Validates required non-empty string field.
     *
     * @param value Raw value.
     * @param fieldName Field name.
     * @param fields Error accumulator.
     * @returns Normalized string or undefined.
     */
    private validateRequiredString(
        value: unknown,
        fieldName: string,
        fields: IValidationErrorField[],
    ): string | undefined {
        if (typeof value !== "string" || value.trim().length === 0) {
            fields.push({
                field: fieldName,
                message: "must be a non-empty string",
            })
            return undefined
        }

        return value.trim()
    }

    /**
     * Validates positive integer field.
     *
     * @param value Raw value.
     * @param fieldName Field name.
     * @param fields Error accumulator.
     * @returns Positive integer or undefined.
     */
    private validatePositiveInteger(
        value: unknown,
        fieldName: string,
        fields: IValidationErrorField[],
    ): number | undefined {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
            fields.push({
                field: fieldName,
                message: "must be an integer greater than or equal to 1",
            })
            return undefined
        }

        return value
    }

    /**
     * Validates string array field and trims each item.
     *
     * @param value Raw value.
     * @param fieldName Field name.
     * @param fields Error accumulator.
     * @returns Trimmed string array or undefined.
     */
    private validateStringArray(
        value: unknown,
        fieldName: string,
        fields: IValidationErrorField[],
    ): readonly string[] | undefined {
        if (!Array.isArray(value)) {
            fields.push({
                field: fieldName,
                message: "must be an array of non-empty strings",
            })
            return undefined
        }

        const normalizedValues: string[] = []
        for (const item of value) {
            if (typeof item !== "string" || item.trim().length === 0) {
                fields.push({
                    field: fieldName,
                    message: "must contain only non-empty strings",
                })
                return undefined
            }
            normalizedValues.push(item.trim())
        }

        return normalizedValues
    }

    /**
     * Validates review depth strategy.
     *
     * @param value Raw strategy value.
     * @param fields Error accumulator.
     * @returns Normalized review depth strategy or undefined.
     */
    private validateReviewDepthStrategy(
        value: unknown,
        fields: IValidationErrorField[],
    ): ReviewDepthStrategy | undefined {
        if (value === undefined) {
            return REVIEW_DEPTH_STRATEGY.AUTO
        }

        if (typeof value !== "string") {
            fields.push({
                field: "reviewDepthStrategy",
                message: "must be one of auto | always-light | always-heavy",
            })
            return undefined
        }

        const normalized = value.trim()
        if (
            !Object.values(REVIEW_DEPTH_STRATEGY).includes(
                normalized as (typeof REVIEW_DEPTH_STRATEGY)[keyof typeof REVIEW_DEPTH_STRATEGY],
            )
        ) {
            fields.push({
                field: "reviewDepthStrategy",
                message: "must be one of auto | always-light | always-heavy",
            })
            return undefined
        }

        return normalized as ReviewDepthStrategy
    }

    /**
     * Validates per-directory review config overrides.
     *
     * @param value Raw directories value.
     * @param fields Error accumulator.
     * @returns Normalized directory configs or undefined.
     */
    private validateDirectories(
        value: unknown,
        fields: IValidationErrorField[],
    ): readonly IDirectoryConfig[] | undefined {
        if (value === undefined) {
            return []
        }

        if (Array.isArray(value) === false) {
            fields.push({
                field: "directories",
                message: "must be an array of directory configs",
            })
            return undefined
        }

        const normalized: IDirectoryConfig[] = []
        for (const directoryConfig of value) {
            const parsedDirectoryConfig = this.validateDirectoryConfig(directoryConfig, fields)
            if (parsedDirectoryConfig === undefined) {
                return undefined
            }

            normalized.push(parsedDirectoryConfig)
        }

        return normalized
    }

    /**
     * Validates one directory config entry.
     *
     * @param value Raw directory config value.
     * @param fields Error accumulator.
     * @returns Parsed config or undefined.
     */
    private validateDirectoryConfig(
        value: unknown,
        fields: IValidationErrorField[],
    ): IDirectoryConfig | undefined {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            fields.push({
                field: "directories[]",
                message: "must be an object with path and config",
            })
            return undefined
        }

        const raw = value as Readonly<Record<string, unknown>>

        const path = this.validateDirectoryPath(raw["path"], fields)
        if (path === undefined) {
            return undefined
        }

        const config = this.validateDirectoryConfigPayload(raw["config"], fields)
        if (config === undefined) {
            return undefined
        }

        return {path, config}
    }

    /**
     * Validates per-directory config payload.
     *
     * @param value Raw nested config object.
     * @param fields Error accumulator.
     * @returns Normalized partial review config.
     */
    private validateDirectoryConfigPayload(
        value: unknown,
        fields: IValidationErrorField[],
    ): Partial<IReviewConfigDTO> | undefined {
        if (value === undefined) {
            fields.push({
                field: "directories[].config",
                message: "must be an object",
            })
            return undefined
        }

        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            fields.push({
                field: "directories[].config",
                message: "must be an object",
            })
            return undefined
        }

        const record = value as Readonly<Record<string, unknown>>
        const result: {
            severityThreshold?: string
            ignorePaths?: readonly string[]
            maxSuggestionsPerFile?: number
            maxSuggestionsPerCCR?: number
            cadence?: string
            customRuleIds?: readonly string[]
            reviewDepthStrategy?: ReviewDepthStrategy
            promptOverrides?: IReviewPromptOverridesDTO
        } = {}

        this.setOptionalNormalizedValue(
            this.normalizeOptionalSeverityThreshold(record["severityThreshold"]),
            (nextValue) => {
                result.severityThreshold = nextValue
            },
        )

        this.setOptionalNormalizedValue(this.normalizeOptionalStringArray(record["ignorePaths"]), (nextValue) => {
            result.ignorePaths = nextValue
        })

        this.setOptionalNormalizedValue(
            this.normalizeOptionalPositiveInteger(record["maxSuggestionsPerFile"]),
            (nextValue) => {
                result.maxSuggestionsPerFile = nextValue
            },
        )

        this.setOptionalNormalizedValue(
            this.normalizeOptionalPositiveInteger(record["maxSuggestionsPerCCR"]),
            (nextValue) => {
                result.maxSuggestionsPerCCR = nextValue
            },
        )

        this.setOptionalNormalizedValue(this.normalizeOptionalString(record["cadence"]), (nextValue) => {
            result.cadence = nextValue
        })

        this.setOptionalNormalizedValue(this.normalizeOptionalStringArray(record["customRuleIds"]), (nextValue) => {
            result.customRuleIds = nextValue
        })

        this.setOptionalNormalizedValue(
            this.normalizeOptionalReviewDepthStrategy(record["reviewDepthStrategy"]),
            (nextValue) => {
                result.reviewDepthStrategy = nextValue
            },
        )

        const promptOverrides = this.validatePromptOverrides(record["promptOverrides"], fields)
        if (promptOverrides !== undefined) {
            result.promptOverrides = promptOverrides
        }

        return result
    }

    /**
     * Validates required directory path field.
     *
     * @param value Raw path value.
     * @param fields Error accumulator.
     * @returns Normalized path or undefined.
     */
    private validateDirectoryPath(value: unknown, fields: IValidationErrorField[]): string | undefined {
        if (typeof value !== "string") {
            fields.push({
                field: "directories[].path",
                message: "must be a non-empty string",
            })
            return undefined
        }

        const path = value.trim()
        if (path.length === 0) {
            fields.push({
                field: "directories[].path",
                message: "must be a non-empty string",
            })
            return undefined
        }

        return path
    }

    /**
     * Validates optional prompt overrides shape.
     *
     * @param value Raw prompt overrides value.
     * @param fields Error accumulator.
     * @returns Normalized prompt overrides or undefined.
     */
    private validatePromptOverrides(
        value: unknown,
        fields: IValidationErrorField[],
    ): IReviewPromptOverridesDTO | undefined {
        if (value === undefined) {
            return undefined
        }

        if (value === null || typeof value !== "object" || Array.isArray(value)) {
            fields.push({
                field: "promptOverrides",
                message: "must be an object with optional string fields",
            })
            return undefined
        }

        const record = value as Readonly<Record<string, unknown>>
        const systemPrompt = this.validateOptionalString(record["systemPrompt"], "promptOverrides.systemPrompt", fields)
        const reviewerPrompt = this.validateOptionalString(
            record["reviewerPrompt"],
            "promptOverrides.reviewerPrompt",
            fields,
        )
        const summaryPrompt = this.validateOptionalString(
            record["summaryPrompt"],
            "promptOverrides.summaryPrompt",
            fields,
        )

        return {
            ...(systemPrompt === undefined ? {} : {systemPrompt}),
            ...(reviewerPrompt === undefined ? {} : {reviewerPrompt}),
            ...(summaryPrompt === undefined ? {} : {summaryPrompt}),
        }
    }

    /**
     * Validates optional string value.
     *
     * @param value Raw value.
     * @param fieldName Field name.
     * @param fields Error accumulator.
     * @returns Trimmed string or undefined.
     */
    private validateOptionalString(
        value: unknown,
        fieldName: string,
        fields: IValidationErrorField[],
    ): string | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string" || value.trim().length === 0) {
            fields.push({
                field: fieldName,
                message: "must be a non-empty string when provided",
            })
            return undefined
        }

        return value.trim()
    }

    /**
     * Validates optional required-like string value.
     *
     * @param value Raw value.
     * @returns Normalized string or undefined.
     */
    private normalizeOptionalString(value: unknown): string | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string" || value.trim().length === 0) {
            return undefined
        }

        return value.trim()
    }

    /**
     * Validates optional array of non-empty strings.
     *
     * @param value Raw value.
     * @returns Normalized array or undefined.
     */
    private normalizeOptionalStringArray(value: unknown): readonly string[] | undefined {
        if (value === undefined) {
            return undefined
        }

        if (Array.isArray(value) === false) {
            return undefined
        }

        const normalizedValues: string[] = []
        for (const item of value) {
            if (typeof item !== "string" || item.trim().length === 0) {
                return undefined
            }

            normalizedValues.push(item.trim())
        }

        return normalizedValues
    }

    /**
     * Validates optional positive integer.
     *
     * @param value Raw value.
     * @returns Normalized number or undefined.
     */
    private normalizeOptionalPositiveInteger(value: unknown): number | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "number" || Number.isInteger(value) === false || value < 1) {
            return undefined
        }

        return value
    }

    /**
     * Validates optional severity threshold with uppercase normalization.
     *
     * @param value Raw value.
     * @returns Normalized threshold or undefined.
     */
    private normalizeOptionalSeverityThreshold(value: unknown): IReviewConfigDTO["severityThreshold"] | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim().toUpperCase()
        if (
            !ALLOWED_SEVERITY_THRESHOLDS.includes(
                normalized as (typeof ALLOWED_SEVERITY_THRESHOLDS)[number],
            )
        ) {
            return undefined
        }

        return normalized
    }

    /**
     * Validates optional review depth strategy.
     *
     * @param value Raw strategy value.
     * @returns Normalized strategy or undefined.
     */
    private normalizeOptionalReviewDepthStrategy(value: unknown): ReviewDepthStrategy | undefined {
        if (value === undefined) {
            return undefined
        }

        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim()
        if (
            !Object.values(REVIEW_DEPTH_STRATEGY).includes(
                normalized as (typeof REVIEW_DEPTH_STRATEGY)[keyof typeof REVIEW_DEPTH_STRATEGY],
            )
        ) {
            return undefined
        }

        return normalized as ReviewDepthStrategy
    }

    /**
     * Writes normalized value when present.
     *
     * @param nextValue Parsed value.
     * @param assign Setter for destination field.
     * @template T Parsed type.
     */
    private setOptionalNormalizedValue<T>(
        nextValue: T | undefined,
        assign: (value: T) => void,
    ): void {
        if (nextValue === undefined) {
            return
        }
        assign(nextValue)
    }

    /**
     * Keeps adapter-specific values that are not part of core schema.
     *
     * @param payload Raw payload.
     * @returns Copy of unknown top-level fields.
     */
    private pickUnknownFields(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
        const base: Record<string, unknown> = {}
        const knownKeys = new Set<string>(REVIEW_CONFIG_KEYS)

        for (const [key, value] of Object.entries(payload)) {
            if (knownKeys.has(key)) {
                continue
            }
            base[key] = this.cloneValue(value)
        }

        return base
    }

    /**
     * Clones object values recursively.
     *
     * @param value Source value.
     * @returns Cloned value.
     */
    private cloneValue(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) => this.cloneValue(item))
        }

        if (typeof value === "object" && value !== null) {
            const clone: Record<string, unknown> = {}
            for (const [entryKey, entryValue] of Object.entries(value)) {
                clone[entryKey] = this.cloneValue(entryValue)
            }
            return clone
        }

        return value
    }
}
