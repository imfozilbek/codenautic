import {
    AST_LANGUAGE,
    FilePath,
    type SupportedLanguage,
} from "@codenautic/core"

import {
    AST_LOC_CALCULATOR_ERROR_CODE,
    AstLocCalculatorError,
} from "./ast-loc-calculator.error"

const BLOCK_COMMENT_START = "/*"
const BLOCK_COMMENT_END = "*/"
const TRIPLE_DOUBLE_QUOTE = "\"\"\""
const TRIPLE_SINGLE_QUOTE = "'''"

const SUPPORTED_AST_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set<SupportedLanguage>([
    AST_LANGUAGE.TYPESCRIPT,
    AST_LANGUAGE.TSX,
    AST_LANGUAGE.JAVASCRIPT,
    AST_LANGUAGE.JSX,
    AST_LANGUAGE.PYTHON,
    AST_LANGUAGE.GO,
    AST_LANGUAGE.JAVA,
    AST_LANGUAGE.CSHARP,
    AST_LANGUAGE.RUBY,
    AST_LANGUAGE.RUST,
    AST_LANGUAGE.PHP,
    AST_LANGUAGE.KOTLIN,
])

interface IAstLocLanguageRules {
    readonly lineCommentMarkers: readonly string[]
    readonly supportsBlockComments: boolean
    readonly supportsPythonDocstringComments: boolean
    readonly supportsBacktickStrings: boolean
}

interface IAstLocScannerState {
    inBlockComment: boolean
    inStringDelimiter: "\"" | "'" | "`" | undefined
    inPythonDocstringDelimiter: typeof TRIPLE_DOUBLE_QUOTE | typeof TRIPLE_SINGLE_QUOTE | undefined
}

interface INormalizedAstLocCalculatorFileInput {
    readonly filePath: string
    readonly language: SupportedLanguage
    readonly sourceCode: string
}

interface INormalizedAstLocCalculatorInput {
    readonly files: readonly INormalizedAstLocCalculatorFileInput[]
    readonly filePathFilter: ReadonlySet<string> | undefined
}

/**
 * One file LOC calculator input payload.
 */
export interface IAstLocCalculatorFileInput {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Parsed language for source file.
     */
    readonly language: SupportedLanguage

    /**
     * Full source code text.
     */
    readonly sourceCode: string
}

/**
 * Input payload for AST LOC calculator.
 */
export interface IAstLocCalculatorInput {
    /**
     * Source files used for LOC calculation.
     */
    readonly files: readonly IAstLocCalculatorFileInput[]

    /**
     * Optional subset of file paths to process.
     */
    readonly filePaths?: readonly string[]
}

/**
 * One LOC item payload.
 */
export interface IAstLocCalculatorItem {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Lines of code excluding blank and comment-only lines.
     */
    readonly loc: number
}

/**
 * Summary payload for one LOC calculation run.
 */
export interface IAstLocCalculatorSummary {
    /**
     * Total files provided in input.
     */
    readonly totalFiles: number

    /**
     * Number of files processed after optional file-path filtering.
     */
    readonly processedFiles: number

    /**
     * Total LOC across processed files.
     */
    readonly totalLoc: number
}

/**
 * Output payload for AST LOC calculation.
 */
export interface IAstLocCalculatorResult {
    /**
     * Deterministic LOC result items.
     */
    readonly items: readonly IAstLocCalculatorItem[]

    /**
     * Aggregated LOC summary.
     */
    readonly summary: IAstLocCalculatorSummary
}

/**
 * AST LOC calculator contract.
 */
export interface IAstLocCalculatorService {
    /**
     * Calculates LOC for source files with language-aware comment handling.
     *
     * @param input LOC calculation input payload.
     * @returns Deterministic LOC result.
     */
    calculate(input: IAstLocCalculatorInput): Promise<IAstLocCalculatorResult>
}

/**
 * Calculates LOC per file using language-aware comment and blank-line filtering.
 */
export class AstLocCalculatorService implements IAstLocCalculatorService {
    /**
     * Calculates deterministic LOC result for provided source files.
     *
     * @param input LOC calculation input payload.
     * @returns Deterministic LOC result.
     */
    public calculate(input: IAstLocCalculatorInput): Promise<IAstLocCalculatorResult> {
        const normalizedInput = normalizeInput(input)
        const selectedFiles = selectFiles(normalizedInput.files, normalizedInput.filePathFilter)
        const items = selectedFiles
            .map((file): IAstLocCalculatorItem => ({
                filePath: file.filePath,
                loc: calculateFileLoc(file),
            }))
            .sort((left, right) => left.filePath.localeCompare(right.filePath))

        return Promise.resolve({
            items,
            summary: {
                totalFiles: normalizedInput.files.length,
                processedFiles: items.length,
                totalLoc: items.reduce((sum, item) => sum + item.loc, 0),
            },
        })
    }
}

/**
 * Normalizes and validates LOC calculator input.
 *
 * @param input Raw LOC calculation input.
 * @returns Normalized input payload.
 */
function normalizeInput(input: IAstLocCalculatorInput): INormalizedAstLocCalculatorInput {
    const files = normalizeFiles(input.files)
    const filePathFilter = normalizeFilePathFilter(input.filePaths)

    return {
        files,
        filePathFilter,
    }
}

/**
 * Normalizes and validates source files list.
 *
 * @param files Raw file input list.
 * @returns Sorted normalized file list.
 */
function normalizeFiles(
    files: readonly IAstLocCalculatorFileInput[],
): readonly INormalizedAstLocCalculatorFileInput[] {
    if (files.length === 0) {
        throw new AstLocCalculatorError(AST_LOC_CALCULATOR_ERROR_CODE.EMPTY_FILES)
    }

    const fileByPath = new Map<string, INormalizedAstLocCalculatorFileInput>()

    for (const file of files) {
        const filePath = normalizeFilePath(file.filePath)
        if (fileByPath.has(filePath)) {
            throw new AstLocCalculatorError(
                AST_LOC_CALCULATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath},
            )
        }

        fileByPath.set(filePath, {
            filePath,
            language: normalizeLanguage(file.language),
            sourceCode: normalizeSourceCode(file.sourceCode, filePath),
        })
    }

    return [...fileByPath.values()].sort((left, right) => left.filePath.localeCompare(right.filePath))
}

/**
 * Normalizes optional file-path filter.
 *
 * @param filePaths Raw file-path filter.
 * @returns Normalized file-path filter set.
 */
function normalizeFilePathFilter(filePaths: readonly string[] | undefined): ReadonlySet<string> | undefined {
    if (filePaths === undefined) {
        return undefined
    }

    if (filePaths.length === 0) {
        throw new AstLocCalculatorError(AST_LOC_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATH_FILTER)
    }

    const normalized = filePaths.map((filePath) => normalizeFilePath(filePath))
    return new Set<string>(normalized)
}

/**
 * Normalizes repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstLocCalculatorError(AST_LOC_CALCULATOR_ERROR_CODE.INVALID_FILE_PATH, {filePath})
    }
}

/**
 * Normalizes and validates source language.
 *
 * @param language Raw source language.
 * @returns Validated source language.
 */
function normalizeLanguage(language: SupportedLanguage): SupportedLanguage {
    if (SUPPORTED_AST_LANGUAGES.has(language)) {
        return language
    }

    throw new AstLocCalculatorError(
        AST_LOC_CALCULATOR_ERROR_CODE.INVALID_LANGUAGE,
        {language},
    )
}

/**
 * Normalizes and validates source code input.
 *
 * @param sourceCode Raw source code.
 * @param filePath Repository-relative file path.
 * @returns Normalized source code.
 */
function normalizeSourceCode(sourceCode: string, filePath: string): string {
    if (typeof sourceCode !== "string") {
        throw new AstLocCalculatorError(
            AST_LOC_CALCULATOR_ERROR_CODE.INVALID_SOURCE_CODE,
            {filePath},
        )
    }

    return sourceCode
}

/**
 * Selects files for processing based on optional file-path filter.
 *
 * @param files Normalized file list.
 * @param filePathFilter Optional file-path filter.
 * @returns Selected file list.
 */
function selectFiles(
    files: readonly INormalizedAstLocCalculatorFileInput[],
    filePathFilter: ReadonlySet<string> | undefined,
): readonly INormalizedAstLocCalculatorFileInput[] {
    if (filePathFilter === undefined) {
        return files
    }

    return files.filter((file) => filePathFilter.has(file.filePath))
}

/**
 * Calculates LOC for one file.
 *
 * @param file Normalized file input.
 * @returns LOC value.
 */
function calculateFileLoc(file: INormalizedAstLocCalculatorFileInput): number {
    const rules = resolveLanguageRules(file.language)
    const state: IAstLocScannerState = {
        inBlockComment: false,
        inStringDelimiter: undefined,
        inPythonDocstringDelimiter: undefined,
    }

    const lines = normalizeSourceCodeLines(file.sourceCode)
    let loc = 0

    for (const line of lines) {
        if (lineHasCode(line, state, rules)) {
            loc += 1
        }
    }

    return loc
}

/**
 * Resolves line-comment and block-comment behavior for one language.
 *
 * @param language File language.
 * @returns Language rules for LOC scanning.
 */
function resolveLanguageRules(language: SupportedLanguage): IAstLocLanguageRules {
    if (language === AST_LANGUAGE.PYTHON) {
        return {
            lineCommentMarkers: ["#"],
            supportsBlockComments: false,
            supportsPythonDocstringComments: true,
            supportsBacktickStrings: false,
        }
    }

    if (language === AST_LANGUAGE.RUBY) {
        return {
            lineCommentMarkers: ["#"],
            supportsBlockComments: false,
            supportsPythonDocstringComments: false,
            supportsBacktickStrings: true,
        }
    }

    if (language === AST_LANGUAGE.PHP) {
        return {
            lineCommentMarkers: ["//", "#"],
            supportsBlockComments: true,
            supportsPythonDocstringComments: false,
            supportsBacktickStrings: false,
        }
    }

    return {
        lineCommentMarkers: ["//"],
        supportsBlockComments: true,
        supportsPythonDocstringComments: false,
        supportsBacktickStrings: true,
    }
}

/**
 * Normalizes source code into deterministic LF-only lines.
 *
 * @param sourceCode Source code payload.
 * @returns Source lines.
 */
function normalizeSourceCodeLines(sourceCode: string): readonly string[] {
    const normalized = sourceCode.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    return normalized.split("\n")
}

/**
 * Resolves whether one source line contains executable code.
 *
 * @param line Source line text.
 * @param state Mutable scanner state.
 * @param rules Language comment and string rules.
 * @returns `true` when line contains code.
 */
function lineHasCode(
    line: string,
    state: IAstLocScannerState,
    rules: IAstLocLanguageRules,
): boolean {
    let index = 0
    let hasCode = false

    while (index < line.length) {
        if (state.inPythonDocstringDelimiter !== undefined) {
            index = consumePythonDocstring(line, index, state)
            continue
        }

        if (state.inBlockComment) {
            index = consumeBlockComment(line, index, state)
            continue
        }

        if (state.inStringDelimiter !== undefined) {
            hasCode = true
            index = consumeStringLiteral(line, index, state.inStringDelimiter, state)
            continue
        }

        const current = line.charAt(index)

        if (isWhitespaceChar(current)) {
            index += 1
            continue
        }

        const docstringDelimiter = resolvePythonDocstringStart(line, index, rules)
        if (docstringDelimiter !== undefined) {
            state.inPythonDocstringDelimiter = docstringDelimiter
            index += 3
            continue
        }

        if (hasLineCommentStart(line, index, rules.lineCommentMarkers)) {
            break
        }

        if (hasBlockCommentStart(line, index, rules.supportsBlockComments)) {
            state.inBlockComment = true
            index += BLOCK_COMMENT_START.length
            continue
        }

        if (isStringDelimiter(current, rules.supportsBacktickStrings)) {
            hasCode = true
            state.inStringDelimiter = current
            index += 1
            continue
        }

        hasCode = true
        index += 1
    }

    return hasCode
}

/**
 * Consumes block-comment content up to the next line cursor.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param state Mutable scanner state.
 * @returns Next scanner cursor position.
 */
function consumeBlockComment(line: string, index: number, state: IAstLocScannerState): number {
    const blockCommentEndIndex = line.indexOf(BLOCK_COMMENT_END, index)
    if (blockCommentEndIndex === -1) {
        return line.length
    }

    state.inBlockComment = false
    return blockCommentEndIndex + BLOCK_COMMENT_END.length
}

/**
 * Consumes python triple-quote docstring content up to next cursor.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param state Mutable scanner state.
 * @returns Next scanner cursor position.
 */
function consumePythonDocstring(line: string, index: number, state: IAstLocScannerState): number {
    const delimiter = state.inPythonDocstringDelimiter
    if (delimiter === undefined) {
        return index
    }

    const docstringEndIndex = line.indexOf(delimiter, index)
    if (docstringEndIndex === -1) {
        return line.length
    }

    state.inPythonDocstringDelimiter = undefined
    return docstringEndIndex + delimiter.length
}

/**
 * Consumes string literal content up to next cursor.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param delimiter Current string delimiter.
 * @param state Mutable scanner state.
 * @returns Next scanner cursor position.
 */
function consumeStringLiteral(
    line: string,
    index: number,
    delimiter: "\"" | "'" | "`",
    state: IAstLocScannerState,
): number {
    let cursor = index

    while (cursor < line.length) {
        const current = line.charAt(cursor)

        if (current === "\\") {
            cursor += 2
            continue
        }

        if (current === delimiter) {
            state.inStringDelimiter = undefined
            return cursor + 1
        }

        cursor += 1
    }

    return line.length
}

/**
 * Resolves python triple-quote comment start delimiter when present.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param rules Language rules.
 * @returns Triple-quote delimiter when present.
 */
function resolvePythonDocstringStart(
    line: string,
    index: number,
    rules: IAstLocLanguageRules,
): typeof TRIPLE_DOUBLE_QUOTE | typeof TRIPLE_SINGLE_QUOTE | undefined {
    if (rules.supportsPythonDocstringComments === false) {
        return undefined
    }

    if (line.startsWith(TRIPLE_DOUBLE_QUOTE, index)) {
        return TRIPLE_DOUBLE_QUOTE
    }

    if (line.startsWith(TRIPLE_SINGLE_QUOTE, index)) {
        return TRIPLE_SINGLE_QUOTE
    }

    return undefined
}

/**
 * Resolves whether scanner cursor starts one line comment.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param lineCommentMarkers Language line-comment markers.
 * @returns `true` when line comment starts at cursor.
 */
function hasLineCommentStart(
    line: string,
    index: number,
    lineCommentMarkers: readonly string[],
): boolean {
    return lineCommentMarkers.some((marker) => line.startsWith(marker, index))
}

/**
 * Resolves whether scanner cursor starts one block comment.
 *
 * @param line Source line text.
 * @param index Current scanner cursor.
 * @param supportsBlockComments Language flag.
 * @returns `true` when block comment starts at cursor.
 */
function hasBlockCommentStart(line: string, index: number, supportsBlockComments: boolean): boolean {
    if (supportsBlockComments === false) {
        return false
    }

    return line.startsWith(BLOCK_COMMENT_START, index)
}

/**
 * Resolves whether char is one supported string delimiter.
 *
 * @param value Current character.
 * @param supportsBacktickStrings Language flag.
 * @returns `true` when char starts one string literal.
 */
function isStringDelimiter(value: string, supportsBacktickStrings: boolean): value is "\"" | "'" | "`" {
    if (value === "\"" || value === "'") {
        return true
    }

    if (supportsBacktickStrings && value === "`") {
        return true
    }

    return false
}

/**
 * Resolves whether char is one whitespace symbol.
 *
 * @param value Current character.
 * @returns `true` when char is whitespace.
 */
function isWhitespaceChar(value: string): boolean {
    return value === " " || value === "\t" || value === "\n" || value === "\r" || value === "\f"
}
