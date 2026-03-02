import {Result} from "@codenautic/core"

import {
    AST_LANGUAGE,
    AST_NODE_KIND,
    type IAstNodeDto,
    type IAstParseRequest,
    type IAstParseResult,
} from "../contracts/ast.contract"
import {AST_ADAPTER_ERROR_CODE, AstAdapterError} from "../errors/ast-adapter.error"

interface IRegexMatcher {
    readonly kind: IAstNodeDto["kind"]
    readonly regex: RegExp
}

const TYPESCRIPT_MATCHERS: readonly IRegexMatcher[] = [
    {
        kind: AST_NODE_KIND.FUNCTION,
        regex: /^[ \t]*function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    },
    {
        kind: AST_NODE_KIND.CLASS,
        regex: /^[ \t]*class\s+([A-Za-z_$][\w$]*)/gm,
    },
    {
        kind: AST_NODE_KIND.INTERFACE,
        regex: /^[ \t]*interface\s+([A-Za-z_$][\w$]*)/gm,
    },
    {
        kind: AST_NODE_KIND.TYPE_ALIAS,
        regex: /^[ \t]*type\s+([A-Za-z_$][\w$]*)\s*=/gm,
    },
]

const JAVASCRIPT_MATCHERS: readonly IRegexMatcher[] = [
    {
        kind: AST_NODE_KIND.FUNCTION,
        regex: /^[ \t]*function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
    },
    {
        kind: AST_NODE_KIND.CLASS,
        regex: /^[ \t]*class\s+([A-Za-z_$][\w$]*)/gm,
    },
]

/**
 * Regex-based AST parser for baseline package foundation.
 */
export class RegexAstParserAdapter {
    /**
     * Creates regex AST parser adapter.
     */
    public constructor() {}

    /**
     * Parses source code into normalized AST node list.
     *
     * @param request AST parse request.
     * @returns Parse result with normalized node list.
     */
    public parse(request: IAstParseRequest): Result<IAstParseResult, AstAdapterError> {
        const sourceCode = normalizeSourceCode(request.sourceCode)
        if (sourceCode === undefined) {
            return Result.fail(
                createInvalidSourceError("sourceCode must be a non-empty string"),
            )
        }

        const matchers = resolveMatchers(request.language)
        if (matchers === undefined) {
            return Result.fail(createInvalidSourceError("Unsupported AST language"))
        }

        const lineBreakOffsets = computeLineBreakOffsets(sourceCode)
        const nodes = collectNodes(sourceCode, matchers, lineBreakOffsets)

        return Result.ok({
            language: request.language,
            filePath: request.filePath ?? "",
            nodes,
        })
    }
}

/**
 * Creates invalid source validation error.
 *
 * @param message Error message.
 * @returns AST adapter validation error.
 */
function createInvalidSourceError(message: string): AstAdapterError {
    return new AstAdapterError({
        code: AST_ADAPTER_ERROR_CODE.INVALID_SOURCE,
        message,
        retryable: false,
    })
}

/**
 * Normalizes source code value.
 *
 * @param sourceCode Source code value.
 * @returns Source code when non-empty.
 */
function normalizeSourceCode(sourceCode: unknown): string | undefined {
    if (typeof sourceCode !== "string") {
        return undefined
    }

    if (sourceCode.trim().length === 0) {
        return undefined
    }

    return sourceCode
}

/**
 * Resolves regex matcher set by language.
 *
 * @param language Requested language.
 * @returns Matchers list when language is supported.
 */
function resolveMatchers(language: string): readonly IRegexMatcher[] | undefined {
    if (language === AST_LANGUAGE.TYPESCRIPT) {
        return TYPESCRIPT_MATCHERS
    }
    if (language === AST_LANGUAGE.JAVASCRIPT) {
        return JAVASCRIPT_MATCHERS
    }

    return undefined
}

/**
 * Precomputes line break offsets for O(log n) line resolution.
 *
 * @param sourceCode Source code content.
 * @returns Array of newline character offsets.
 */
function computeLineBreakOffsets(sourceCode: string): readonly number[] {
    const offsets: number[] = []
    for (let index = 0; index < sourceCode.length; index += 1) {
        if (sourceCode[index] === "\n") {
            offsets.push(index)
        }
    }

    return offsets
}

/**
 * Collects nodes using language-specific regex matchers.
 *
 * @param sourceCode Source code content.
 * @param matchers Regex matcher list.
 * @param lineBreakOffsets Precomputed newline offsets.
 * @returns Sorted normalized node list.
 */
function collectNodes(
    sourceCode: string,
    matchers: readonly IRegexMatcher[],
    lineBreakOffsets: readonly number[],
): readonly IAstNodeDto[] {
    const nodes: IAstNodeDto[] = []
    for (const matcher of matchers) {
        matcher.regex.lastIndex = 0
        let match: RegExpExecArray | null = matcher.regex.exec(sourceCode)
        while (match !== null) {
            const name = match[1]
            if (name !== undefined) {
                const startOffset = match.index
                const startLine = resolveLineNumber(startOffset, lineBreakOffsets)
                nodes.push({
                    kind: matcher.kind,
                    name,
                    startLine,
                    endLine: startLine,
                })
            }
            match = matcher.regex.exec(sourceCode)
        }
    }

    return nodes.sort((first, second) => first.startLine - second.startLine)
}

/**
 * Resolves one-based line number by character offset.
 *
 * @param offset Character offset.
 * @param lineBreakOffsets Sorted newline offsets.
 * @returns One-based line number.
 */
function resolveLineNumber(offset: number, lineBreakOffsets: readonly number[]): number {
    let low = 0
    let high = lineBreakOffsets.length
    while (low < high) {
        const mid = Math.floor((low + high) / 2)
        const breakOffset = lineBreakOffsets[mid]
        if (breakOffset !== undefined && breakOffset < offset) {
            low = mid + 1
        } else {
            high = mid
        }
    }

    return low + 1
}
