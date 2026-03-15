import {spawn} from "node:child_process"

import {FilePath} from "@codenautic/core"

import {
    AST_CHURN_CALCULATOR_ERROR_CODE,
    AstChurnCalculatorError,
} from "./ast-churn-calculator.error"

const DEFAULT_LOOKBACK_DAYS = 30
const MS_IN_DAY = 24 * 60 * 60 * 1000

interface INormalizedAstChurnCalculatorInput {
    readonly repositoryPath: string
    readonly filePaths: readonly string[]
    readonly days: number
}

/**
 * Git command executor for churn calculator.
 */
export type AstChurnCalculatorExecuteGit = (
    command: string,
    args: readonly string[],
    cwd: string,
) => Promise<string>

/**
 * Clock callback for deterministic churn windows.
 */
export type AstChurnCalculatorNow = () => number

/**
 * Input payload for AST churn calculator.
 */
export interface IAstChurnCalculatorInput {
    /**
     * Local repository path where git commands will be executed.
     */
    readonly repositoryPath: string

    /**
     * Repository-relative file paths.
     */
    readonly filePaths: readonly string[]

    /**
     * Optional lookback window in days.
     */
    readonly days?: number
}

/**
 * One churn metric item payload.
 */
export interface IAstChurnCalculatorItem {
    /**
     * Repository-relative file path.
     */
    readonly filePath: string

    /**
     * Number of unique commits touching the file in lookback window.
     */
    readonly churn: number
}

/**
 * Summary payload for one churn calculation run.
 */
export interface IAstChurnCalculatorSummary {
    /**
     * Total number of processed files.
     */
    readonly fileCount: number

    /**
     * Total churn across processed files.
     */
    readonly totalChurn: number

    /**
     * Lookback window in days used for the run.
     */
    readonly days: number

    /**
     * ISO timestamp used as `git log --since=` lower bound.
     */
    readonly sinceIso: string
}

/**
 * Output payload for AST churn calculation.
 */
export interface IAstChurnCalculatorResult {
    /**
     * Deterministic churn metrics for requested files.
     */
    readonly items: readonly IAstChurnCalculatorItem[]

    /**
     * Aggregated churn summary.
     */
    readonly summary: IAstChurnCalculatorSummary
}

/**
 * Runtime options for AST churn calculator.
 */
export interface IAstChurnCalculatorServiceOptions {
    /**
     * Optional git command executor override.
     */
    readonly executeGit?: AstChurnCalculatorExecuteGit

    /**
     * Optional default lookback window in days.
     */
    readonly defaultLookbackDays?: number

    /**
     * Optional deterministic clock callback.
     */
    readonly now?: AstChurnCalculatorNow
}

/**
 * AST churn calculator contract.
 */
export interface IAstChurnCalculatorService {
    /**
     * Calculates file churn using git history.
     *
     * @param input Churn calculator input payload.
     * @returns Deterministic churn result.
     */
    calculate(input: IAstChurnCalculatorInput): Promise<IAstChurnCalculatorResult>
}

/**
 * Calculates file churn by counting unique commits from git log output.
 */
export class AstChurnCalculatorService implements IAstChurnCalculatorService {
    private readonly executeGit: AstChurnCalculatorExecuteGit
    private readonly defaultLookbackDays: number
    private readonly now: AstChurnCalculatorNow

    /**
     * Creates AST churn calculator service.
     *
     * @param options Optional runtime overrides.
     */
    public constructor(options: IAstChurnCalculatorServiceOptions = {}) {
        this.executeGit = validateExecuteGit(options.executeGit ?? executeGitCommand)
        this.defaultLookbackDays = validateDays(options.defaultLookbackDays ?? DEFAULT_LOOKBACK_DAYS)
        this.now = options.now ?? Date.now
    }

    /**
     * Calculates file churn metrics using `git log`.
     *
     * @param input Churn calculator input payload.
     * @returns Deterministic churn result.
     */
    public async calculate(input: IAstChurnCalculatorInput): Promise<IAstChurnCalculatorResult> {
        const normalizedInput = normalizeInput(input, this.defaultLookbackDays)
        const sinceIso = resolveSinceIso(normalizedInput.days, this.now)
        const items: IAstChurnCalculatorItem[] = []

        for (const filePath of normalizedInput.filePaths) {
            const churn = await this.calculateFileChurn(normalizedInput.repositoryPath, filePath, sinceIso)
            items.push({
                filePath,
                churn,
            })
        }

        return {
            items,
            summary: {
                fileCount: items.length,
                totalChurn: items.reduce((sum, item) => sum + item.churn, 0),
                days: normalizedInput.days,
                sinceIso,
            },
        }
    }

    /**
     * Calculates churn for one file path using git history.
     *
     * @param repositoryPath Local repository path.
     * @param filePath Repository-relative file path.
     * @param sinceIso Lower-bound ISO timestamp for git log.
     * @returns Unique commit count.
     */
    private async calculateFileChurn(
        repositoryPath: string,
        filePath: string,
        sinceIso: string,
    ): Promise<number> {
        try {
            const output = await this.executeGit(
                "git",
                [
                    "log",
                    `--since=${sinceIso}`,
                    "--pretty=format:%H",
                    "--",
                    filePath,
                ],
                repositoryPath,
            )
            return parseUniqueCommitCount(output)
        } catch (error) {
            throw new AstChurnCalculatorError(
                AST_CHURN_CALCULATOR_ERROR_CODE.GIT_LOG_FAILED,
                {
                    repositoryPath,
                    filePath,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }
}

/**
 * Normalizes and validates churn input payload.
 *
 * @param input Raw churn input.
 * @param defaultLookbackDays Default lookback window.
 * @returns Normalized churn input.
 */
function normalizeInput(
    input: IAstChurnCalculatorInput,
    defaultLookbackDays: number,
): INormalizedAstChurnCalculatorInput {
    return {
        repositoryPath: normalizeRepositoryPath(input.repositoryPath),
        filePaths: normalizeFilePaths(input.filePaths),
        days: validateDays(input.days ?? defaultLookbackDays),
    }
}

/**
 * Normalizes repository path.
 *
 * @param repositoryPath Raw repository path.
 * @returns Trimmed repository path.
 */
function normalizeRepositoryPath(repositoryPath: string): string {
    const normalizedRepositoryPath = repositoryPath.trim()
    if (normalizedRepositoryPath.length > 0) {
        return normalizedRepositoryPath
    }

    throw new AstChurnCalculatorError(
        AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_REPOSITORY_PATH,
        {
            repositoryPath,
        },
    )
}

/**
 * Normalizes file paths and ensures deterministic unique order.
 *
 * @param filePaths Raw file paths.
 * @returns Sorted unique normalized file paths.
 */
function normalizeFilePaths(filePaths: readonly string[]): readonly string[] {
    if (filePaths.length === 0) {
        throw new AstChurnCalculatorError(AST_CHURN_CALCULATOR_ERROR_CODE.EMPTY_FILE_PATHS)
    }

    const normalizedPaths = new Set<string>()

    for (const filePath of filePaths) {
        const normalizedPath = normalizeFilePath(filePath)
        if (normalizedPaths.has(normalizedPath)) {
            throw new AstChurnCalculatorError(
                AST_CHURN_CALCULATOR_ERROR_CODE.DUPLICATE_FILE_PATH,
                {filePath: normalizedPath},
            )
        }

        normalizedPaths.add(normalizedPath)
    }

    return [...normalizedPaths].sort((left, right) => left.localeCompare(right))
}

/**
 * Normalizes one repository-relative file path.
 *
 * @param filePath Raw file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstChurnCalculatorError(
            AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Validates lookback window in days.
 *
 * @param days Raw lookback window.
 * @returns Validated lookback days.
 */
function validateDays(days: number): number {
    if (Number.isSafeInteger(days) && days > 0) {
        return days
    }

    throw new AstChurnCalculatorError(AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_DAYS, {days})
}

/**
 * Validates git command executor.
 *
 * @param executeGit Candidate git command executor.
 * @returns Validated git command executor.
 */
function validateExecuteGit(executeGit: AstChurnCalculatorExecuteGit): AstChurnCalculatorExecuteGit {
    if (typeof executeGit === "function") {
        return executeGit
    }

    throw new AstChurnCalculatorError(AST_CHURN_CALCULATOR_ERROR_CODE.INVALID_EXECUTE_GIT)
}

/**
 * Resolves `git log --since=` timestamp from lookback window.
 *
 * @param days Lookback window in days.
 * @param now Clock callback.
 * @returns ISO timestamp for git log lower bound.
 */
function resolveSinceIso(days: number, now: AstChurnCalculatorNow): string {
    return new Date(now() - days * MS_IN_DAY).toISOString()
}

/**
 * Parses unique commit count from git log output.
 *
 * @param output Raw git log output.
 * @returns Unique commit count.
 */
function parseUniqueCommitCount(output: string): number {
    if (output.trim().length === 0) {
        return 0
    }

    const uniqueCommits = new Set<string>()
    const lines = output.split("\n")

    for (const line of lines) {
        const normalizedLine = line.trim()
        if (normalizedLine.length > 0) {
            uniqueCommits.add(normalizedLine)
        }
    }

    return uniqueCommits.size
}

/**
 * Executes one git command and returns stdout string.
 *
 * @param command Executable command.
 * @param args Command arguments.
 * @param cwd Working directory.
 * @returns Command stdout.
 */
async function executeGitCommand(
    command: string,
    args: readonly string[],
    cwd: string,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
        })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (chunk: unknown): void => {
            stdout += String(chunk)
        })

        child.stderr.on("data", (chunk: unknown): void => {
            stderr += String(chunk)
        })

        child.on("error", (error: Error): void => {
            reject(error)
        })

        child.on("close", (code: number | null): void => {
            if (code === 0) {
                resolve(stdout)
                return
            }

            const message =
                stderr.trim().length > 0
                    ? stderr.trim()
                    : `Git command failed with exit code ${String(code ?? "unknown")}`
            reject(new Error(message))
        })
    })
}

/**
 * Resolves unknown error payload to stable message.
 *
 * @param error Unknown error payload.
 * @returns Stable error message.
 */
function resolveUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown error"
}
