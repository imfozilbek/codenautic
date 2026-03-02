/**
 * Supported languages for baseline AST parsing.
 */
export const AST_LANGUAGE = {
    TYPESCRIPT: "typescript",
    JAVASCRIPT: "javascript",
} as const

/**
 * AST language value.
 */
export type AstLanguage = (typeof AST_LANGUAGE)[keyof typeof AST_LANGUAGE]

/**
 * Supported normalized AST node kinds.
 */
export const AST_NODE_KIND = {
    FUNCTION: "function",
    CLASS: "class",
    INTERFACE: "interface",
    TYPE_ALIAS: "type_alias",
} as const

/**
 * AST node kind value.
 */
export type AstNodeKind = (typeof AST_NODE_KIND)[keyof typeof AST_NODE_KIND]

/**
 * AST parse request DTO.
 */
export interface IAstParseRequest {
    readonly language: AstLanguage
    readonly sourceCode: string
    readonly filePath?: string
}

/**
 * Normalized AST node DTO.
 */
export interface IAstNodeDto {
    readonly kind: AstNodeKind
    readonly name: string
    readonly startLine: number
    readonly endLine: number
}

/**
 * AST parse result DTO.
 */
export interface IAstParseResult {
    readonly language: AstLanguage
    readonly filePath: string
    readonly nodes: readonly IAstNodeDto[]
}
