import {OrganizationId} from "../value-objects/organization-id.value-object"
import {Severity} from "../value-objects/severity.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {Entity} from "./entity"

/** Supported scopes for library rules. */
export const LIBRARY_RULE_SCOPE = {
    FILE: "FILE",
    PULL_REQUEST: "PULL_REQUEST",
} as const

/** Scope type for library rules. */
export type LibraryRuleScope =
    (typeof LIBRARY_RULE_SCOPE)[keyof typeof LIBRARY_RULE_SCOPE]

/** Single example fixture for a rule. */
export interface ILibraryRuleExample {
    /** Example source snippet. */
    readonly snippet: string

    /** Whether example is correct for rule. */
    readonly isCorrect: boolean
}

/** Library rule state. */
export interface ILibraryRuleProps {
    /** Natural library rule identifier. */
    readonly uuid: string

    /** Human-readable rule title. */
    readonly title: string

    /** Rule instruction text. */
    readonly rule: string

    /** Why this rule matters. */
    readonly whyIsThisImportant: string

    /** Severity associated with this rule. */
    readonly severity: Severity

    /** Example snippets and expected correctness. */
    readonly examples: readonly ILibraryRuleExample[]

    /** Target language, e.g. "*", "ts", "python", "Dockerfile". */
    readonly language: string

    /** Related quality buckets for reporting and grouping. */
    readonly buckets: readonly string[]

    /** Rule applicability scope. */
    readonly scope: LibraryRuleScope

    /** Predefined heuristic plug-and-play marker. */
    readonly plugAndPlay: boolean

    /** True for global rules, false for organization-scoped rules. */
    readonly isGlobal: boolean

    /** Optional owner scope when not global. */
    readonly organizationId?: OrganizationId
}

/**
 * Domain entity for rules library.
 */
export class LibraryRule extends Entity<ILibraryRuleProps> {
    /**
     * Creates library rule.
     *
     * @param id Entity identifier.
     * @param props Rule state.
     */
    public constructor(id: UniqueId, props: ILibraryRuleProps) {
        super(id, {
            uuid: normalizeUuid(props.uuid),
            title: normalizeText(props.title, "Rule title"),
            rule: normalizeText(props.rule, "Rule text"),
            whyIsThisImportant: normalizeText(
                props.whyIsThisImportant,
                "Why is this rule important",
            ),
            severity: props.severity,
            examples: normalizeExamples(props.examples),
            language: normalizeLanguage(props.language),
            buckets: normalizeBuckets(props.buckets),
            scope: normalizeScope(props.scope),
            plugAndPlay: props.plugAndPlay,
            isGlobal: props.isGlobal,
            organizationId: props.organizationId,
        })

        this.ensureScopeConsistency()
    }

    /**
     * Natural rule UUID.
     *
     * @returns Rule identifier.
     */
    public get uuid(): string {
        return this.props.uuid
    }

    /**
     * Rule title.
     *
     * @returns Normalized title.
     */
    public get title(): string {
        return this.props.title
    }

    /**
     * Rule expression.
     *
     * @returns Rule text.
     */
    public get rule(): string {
        return this.props.rule
    }

    /**
     * Why rule matters.
     *
     * @returns Rule motivation.
     */
    public get whyIsThisImportant(): string {
        return this.props.whyIsThisImportant
    }

    /**
     * Rule severity.
     *
     * @returns Severity value.
     */
    public get severity(): Severity {
        return this.props.severity
    }

    /**
     * Rule examples.
     *
     * @returns Copy of examples array.
     */
    public get examples(): readonly ILibraryRuleExample[] {
        return [...this.props.examples]
    }

    /**
     * Target language.
     *
     * @returns Normalized language.
     */
    public get language(): string {
        return this.props.language
    }

    /**
     * Coverage buckets.
     *
     * @returns Copy of bucket names.
     */
    public get buckets(): readonly string[] {
        return [...this.props.buckets]
    }

    /**
     * Rule scope.
     *
     * @returns Rule scope.
     */
    public get scope(): LibraryRuleScope {
        return this.props.scope
    }

    /**
     * Plug-and-play flag.
     *
     * @returns True for built-in suggested defaults.
     */
    public get plugAndPlay(): boolean {
        return this.props.plugAndPlay
    }

    /**
     * Global flag.
     *
     * @returns True when rule is global.
     */
    public get isGlobal(): boolean {
        return this.props.isGlobal
    }

    /**
     * Optional organization scope.
     *
     * @returns Organization identifier when scoped.
     */
    public get organizationId(): OrganizationId | undefined {
        return this.props.organizationId
    }

    /**
     * Validates consistent scope ownership.
     */
    private ensureScopeConsistency(): void {
        if (this.props.isGlobal === true && this.props.organizationId !== undefined) {
            throw new Error("Global rules cannot have organizationId")
        }

        if (this.props.isGlobal === false && this.props.organizationId === undefined) {
            throw new Error("Organization-scoped rule must include organizationId")
        }
    }
}

/**
 * Normalizes required text field.
 *
 * @param value Raw value.
 * @param fieldName Field for error message.
 * @returns Normalized value.
 */
function normalizeText(value: string, fieldName: string): string {
    if (typeof value !== "string") {
        throw new Error(`${fieldName} cannot be empty`)
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(`${fieldName} cannot be empty`)
    }

    return normalized
}

/**
 * Normalizes UUID.
 *
 * @param uuid Raw UUID.
 * @returns Normalized UUID.
 */
function normalizeUuid(uuid: string): string {
    return normalizeText(uuid, "Rule uuid")
}

/**
 * Normalizes rule scope.
 *
 * @param scope Raw scope.
 * @returns Normalized scope.
 */
function normalizeScope(scope: string): LibraryRuleScope {
    if (typeof scope !== "string") {
        throw new Error("Unknown rule scope")
    }

    const normalized = scope.trim().toUpperCase()
    const supported = Object.values(LIBRARY_RULE_SCOPE)

    if (supported.includes(normalized as LibraryRuleScope) === false) {
        throw new Error(`Unknown rule scope: ${scope}`)
    }

    return normalized as LibraryRuleScope
}

/**
 * Normalizes language value.
 *
 * @param language Raw language filter.
 * @returns Normalized language.
 */
function normalizeLanguage(language: string): string {
    const normalized = normalizeText(language, "Rule language")
    if (normalized === "*") {
        return normalized
    }

    return normalized.toLowerCase()
}

/**
 * Normalizes bucket list.
 *
 * @param buckets Raw buckets.
 * @returns Cleaned and deduplicated buckets.
 */
function normalizeBuckets(buckets: readonly string[]): readonly string[] {
    const normalized: string[] = []
    const seen = new Set<string>()

    for (const bucket of buckets) {
        if (typeof bucket !== "string") {
            throw new Error("Rule bucket must be a non-empty string")
        }

        const normalizedBucket = bucket.trim()
        if (normalizedBucket.length === 0) {
            throw new Error("Rule bucket cannot be empty")
        }

        if (seen.has(normalizedBucket) === false) {
            seen.add(normalizedBucket)
            normalized.push(normalizedBucket)
        }
    }

    if (normalized.length === 0) {
        throw new Error("Rule must have at least one bucket")
    }

    return normalized
}

/**
 * Normalizes example fixtures.
 *
 * @param examples Raw examples.
 * @returns Normalized examples.
 */
function normalizeExamples(
    examples: readonly ILibraryRuleExample[],
): readonly ILibraryRuleExample[] {
    const normalized: ILibraryRuleExample[] = []

    for (const example of examples) {
        if (typeof example.snippet !== "string") {
            throw new Error("Example snippet cannot be empty")
        }
        const snippet = example.snippet.trim()
        if (snippet.length === 0) {
            throw new Error("Example snippet cannot be empty")
        }

        normalized.push({
            snippet,
            isCorrect: example.isCorrect,
        })
    }

    return normalized
}
