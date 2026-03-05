import {Severity} from "../value-objects/severity.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {Entity} from "./entity"

/**
 * Supported custom rule source types.
 */
export const CUSTOM_RULE_TYPE = {
    REGEX: "REGEX",
    PROMPT: "PROMPT",
    AST: "AST",
} as const

/**
 * Type of custom rule source.
 */
export type CustomRuleType = (typeof CUSTOM_RULE_TYPE)[keyof typeof CUSTOM_RULE_TYPE]

/**
 * Supported custom rule scope values.
 */
export const CUSTOM_RULE_SCOPE = {
    FILE: "FILE",
    CCR: "CCR",
} as const

/**
 * Scope of custom rule applicability.
 */
export type CustomRuleScope = (typeof CUSTOM_RULE_SCOPE)[keyof typeof CUSTOM_RULE_SCOPE]

/**
 * Supported custom rule lifecycle statuses.
 */
export const CUSTOM_RULE_STATUS = {
    ACTIVE: "ACTIVE",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    DELETED: "DELETED",
} as const

/**
 * Custom rule status.
 */
export type CustomRuleStatus = (typeof CUSTOM_RULE_STATUS)[keyof typeof CUSTOM_RULE_STATUS]

/**
 * Example fixture for a custom rule.
 */
export interface ICustomRuleExample {
    snippet: string
    isCorrect: boolean
}

/**
 * Custom rule state.
 */
export interface ICustomRuleProps {
    title: string
    rule: string
    type: CustomRuleType
    scope: CustomRuleScope
    severity: Severity
    status: CustomRuleStatus
    examples: readonly ICustomRuleExample[]
}

/**
 * Entity for custom rule management.
 */
export class CustomRule extends Entity<ICustomRuleProps> {
    /**
     * Creates custom rule entity.
     *
     * @param id Entity identifier.
     * @param props Rule state.
     */
    public constructor(id: UniqueId, props: ICustomRuleProps) {
        super(id, props)
        this.props.title = normalizeRequiredText(props.title, "Rule title cannot be empty")
        this.props.rule = normalizeRequiredText(props.rule, "Rule pattern cannot be empty")
        this.props.type = normalizeRuleType(props.type)
        this.props.scope = normalizeRuleScope(props.scope)
        this.props.status = normalizeRuleStatus(props.status)
        this.props.severity = props.severity
        this.props.examples = normalizeExamples(props.examples)
    }

    /**
     * Rule title.
     *
     * @returns Rule title.
     */
    public get title(): string {
        return this.props.title
    }

    /**
     * Rule body used for matching or prompting.
     *
     * @returns Rule source.
     */
    public get rule(): string {
        return this.props.rule
    }

    /**
     * Rule execution type.
     *
     * @returns Rule type.
     */
    public get type(): CustomRuleType {
        return this.props.type
    }

    /**
     * Rule scope.
     *
     * @returns Rule scope.
     */
    public get scope(): CustomRuleScope {
        return this.props.scope
    }

    /**
     * Rule severity.
     *
     * @returns Rule severity.
     */
    public get severity(): Severity {
        return this.props.severity
    }

    /**
     * Rule lifecycle status.
     *
     * @returns Current status.
     */
    public get status(): CustomRuleStatus {
        return this.props.status
    }

    /**
     * Rule examples.
     *
     * @returns Copy of examples list.
     */
    public get examples(): readonly ICustomRuleExample[] {
        return [...this.props.examples]
    }

    /**
     * Activates rule.
     */
    public activate(): void {
        if (this.props.status === CUSTOM_RULE_STATUS.DELETED) {
            throw new Error("Deleted rule cannot be activated")
        }

        if (this.props.status !== CUSTOM_RULE_STATUS.PENDING) {
            throw new Error(`Cannot activate rule in status ${this.props.status}`)
        }

        this.props.status = CUSTOM_RULE_STATUS.ACTIVE
    }

    /**
     * Rejects rule.
     */
    public reject(): void {
        if (this.props.status === CUSTOM_RULE_STATUS.DELETED) {
            throw new Error("Deleted rule cannot be rejected")
        }

        if (this.props.status !== CUSTOM_RULE_STATUS.PENDING) {
            throw new Error(`Cannot reject rule in status ${this.props.status}`)
        }

        this.props.status = CUSTOM_RULE_STATUS.REJECTED
    }

    /**
     * Marks rule as deleted without hard removal.
     */
    public softDelete(): void {
        if (this.props.status === CUSTOM_RULE_STATUS.DELETED) {
            throw new Error("Rule is already deleted")
        }

        this.props.status = CUSTOM_RULE_STATUS.DELETED
    }

}

/**
 * Normalizes required string value.
 *
 * @param value Raw value.
 * @param errorMessage Error message.
 * @returns Trimmed value.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalized = value.trim()

    if (normalized.length === 0) {
        throw new Error(errorMessage)
    }

    return normalized
}

/**
 * Normalizes and validates rule type.
 *
 * @param value Raw value.
 * @returns Normalized rule type.
 */
function normalizeRuleType(value: string): CustomRuleType {
    const normalized = value.trim().toUpperCase()

    if (
        Object.values(CUSTOM_RULE_TYPE).includes(normalized as CustomRuleType) === false
    ) {
        throw new Error(`Unknown custom rule type: ${value}`)
    }

    return normalized as CustomRuleType
}

/**
 * Normalizes and validates rule scope.
 *
 * @param value Raw value.
 * @returns Normalized rule scope.
 */
function normalizeRuleScope(value: string): CustomRuleScope {
    const normalized = value.trim().toUpperCase()

    if (
        Object.values(CUSTOM_RULE_SCOPE).includes(normalized as CustomRuleScope) === false
    ) {
        throw new Error(`Unknown custom rule scope: ${value}`)
    }

    return normalized as CustomRuleScope
}

/**
 * Normalizes and validates rule status.
 *
 * @param value Raw value.
 * @returns Normalized rule status.
 */
function normalizeRuleStatus(value: string): CustomRuleStatus {
    const normalized = value.trim().toUpperCase()

    if (
        Object.values(CUSTOM_RULE_STATUS).includes(normalized as CustomRuleStatus) === false
    ) {
        throw new Error(`Unknown custom rule status: ${value}`)
    }

    return normalized as CustomRuleStatus
}

/**
 * Normalizes examples list.
 *
 * @param examples Examples.
 * @returns Normalized examples.
 */
function normalizeExamples(
    examples: readonly ICustomRuleExample[],
): ICustomRuleExample[] {
    return examples.map((example) => {
        const normalizedSnippet = example.snippet.trim()

        if (normalizedSnippet.length === 0) {
            throw new Error("Example snippet cannot be empty")
        }

        return {
            snippet: normalizedSnippet,
            isCorrect: example.isCorrect,
        }
    })
}
