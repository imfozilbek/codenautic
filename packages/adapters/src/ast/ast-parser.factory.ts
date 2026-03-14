import {
    AST_LANGUAGE,
    type ISourceCodeParser,
    type SupportedLanguage,
} from "@codenautic/core"

import {
    AST_PARSER_FACTORY_ERROR_CODE,
    AstParserFactoryError,
} from "./ast-parser-factory.error"
import {
    assertJavaScriptParserLanguage,
    JavaScriptSourceCodeParser,
} from "./javascript-source-code-parser"
import {
    assertGoParserLanguage,
    GoSourceCodeParser,
} from "./go-source-code-parser"
import {
    assertCSharpParserLanguage,
    CSharpSourceCodeParser,
} from "./csharp-source-code-parser"
import {
    assertJavaParserLanguage,
    JavaSourceCodeParser,
} from "./java-source-code-parser"
import {
    assertPhpParserLanguage,
    PhpSourceCodeParser,
} from "./php-source-code-parser"
import {
    assertRubyParserLanguage,
    RubySourceCodeParser,
} from "./ruby-source-code-parser"
import {
    assertRustParserLanguage,
    RustSourceCodeParser,
} from "./rust-source-code-parser"
import {
    assertTypeScriptParserLanguage,
    TypeScriptSourceCodeParser,
} from "./typescript-source-code-parser"
import {
    assertPythonParserLanguage,
    PythonSourceCodeParser,
} from "./python-source-code-parser"

type IAstParserCreator = () => ISourceCodeParser

/**
 * Registry options for AST parser factory.
 */
export interface IAstParserFactoryOptions {
    /**
     * Optional custom creators keyed by canonical language.
     */
    readonly creators?: Partial<Record<SupportedLanguage, IAstParserCreator>>
}

/**
 * AST parser factory contract.
 */
export interface IAstParserFactory {
    /**
     * Creates or returns cached parser for target language.
     *
     * @param language Raw canonical language or alias.
     * @returns Cached source-code parser instance.
     * @throws AstParserFactoryError when language is unknown, unsupported, or parser construction fails.
     */
    create(language: string): ISourceCodeParser
}

const AST_LANGUAGE_ALIAS_TO_LANGUAGE: Readonly<Record<string, SupportedLanguage>> = {
    typescript: AST_LANGUAGE.TYPESCRIPT,
    ts: AST_LANGUAGE.TYPESCRIPT,
    tsx: AST_LANGUAGE.TSX,
    javascript: AST_LANGUAGE.JAVASCRIPT,
    js: AST_LANGUAGE.JAVASCRIPT,
    jsx: AST_LANGUAGE.JSX,
    python: AST_LANGUAGE.PYTHON,
    py: AST_LANGUAGE.PYTHON,
    go: AST_LANGUAGE.GO,
    golang: AST_LANGUAGE.GO,
    java: AST_LANGUAGE.JAVA,
    csharp: AST_LANGUAGE.CSHARP,
    "c#": AST_LANGUAGE.CSHARP,
    cs: AST_LANGUAGE.CSHARP,
    ruby: AST_LANGUAGE.RUBY,
    rb: AST_LANGUAGE.RUBY,
    rust: AST_LANGUAGE.RUST,
    rs: AST_LANGUAGE.RUST,
    php: AST_LANGUAGE.PHP,
    kotlin: AST_LANGUAGE.KOTLIN,
    kt: AST_LANGUAGE.KOTLIN,
}

const DEFAULT_AST_PARSER_CREATORS: Readonly<
    Partial<Record<SupportedLanguage, IAstParserCreator>>
> = {
    [AST_LANGUAGE.TYPESCRIPT](): ISourceCodeParser {
        return new TypeScriptSourceCodeParser({
            language: assertTypeScriptParserLanguage(AST_LANGUAGE.TYPESCRIPT),
        })
    },
    [AST_LANGUAGE.TSX](): ISourceCodeParser {
        return new TypeScriptSourceCodeParser({
            language: assertTypeScriptParserLanguage(AST_LANGUAGE.TSX),
        })
    },
    [AST_LANGUAGE.JAVASCRIPT](): ISourceCodeParser {
        return new JavaScriptSourceCodeParser({
            language: assertJavaScriptParserLanguage(AST_LANGUAGE.JAVASCRIPT),
        })
    },
    [AST_LANGUAGE.JSX](): ISourceCodeParser {
        return new JavaScriptSourceCodeParser({
            language: assertJavaScriptParserLanguage(AST_LANGUAGE.JSX),
        })
    },
    [AST_LANGUAGE.PYTHON](): ISourceCodeParser {
        return new PythonSourceCodeParser({
            language: assertPythonParserLanguage(AST_LANGUAGE.PYTHON),
        })
    },
    [AST_LANGUAGE.GO](): ISourceCodeParser {
        return new GoSourceCodeParser({
            language: assertGoParserLanguage(AST_LANGUAGE.GO),
        })
    },
    [AST_LANGUAGE.JAVA](): ISourceCodeParser {
        return new JavaSourceCodeParser({
            language: assertJavaParserLanguage(AST_LANGUAGE.JAVA),
        })
    },
    [AST_LANGUAGE.RUST](): ISourceCodeParser {
        return new RustSourceCodeParser({
            language: assertRustParserLanguage(AST_LANGUAGE.RUST),
        })
    },
    [AST_LANGUAGE.PHP](): ISourceCodeParser {
        return new PhpSourceCodeParser({
            language: assertPhpParserLanguage(AST_LANGUAGE.PHP),
        })
    },
    [AST_LANGUAGE.CSHARP](): ISourceCodeParser {
        return new CSharpSourceCodeParser({
            language: assertCSharpParserLanguage(AST_LANGUAGE.CSHARP),
        })
    },
    [AST_LANGUAGE.RUBY](): ISourceCodeParser {
        return new RubySourceCodeParser({
            language: assertRubyParserLanguage(AST_LANGUAGE.RUBY),
        })
    },
}

/**
 * Factory for creating and caching language-specific AST parsers.
 */
export class AstParserFactory implements IAstParserFactory {
    private readonly creators: ReadonlyMap<SupportedLanguage, IAstParserCreator>

    private readonly parsers: Map<SupportedLanguage, ISourceCodeParser>

    /**
     * Creates AST parser factory with optional creator overrides.
     *
     * @param options Custom parser creator registry.
     */
    public constructor(options: IAstParserFactoryOptions = {}) {
        this.creators = buildCreatorMap(options)
        this.parsers = new Map<SupportedLanguage, ISourceCodeParser>()
    }

    /**
     * Resolves parser by canonical language or alias and caches created instances.
     *
     * @param language Raw canonical language or alias.
     * @returns Cached source-code parser.
     * @throws AstParserFactoryError when language is unknown, unsupported, or creator fails.
     */
    public create(language: string): ISourceCodeParser {
        const normalizedLanguage = normalizeAstParserLanguage(language)
        const cachedParser = this.parsers.get(normalizedLanguage)

        if (cachedParser !== undefined) {
            return cachedParser
        }

        const creator = this.creators.get(normalizedLanguage)
        if (creator === undefined) {
            throw new AstParserFactoryError(
                AST_PARSER_FACTORY_ERROR_CODE.LANGUAGE_NOT_SUPPORTED,
                language,
                {normalizedLanguage},
            )
        }

        try {
            const parser = creator()
            this.parsers.set(normalizedLanguage, parser)
            return parser
        } catch (error) {
            throw new AstParserFactoryError(
                AST_PARSER_FACTORY_ERROR_CODE.PARSER_CREATION_FAILED,
                language,
                {
                    normalizedLanguage,
                    causeMessage: resolveCreatorFailureMessage(error),
                },
            )
        }
    }
}

/**
 * Normalizes AST parser language aliases to canonical language literals.
 *
 * @param language Raw canonical language or alias.
 * @returns Canonical supported language.
 * @throws AstParserFactoryError when language is unsupported or blank.
 */
export function normalizeAstParserLanguage(language: string): SupportedLanguage {
    const normalizedValue = language.trim().toLowerCase()
    const normalizedLanguage = AST_LANGUAGE_ALIAS_TO_LANGUAGE[normalizedValue]

    if (normalizedLanguage === undefined) {
        throw new AstParserFactoryError(
            AST_PARSER_FACTORY_ERROR_CODE.UNKNOWN_LANGUAGE,
            language,
        )
    }

    return normalizedLanguage
}

/**
 * Builds immutable creator registry by merging defaults with user overrides.
 *
 * @param options Creator registry overrides.
 * @returns Immutable creator map.
 */
function buildCreatorMap(
    options: IAstParserFactoryOptions,
): ReadonlyMap<SupportedLanguage, IAstParserCreator> {
    const creators = new Map<SupportedLanguage, IAstParserCreator>()

    for (const [language, creator] of Object.entries(DEFAULT_AST_PARSER_CREATORS)) {
        if (creator !== undefined) {
            creators.set(language as SupportedLanguage, creator)
        }
    }

    const customCreators = options.creators
    if (customCreators === undefined) {
        return creators
    }

    for (const [language, creator] of Object.entries(customCreators)) {
        if (creator !== undefined) {
            creators.set(language as SupportedLanguage, creator)
        }
    }

    return creators
}

/**
 * Resolves human-readable failure message from parser creator errors.
 *
 * @param error Unknown thrown value.
 * @returns Stable failure message.
 */
function resolveCreatorFailureMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown parser creator failure"
}
