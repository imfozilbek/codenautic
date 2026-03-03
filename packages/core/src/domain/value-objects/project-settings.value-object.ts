import {Severity, type SeverityLevel, SEVERITY_LEVEL} from "./severity.value-object"

export const PROJECT_CADENCE = {
    AUTOMATIC: "automatic",
    MANUAL: "manual",
    AUTO_PAUSE: "auto-pause",
} as const

export type ProjectCadence = (typeof PROJECT_CADENCE)[keyof typeof PROJECT_CADENCE]

export const PROJECT_SETTINGS_LIMIT = {
    AUTO_PAUSE_THRESHOLD: "autoPauseThreshold",
} as const

export type ProjectSettingsLimitKey = (typeof PROJECT_SETTINGS_LIMIT)[keyof typeof PROJECT_SETTINGS_LIMIT]

/**
 * Repository-scoped configuration with optional overrides.
 */
export interface IRepositoryConfigInput {
    severity?: string
    ignorePaths?: readonly string[]
    cadence?: string
    limits?: Record<string, number>
    customRuleIds?: readonly string[]
    promptOverrides?: Record<string, unknown>
}

/**
 * Full repository configuration shape after defaults are applied.
 */
export interface IRepositoryConfig {
    severity: SeverityLevel
    ignorePaths: readonly string[]
    cadence: ProjectCadence
    limits: Record<string, number>
    customRuleIds: readonly string[]
    promptOverrides: Record<string, unknown>
}

export interface IProjectSettingsInput extends IRepositoryConfigInput {}

export interface IProjectSettingsProps extends IRepositoryConfig {}

/**
 * Project-specific settings value object.
 */
export class ProjectSettings {
    private readonly settings: IProjectSettingsProps

    /**
     * Creates immutable project settings.
     *
     * @param input Raw settings payload.
     * @returns Parsed settings.
     */
    private constructor(input: IProjectSettingsProps) {
        this.settings = cloneSettings(input)
        Object.freeze(this.settings)
        Object.freeze(this)
    }

    /**
     * Creates project settings from partial input.
     *
     * @param input Raw settings.
     * @returns Project settings with defaults and normalization.
     */
    public static create(input: IProjectSettingsInput = {}): ProjectSettings {
        return new ProjectSettings({
            severity: normalizeSeverity(input.severity),
            ignorePaths: normalizeIgnorePaths(input.ignorePaths),
            cadence: normalizeCadence(input.cadence),
            limits: normalizeLimits(input.limits),
            customRuleIds: normalizeRuleIds(input.customRuleIds),
            promptOverrides: normalizePromptOverrides(input.promptOverrides),
        })
    }

    /**
     * Severity threshold value.
     */
    public get severity(): SeverityLevel {
        return this.settings.severity
    }

    /**
     * Ignored path patterns.
     */
    public get ignorePaths(): readonly string[] {
        return [...this.settings.ignorePaths]
    }

    /**
     * Review cadence mode.
     */
    public get cadence(): ProjectCadence {
        return this.settings.cadence
    }

    /**
     * Arbitrary project limits map.
     */
    public get limits(): Record<string, number> {
        return {...this.settings.limits}
    }

    /**
     * Custom rules assigned to project scope.
     */
    public get customRuleIds(): readonly string[] {
        return [...this.settings.customRuleIds]
    }

    /**
     * Prompt override map.
     */
    public get promptOverrides(): Record<string, unknown> {
        return {...this.settings.promptOverrides}
    }

    /**
     * Merges current settings with a patch.
     *
     * @param patch Update patch.
     * @returns Updated settings value object.
     */
    public merge(patch: IProjectSettingsInput): ProjectSettings {
        return ProjectSettings.create({
            severity: patch.severity ?? this.settings.severity,
            ignorePaths: patch.ignorePaths ?? this.settings.ignorePaths,
            cadence: patch.cadence ?? this.settings.cadence,
            limits: patch.limits ?? this.settings.limits,
            customRuleIds: patch.customRuleIds ?? this.settings.customRuleIds,
            promptOverrides: patch.promptOverrides ?? this.settings.promptOverrides,
        })
    }

    /**
     * Serializes settings for persistence.
     */
    public toJSON(): IProjectSettingsProps {
        return {
            severity: this.severity,
            ignorePaths: this.ignorePaths,
            cadence: this.cadence,
            limits: this.limits,
            customRuleIds: this.customRuleIds,
            promptOverrides: this.promptOverrides,
        }
    }
}

/**
 * Default settings fallback.
 */
const DEFAULT_SETTINGS: IRepositoryConfig = {
    severity: SEVERITY_LEVEL.LOW,
    ignorePaths: [],
    cadence: PROJECT_CADENCE.AUTOMATIC,
    limits: {},
    customRuleIds: [],
    promptOverrides: {},
}

/**
 * Normalizes severity value.
 */
function normalizeSeverity(severity: string | undefined): SeverityLevel {
    if (severity === undefined) {
        return DEFAULT_SETTINGS.severity
    }

    const normalizedSeverity = severity.trim()
    if (normalizedSeverity.length === 0) {
        throw new Error("Project severity cannot be empty")
    }

    return Severity.create(normalizedSeverity).toString()
}

/**
 * Normalizes ignore path list.
 */
function normalizeIgnorePaths(ignorePaths: readonly string[] | undefined): string[] {
    const normalizedPaths = (ignorePaths ?? []).map((path) => {
        const normalizedPath = path.trim()
        if (normalizedPath.length === 0) {
            throw new Error("ignorePaths contains empty value")
        }

        return normalizedPath
    })

    const uniquePaths = new Map<string, string>()

    for (const ignorePath of normalizedPaths) {
        uniquePaths.set(ignorePath, ignorePath)
    }

    return [...uniquePaths.values()]
}

/**
 * Normalizes cadence.
 */
function normalizeCadence(cadence: string | undefined): ProjectCadence {
    if (cadence === undefined) {
        return DEFAULT_SETTINGS.cadence
    }

    const normalizedCadence = cadence.trim().toLowerCase()

    if (!isKnownCadence(normalizedCadence)) {
        throw new Error(`Unknown project cadence: ${cadence}`)
    }

    return normalizedCadence
}

/**
 * Normalizes limits object.
 */
function normalizeLimits(limits: Record<string, number> | undefined): Record<string, number> {
    if (limits === undefined) {
        return {...DEFAULT_SETTINGS.limits}
    }

    if (typeof limits !== "object" || limits === null) {
        throw new Error("Project limits must be an object")
    }

    const result: Record<string, number> = {}

    for (const [key, value] of Object.entries(limits)) {
        const normalizedKey = key.trim()
        if (normalizedKey.length === 0) {
            throw new Error("Project limit key cannot be empty")
        }

        if (typeof value !== "number" || Number.isNaN(value)) {
            throw new Error(`Project limit ${key} must be a number`)
        }

        result[normalizedKey] = value
    }

    return result
}

/**
 * Normalizes rule ids.
 */
function normalizeRuleIds(ruleIds: readonly string[] | undefined): string[] {
    const normalizedRuleIds = (ruleIds ?? []).map((ruleId) => {
        const normalizedRuleId = ruleId.trim()
        if (normalizedRuleId.length === 0) {
            throw new Error("Project rule id cannot be empty")
        }

        return normalizedRuleId
    })

    const uniqueRuleIds = new Map<string, string>()
    for (const ruleId of normalizedRuleIds) {
        uniqueRuleIds.set(ruleId, ruleId)
    }

    return [...uniqueRuleIds.values()]
}

/**
 * Normalizes prompt overrides map.
 */
function normalizePromptOverrides(
    promptOverrides: Record<string, unknown> | undefined,
): Record<string, unknown> {
    if (promptOverrides === undefined) {
        return {...DEFAULT_SETTINGS.promptOverrides}
    }

    if (typeof promptOverrides !== "object" || promptOverrides === null) {
        throw new Error("Project promptOverrides must be an object")
    }

    return {...promptOverrides}
}

/**
 * Checks known cadence value.
 */
function isKnownCadence(value: string): value is ProjectCadence {
    return Object.values(PROJECT_CADENCE).includes(value as ProjectCadence)
}

/**
 * Clone helper to keep immutability.
 */
function cloneSettings(input: IProjectSettingsProps): IProjectSettingsProps {
    return {
        severity: input.severity,
        ignorePaths: [...input.ignorePaths],
        cadence: input.cadence,
        limits: {...input.limits},
        customRuleIds: [...input.customRuleIds],
        promptOverrides: {...input.promptOverrides},
    }
}
