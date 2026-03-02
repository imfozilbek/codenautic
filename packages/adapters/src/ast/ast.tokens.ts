import {createToken} from "@codenautic/core"

import {RegexAstParserAdapter} from "./parsers/regex-ast-parser.adapter"

/**
 * AST domain IoC tokens.
 */
export const AST_TOKENS = {
    Parser: createToken<RegexAstParserAdapter>("adapters.ast.parser"),
} as const
