import type {IUseCase} from "../ports/inbound/use-case.port"
import {ValidationError} from "../../domain/errors/validation.error"
import {Result} from "../../shared/result"
import {isCodeBlockInFile} from "./review/safeguards/safeguard-filter.utils"

interface ISuggestionSource {
    readonly id: unknown
    readonly filePath: unknown
    readonly lineStart: unknown
    readonly lineEnd: unknown
    readonly severity: unknown
    readonly category: unknown
    readonly message: unknown
    readonly codeBlock: unknown
    readonly committable: unknown
    readonly rankScore: unknown
}

interface IFileSource {
    readonly path: unknown
    readonly [key: string]: unknown
}

interface INormalizedSuggestion {
    readonly id: string
    readonly filePath: string
    readonly lineStart: number
    readonly lineEnd: number
    readonly severity: string
    readonly category: string
    readonly message: string
    readonly codeBlock?: string
    readonly committable: boolean
    readonly rankScore: number
}

/**
 * Input for suggestion committability use case.
 */
export interface ICheckCommittabilityInput {
    /**
     * Target suggestion to validate.
     */
    readonly suggestion: unknown

    /**
     * Optional sibling suggestions already selected in the same run.
     */
    readonly siblingSuggestions?: readonly unknown[]

    /**
     * Changed file payloads from review stage.
     */
    readonly files?: readonly unknown[]
}

/**
 * Output from committability check.
 */
export interface ICheckCommittabilityOutput {
    /**
     * Final committable verdict.
     */
    readonly committable: boolean

    /**
     * Optional reason when non-committable.
     */
    readonly reason?: string
}

/**
 * Checks if suggestion can be safely applied to a pull/merge request file.
 */
export class CheckCommittabilityUseCase
    implements IUseCase<ICheckCommittabilityInput, ICheckCommittabilityOutput, ValidationError>
{
    /**
     * Creates committability use case instance.
     */
    public constructor() {
    }

    private static readonly REASON_UPSTREAM_NON_COMMITTABLE = "upstream_non_committable"
    private static readonly REASON_MISSING_CODE_BLOCK = "missing_code_block"
    private static readonly REASON_INVALID_SYNTAX = "invalid_code_block_syntax"
    private static readonly REASON_FILE_NOT_FOUND = "file_not_found"
    private static readonly REASON_ALREADY_IMPLEMENTED = "already_implemented"
    private static readonly REASON_CONFLICT_WITH_OTHER = "conflict_with_other_suggestion"

    /**
     * Проверяет, можно ли безопасно применить suggestion.
     *
     * @param input Suggestion + context.
     * @returns Committable flag and optional reason.
     */
    public execute(
        input: ICheckCommittabilityInput,
    ): Promise<Result<ICheckCommittabilityOutput, ValidationError>> {
        const suggestion = this.normalizeSuggestion(input.suggestion)
        if (suggestion === null) {
            return Promise.resolve(
                Result.fail<ICheckCommittabilityOutput, ValidationError>(
                    new ValidationError("Check committability validation failed", [
                        {
                            field: "suggestion",
                            message: "suggestion payload is invalid",
                        },
                    ]),
                ),
            )
        }

        if (suggestion.committable === false) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: CheckCommittabilityUseCase.REASON_UPSTREAM_NON_COMMITTABLE,
                }),
            )
        }

        const files = this.normalizeFiles(input.files)
        if (files === undefined) {
            return Promise.resolve(
                Result.fail<ICheckCommittabilityOutput, ValidationError>(
                    new ValidationError("Check committability validation failed", [
                        {
                            field: "files",
                            message: "files payload must be an array",
                        },
                    ]),
                ),
            )
        }

        if (suggestion.codeBlock === undefined) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: CheckCommittabilityUseCase.REASON_MISSING_CODE_BLOCK,
                }),
            )
        }

        if (this.isValidCodeBlockSyntax(suggestion.codeBlock) === false) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: CheckCommittabilityUseCase.REASON_INVALID_SYNTAX,
                }),
            )
        }

        const siblingSuggestions = this.normalizeSuggestions(input.siblingSuggestions)
        const file = this.resolveFile(files, suggestion.filePath)
        if (file === undefined) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: CheckCommittabilityUseCase.REASON_FILE_NOT_FOUND,
                }),
            )
        }

        if (isCodeBlockInFile(file as unknown as Record<string, unknown>, suggestion.codeBlock)) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: CheckCommittabilityUseCase.REASON_ALREADY_IMPLEMENTED,
                }),
            )
        }

        const conflict = this.findConflictSuggestion(suggestion, siblingSuggestions)
        if (conflict !== undefined) {
            return Promise.resolve(
                Result.ok<ICheckCommittabilityOutput, ValidationError>({
                    committable: false,
                    reason: `${CheckCommittabilityUseCase.REASON_CONFLICT_WITH_OTHER}:${conflict.id}`,
                }),
            )
        }

        return Promise.resolve(
            Result.ok<ICheckCommittabilityOutput, ValidationError>({
                committable: true,
                reason: undefined,
            }),
        )
    }

    /**
     * Normalizes and validates a suggestion payload.
     *
     * @param source Raw suggestion.
     * @returns Typed suggestion or null.
     */
    private normalizeSuggestion(source: unknown): INormalizedSuggestion | null {
        if (this.isRecord(source) === false) {
            return null
        }

        const normalizedSource = source as unknown as ISuggestionSource
        const required = this.readRequiredSuggestionFields(normalizedSource)
        if (required === null) {
            return null
        }

        const lineRange = this.readLineRange(normalizedSource)
        if (lineRange === null) {
            return null
        }

        const rankScore = this.readPositiveInteger(normalizedSource.rankScore)
        if (rankScore === undefined) {
            return null
        }

        return {
            ...required,
            ...lineRange,
            codeBlock: this.normalizeOptionalCodeBlock(normalizedSource.codeBlock),
            rankScore,
        }
    }

    /**
     * Normalizes required suggestion fields.
     *
     * @param source Source suggestion payload.
     * @returns Typed required fields or null.
     */
    private readRequiredSuggestionFields(source: ISuggestionSource):
        | Omit<INormalizedSuggestion, "lineStart" | "lineEnd" | "codeBlock" | "rankScore">
        | null {
        const id = this.readNonEmptyString(source.id)
        const filePath = this.readNonEmptyString(source.filePath)
        const severity = this.readNonEmptyString(source.severity)
        const category = this.readNonEmptyString(source.category)
        const message = this.readNonEmptyString(source.message)
        const committable = this.readBoolean(source.committable)
        if (
            id === undefined ||
            filePath === undefined ||
            severity === undefined ||
            category === undefined ||
            message === undefined ||
            committable === undefined
        ) {
            return null
        }

        return {
            id,
            filePath,
            severity,
            category,
            message,
            committable,
        }
    }

    /**
     * Normalizes line range from source.
     *
     * @param source Source suggestion payload.
     * @returns Line range or null.
     */
    private readLineRange(source: ISuggestionSource):
        | {readonly lineStart: number; readonly lineEnd: number}
        | null {
        const lineStart = this.readPositiveInteger(source.lineStart)
        const lineEnd = this.readPositiveInteger(source.lineEnd)
        if (lineStart === undefined || lineEnd === undefined || lineStart > lineEnd) {
            return null
        }

        return {lineStart, lineEnd}
    }

    /**
     * Normalizes file list or returns undefined when payload type is invalid.
     *
     * @param files Raw file payload.
     * @returns Typed files or undefined.
     */
    private normalizeFiles(files: readonly unknown[] | undefined): readonly IFileSource[] | undefined {
        if (files === undefined) {
            return []
        }

        if (Array.isArray(files) === false) {
            return undefined
        }

        return files.filter((file): file is IFileSource => {
            return this.isRecord(file)
        })
    }

    /**
     * Normalizes sibling suggestions when checking overlap conflicts.
     *
     * @param source Raw sibling suggestions.
     * @returns Typed suggestions.
     */
    private normalizeSuggestions(
        source: readonly unknown[] | undefined,
    ): readonly INormalizedSuggestion[] {
        if (source === undefined) {
            return []
        }

        const result: INormalizedSuggestion[] = []
        for (const item of source) {
            const suggestion = this.normalizeSuggestion(item)
            if (suggestion !== null) {
                result.push(suggestion)
            }
        }

        return result
    }

    /**
     * Searches conflict by overlapping line range and same file.
     *
     * @param current Suggestion being checked.
     * @param candidates Sibling suggestions.
     * @returns First conflicting suggestion.
     */
    private findConflictSuggestion(
        current: INormalizedSuggestion,
        candidates: readonly INormalizedSuggestion[],
    ): INormalizedSuggestion | undefined {
        return candidates.find((candidate): boolean => {
            if (candidate.id === current.id) {
                return false
            }

            if (candidate.filePath !== current.filePath) {
                return false
            }

            return this.isRangeOverlapping(
                current.lineStart,
                current.lineEnd,
                candidate.lineStart,
                candidate.lineEnd,
            )
        })
    }

    /**
     * Checks range overlap.
     *
     * @param currentStart Current start.
     * @param currentEnd Current end.
     * @param otherStart Other start.
     * @param otherEnd Other end.
     * @returns Whether ranges overlap.
     */
    private isRangeOverlapping(
        currentStart: number,
        currentEnd: number,
        otherStart: number,
        otherEnd: number,
    ): boolean {
        return currentStart <= otherEnd && otherStart <= currentEnd
    }

    /**
     * Resolves file by normalized path.
     *
     * @param files File payload collection.
     * @param filePath File path to match.
     * @returns File payload or undefined.
     */
    private resolveFile(
        files: readonly IFileSource[],
        filePath: string,
    ): IFileSource | undefined {
        return files.find((file): file is IFileSource => {
            return this.readNonEmptyString(file.path) === filePath
        })
    }

    /**
     * Checks syntax of suggested code block.
     *
     * @param codeBlock Source code block.
     * @returns Whether block is syntactically plausible.
     */
    private isValidCodeBlockSyntax(codeBlock: string): boolean {
        if (codeBlock.length === 0) {
            return false
        }

        if (this.hasBalancedDelimiters(codeBlock) === false) {
            return false
        }

        return this.looksLikeCode(codeBlock)
    }

    /**
     * Heuristic for TypeScript/JavaScript-like snippet structure.
     *
     * @param codeBlock Source block.
     * @returns True when block resembles TS-safe snippet.
     */
    private looksLikeCode(codeBlock: string): boolean {
        const patterns: readonly RegExp[] = [
            /\b(function|class|const|let|var|return|type|interface|implements|if|for|while)\b/,
            /\bnew\s+[A-Za-z_$][\w$]*/,
            /[A-Za-z_$][\w$]*\s*\([^)]*\)/,
            /[A-Za-z_$][\w$]*\s*:\s*[A-Za-z_$][\w$.<>[\]|&]/,
        ]

        return patterns.some((pattern) => pattern.test(codeBlock))
    }

    /**
     * Checks balanced braces/parens/brackets after removing simple quoted/comments blocks.
     *
     * @param codeBlock Source block.
     * @returns True when main delimiters are balanced.
     */
    private hasBalancedDelimiters(codeBlock: string): boolean {
        const sanitized = codeBlock
            .replace(/\/\*[\s\S]*?\*\//gu, "")
            .replace(/\/\/[^\n\r]*/gu, "")
            .replace(/"([^"\\]|\\.)*"/gu, "")
            .replace(/'([^'\\]|\\.)*'/gu, "")
            .replace(/`([^`\\]|\\.)*`/gu, "")

        const braces = this.calculateBalance(sanitized, "{", "}")
        if (braces < 0) {
            return false
        }

        const brackets = this.calculateBalance(sanitized, "[", "]")
        if (brackets < 0) {
            return false
        }

        const parens = this.calculateBalance(sanitized, "(", ")")
        if (parens < 0) {
            return false
        }

        return braces === 0 && brackets === 0 && parens === 0
    }

    /**
     * Calculates delimiter balance count with fast early exit.
     *
     * @param code Input string.
     * @param open Open delimiter.
     * @param close Close delimiter.
     * @returns End balance or negative if invalid.
     */
    private calculateBalance(code: string, open: string, close: string): number {
        let balance = 0
        for (let index = 0; index < code.length; index += 1) {
            const char = code[index]
            if (char === undefined) {
                continue
            }
            if (char === open) {
                balance += 1
            } else if (char === close) {
                balance -= 1
                if (balance < 0) {
                    return -1
                }
            }
        }

        return balance
    }

    /**
     * Reads non-empty string.
     *
     * @param value Input value.
     * @returns Trimmed string or undefined.
     */
    private readNonEmptyString(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined
        }

        const normalized = value.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Reads positive integer.
     *
     * @param value Input value.
     * @returns Positive integer or undefined.
     */
    private readPositiveInteger(value: unknown): number | undefined {
        if (
            typeof value !== "number" ||
            Number.isInteger(value) === false ||
            value <= 0
        ) {
            return undefined
        }

        return value
    }

    /**
     * Reads boolean.
     *
     * @param value Input value.
     * @returns Boolean or undefined.
     */
    private readBoolean(value: unknown): boolean | undefined {
        if (typeof value !== "boolean") {
            return undefined
        }

        return value
    }

    /**
     * Normalizes optional code block string.
     *
     * @param value Raw code block value.
     * @returns Trimmed code block or undefined.
     */
    private normalizeOptionalCodeBlock(value: unknown): string | undefined {
        const rawCodeBlock = this.readNonEmptyString(value)
        if (rawCodeBlock === undefined) {
            return undefined
        }

        const normalized = rawCodeBlock.trim()
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Checks plain record shape.
     *
     * @param value Unknown value.
     * @returns True for object record.
     */
    private isRecord(value: unknown): value is Record<string, unknown> {
        return (
            typeof value === "object" &&
            value !== null &&
            Array.isArray(value) === false
        )
    }
}
