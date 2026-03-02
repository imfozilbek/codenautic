import {Container} from "@codenautic/core"

import {RegexAstParserAdapter} from "./parsers/regex-ast-parser.adapter"
import {AST_TOKENS} from "./ast.tokens"

/**
 * Optional dependency overrides for ast module registration.
 */
export interface IAstModuleOverrides {
    parser?: RegexAstParserAdapter
}

/**
 * Registers ast adapter module into target container.
 *
 * @param container Target IoC container.
 * @param overrides Optional dependency overrides.
 * @returns Same container instance for chaining.
 */
export function registerAstModule(
    container: Container,
    overrides: IAstModuleOverrides = {},
): Container {
    container.bindSingleton(AST_TOKENS.Parser, () => {
        return overrides.parser ?? new RegexAstParserAdapter()
    })

    return container
}
