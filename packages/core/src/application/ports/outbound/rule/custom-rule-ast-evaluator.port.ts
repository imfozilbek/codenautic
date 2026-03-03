import type {CustomRule} from "../../../../domain/entities/custom-rule.entity"

/**
 * Match returned by an AST custom rule evaluator.
 */
export interface ICustomRuleAstMatch {
    readonly filePath?: string
    readonly lineStart?: unknown
    readonly lineEnd?: unknown
    readonly message?: string
    readonly severity?: string
    readonly category?: string
    readonly codeBlock?: string
    readonly committable?: unknown
    readonly rankScore?: unknown
}

/**
 * Target payload for AST rule evaluation.
 */
export interface ICustomRuleAstTarget {
    readonly filePath: string
    readonly content: string
}

/**
 * Port for AST-based custom rule evaluation.
 */
export interface ICustomRuleAstEvaluator {
    /**
     * Executes AST query against target content.
     *
 * @param rule Rule descriptor.
     * @param target Target payload.
     * @returns Matched suggestions.
     */
    execute(rule: CustomRule, target: ICustomRuleAstTarget): Promise<
        readonly ICustomRuleAstMatch[]
    >
}
