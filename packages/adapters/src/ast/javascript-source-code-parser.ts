import Parser from "tree-sitter"
import JavaScript from "tree-sitter-javascript"

import {AST_LANGUAGE, type SupportedLanguage} from "@codenautic/core"

import {BaseParser} from "./base-parser"

/**
 * Supported JavaScript parser language variants.
 */
export type JavaScriptParserLanguage =
    | typeof AST_LANGUAGE.JAVASCRIPT
    | typeof AST_LANGUAGE.JSX

/**
 * Construction options for JavaScript-family source parser.
 */
export interface IJavaScriptSourceCodeParserOptions {
    /**
     * Canonical language variant exposed by parser.
     */
    readonly language: JavaScriptParserLanguage
}

/**
 * Dedicated tree-sitter parser for JavaScript and JSX source files.
 */
export class JavaScriptSourceCodeParser extends BaseParser {
    /**
     * Creates parser for JavaScript-family source files.
     *
     * @param options Canonical JavaScript language variant.
     */
    public constructor(options: IJavaScriptSourceCodeParserOptions) {
        const parser = new Parser()
        parser.setLanguage(resolveJavaScriptGrammar(options.language))

        super({
            language: options.language,
            parser,
        })
    }
}

/**
 * Resolves tree-sitter grammar module for JavaScript language variant.
 *
 * @param _language Canonical JavaScript family language.
 * @returns Tree-sitter grammar module.
 */
function resolveJavaScriptGrammar(
    _language: JavaScriptParserLanguage,
): Parser.Language {
    return JavaScript as unknown as Parser.Language
}

/**
 * Narrows supported language to JavaScript-family variant.
 *
 * @param language Canonical supported language.
 * @returns JavaScript family language variant.
 * @throws Error When language is not a JavaScript family member.
 */
export function assertJavaScriptParserLanguage(
    language: SupportedLanguage,
): JavaScriptParserLanguage {
    if (language === AST_LANGUAGE.JAVASCRIPT || language === AST_LANGUAGE.JSX) {
        return language
    }

    throw new Error(`Unsupported JavaScript parser language: ${language}`)
}
