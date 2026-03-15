import {readFile} from "node:fs/promises"
import {isAbsolute, relative, resolve} from "node:path"

import {
    FilePath,
    type IFileMetricsDTO,
    type IFileMetricsProvider,
    type SupportedLanguage,
} from "@codenautic/core"

import {
    type IAstChurnCalculatorInput,
    type IAstChurnCalculatorService,
    AstChurnCalculatorService,
} from "./ast-churn-calculator.service"
import {
    type IAstCyclomaticComplexityInput,
    type IAstCyclomaticComplexityService,
    AstCyclomaticComplexityService,
} from "./ast-cyclomatic-complexity.service"
import {
    AST_FILE_METRICS_PROVIDER_ERROR_CODE,
    AstFileMetricsProviderError,
} from "./ast-file-metrics-provider.error"
import {
    type IAstLanguageDetectionService,
    AstLanguageDetectionService,
} from "./ast-language-detection.service"
import {
    type IAstLocCalculatorInput,
    type IAstLocCalculatorService,
    AstLocCalculatorService,
} from "./ast-loc-calculator.service"

const DEFAULT_CHURN_DAYS = 30

interface IAstFileMetricsProviderSourceFile {
    readonly filePath: string
    readonly language: SupportedLanguage
    readonly sourceCode: string
}

/**
 * Repository path resolver callback.
 */
export type AstFileMetricsProviderResolveRepositoryPath = (
    repositoryId: string,
) => Promise<string> | string

/**
 * UTF-8 source file reader callback.
 */
export type AstFileMetricsProviderReadFile = (
    absoluteFilePath: string,
) => Promise<string>

/**
 * Runtime options for AST file metrics provider.
 */
export interface IAstFileMetricsProviderOptions {
    /**
     * Optional repository id -> local path resolver.
     */
    readonly resolveRepositoryPath?: AstFileMetricsProviderResolveRepositoryPath

    /**
     * Optional source file reader override.
     */
    readonly readFile?: AstFileMetricsProviderReadFile

    /**
     * Optional AST language detection service override.
     */
    readonly languageDetectionService?: IAstLanguageDetectionService

    /**
     * Optional LOC calculator override.
     */
    readonly locCalculator?: IAstLocCalculatorService

    /**
     * Optional cyclomatic complexity calculator override.
     */
    readonly cyclomaticComplexityCalculator?: IAstCyclomaticComplexityService

    /**
     * Optional churn calculator override.
     */
    readonly churnCalculator?: IAstChurnCalculatorService

    /**
     * Optional default churn lookback window in days.
     */
    readonly defaultChurnDays?: number
}

/**
 * AST-backed implementation of `IFileMetricsProvider`.
 */
export class AstFileMetricsProvider implements IFileMetricsProvider {
    private readonly resolveRepositoryPath: AstFileMetricsProviderResolveRepositoryPath
    private readonly readFile: AstFileMetricsProviderReadFile
    private readonly languageDetectionService: IAstLanguageDetectionService
    private readonly locCalculator: IAstLocCalculatorService
    private readonly cyclomaticComplexityCalculator: IAstCyclomaticComplexityService
    private readonly churnCalculator: IAstChurnCalculatorService
    private readonly defaultChurnDays: number

    /**
     * Creates AST file metrics provider.
     *
     * @param options Optional runtime dependencies and settings.
     */
    public constructor(options: IAstFileMetricsProviderOptions = {}) {
        this.resolveRepositoryPath = validateResolveRepositoryPath(
            options.resolveRepositoryPath ?? defaultResolveRepositoryPath,
        )
        this.readFile = validateReadFile(options.readFile ?? defaultReadFile)
        this.languageDetectionService =
            options.languageDetectionService ?? new AstLanguageDetectionService()
        this.locCalculator = options.locCalculator ?? new AstLocCalculatorService()
        this.cyclomaticComplexityCalculator =
            options.cyclomaticComplexityCalculator ?? new AstCyclomaticComplexityService()
        this.churnCalculator = options.churnCalculator ?? new AstChurnCalculatorService()
        this.defaultChurnDays = validateDefaultChurnDays(
            options.defaultChurnDays ?? DEFAULT_CHURN_DAYS,
        )
    }

    /**
     * Returns aggregated AST metrics for requested file paths.
     *
     * @param repositoryId Repository identifier.
     * @param filePaths Repository-relative file paths.
     * @returns Metrics in the same order as requested file paths.
     */
    public async getMetrics(
        repositoryId: string,
        filePaths: readonly string[],
    ): Promise<readonly IFileMetricsDTO[]> {
        const normalizedRepositoryId = normalizeRepositoryId(repositoryId)
        const normalizedFilePaths = normalizeFilePaths(filePaths)
        if (normalizedFilePaths.length === 0) {
            return []
        }

        const uniqueFilePaths = resolveUniqueFilePaths(normalizedFilePaths)
        const repositoryPath = await this.resolveRepositoryPathOrThrow(normalizedRepositoryId)
        const sourceFiles = await this.loadSourceFiles(
            normalizedRepositoryId,
            repositoryPath,
            uniqueFilePaths,
        )

        const [locByFile, complexityByFile, churnByFile] = await Promise.all([
            this.calculateLocByFile(normalizedRepositoryId, sourceFiles, uniqueFilePaths),
            this.calculateComplexityByFile(
                normalizedRepositoryId,
                sourceFiles,
                uniqueFilePaths,
            ),
            this.calculateChurnByFile(
                normalizedRepositoryId,
                repositoryPath,
                uniqueFilePaths,
            ),
        ])

        return normalizedFilePaths.map((filePath): IFileMetricsDTO => ({
            filePath,
            loc: locByFile.get(filePath) ?? 0,
            complexity: complexityByFile.get(filePath) ?? 0,
            churn: churnByFile.get(filePath) ?? 0,
            issueCount: 0,
        }))
    }

    /**
     * Resolves local repository path for requested repository identifier.
     *
     * @param repositoryId Normalized repository identifier.
     * @returns Canonical absolute repository path.
     */
    private async resolveRepositoryPathOrThrow(repositoryId: string): Promise<string> {
        try {
            const repositoryPath = await this.resolveRepositoryPath(repositoryId)
            return normalizeRepositoryPath(repositoryPath, repositoryId)
        } catch (error) {
            if (error instanceof AstFileMetricsProviderError) {
                throw error
            }

            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.REPOSITORY_PATH_RESOLUTION_FAILED,
                {
                    repositoryId,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }

    /**
     * Loads source files and detects language per requested path.
     *
     * @param repositoryId Normalized repository identifier.
     * @param repositoryPath Canonical local repository path.
     * @param filePaths Unique normalized file paths.
     * @returns Source files with detected language.
     */
    private async loadSourceFiles(
        repositoryId: string,
        repositoryPath: string,
        filePaths: readonly string[],
    ): Promise<readonly IAstFileMetricsProviderSourceFile[]> {
        return Promise.all(
            filePaths.map((filePath) =>
                this.loadSourceFile(repositoryId, repositoryPath, filePath),
            ),
        )
    }

    /**
     * Loads and normalizes one source file payload.
     *
     * @param repositoryId Normalized repository identifier.
     * @param repositoryPath Canonical local repository path.
     * @param filePath Normalized repository-relative file path.
     * @returns Source file input payload.
     */
    private async loadSourceFile(
        repositoryId: string,
        repositoryPath: string,
        filePath: string,
    ): Promise<IAstFileMetricsProviderSourceFile> {
        const absoluteFilePath = resolveAbsoluteFilePath(repositoryPath, filePath)
        const sourceCode = await this.readSourceCode(
            repositoryId,
            repositoryPath,
            filePath,
            absoluteFilePath,
        )
        const language = this.detectLanguage(filePath, sourceCode)

        return {
            filePath,
            language,
            sourceCode,
        }
    }

    /**
     * Reads one source file with typed failure wrapping.
     *
     * @param repositoryId Normalized repository identifier.
     * @param repositoryPath Canonical local repository path.
     * @param filePath Normalized repository-relative file path.
     * @param absoluteFilePath Absolute file path on disk.
     * @returns UTF-8 source code string.
     */
    private async readSourceCode(
        repositoryId: string,
        repositoryPath: string,
        filePath: string,
        absoluteFilePath: string,
    ): Promise<string> {
        try {
            return await this.readFile(absoluteFilePath)
        } catch (error) {
            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.FILE_READ_FAILED,
                {
                    repositoryId,
                    repositoryPath,
                    filePath,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }

    /**
     * Detects source language with typed failure wrapping.
     *
     * @param filePath Normalized repository-relative file path.
     * @param sourceCode UTF-8 source code.
     * @returns Detected supported language.
     */
    private detectLanguage(filePath: string, sourceCode: string): SupportedLanguage {
        try {
            return this.languageDetectionService.detect({
                filePath,
                content: sourceCode,
            })
        } catch (error) {
            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.LANGUAGE_DETECTION_FAILED,
                {
                    filePath,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }

    /**
     * Calculates LOC map by file path.
     *
     * @param repositoryId Normalized repository identifier.
     * @param sourceFiles Source file payloads.
     * @param filePaths Unique normalized file paths.
     * @returns LOC map by file path.
     */
    private async calculateLocByFile(
        repositoryId: string,
        sourceFiles: readonly IAstFileMetricsProviderSourceFile[],
        filePaths: readonly string[],
    ): Promise<ReadonlyMap<string, number>> {
        const input: IAstLocCalculatorInput = {
            files: sourceFiles,
            filePaths,
        }

        try {
            const result = await this.locCalculator.calculate(input)
            return new Map<string, number>(
                result.items.map((item): readonly [string, number] => [
                    item.filePath,
                    item.loc,
                ]),
            )
        } catch (error) {
            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.LOC_CALCULATION_FAILED,
                {
                    repositoryId,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }

    /**
     * Calculates complexity map by file path.
     *
     * @param repositoryId Normalized repository identifier.
     * @param sourceFiles Source file payloads.
     * @param filePaths Unique normalized file paths.
     * @returns Cyclomatic complexity map by file path.
     */
    private async calculateComplexityByFile(
        repositoryId: string,
        sourceFiles: readonly IAstFileMetricsProviderSourceFile[],
        filePaths: readonly string[],
    ): Promise<ReadonlyMap<string, number>> {
        const input: IAstCyclomaticComplexityInput = {
            files: sourceFiles,
            filePaths,
        }

        try {
            const result = await this.cyclomaticComplexityCalculator.calculate(input)
            return new Map<string, number>(
                result.items.map((item): readonly [string, number] => [
                    item.filePath,
                    item.complexity,
                ]),
            )
        } catch (error) {
            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.COMPLEXITY_CALCULATION_FAILED,
                {
                    repositoryId,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }

    /**
     * Calculates churn map by file path.
     *
     * @param repositoryId Normalized repository identifier.
     * @param repositoryPath Canonical local repository path.
     * @param filePaths Unique normalized file paths.
     * @returns Churn map by file path.
     */
    private async calculateChurnByFile(
        repositoryId: string,
        repositoryPath: string,
        filePaths: readonly string[],
    ): Promise<ReadonlyMap<string, number>> {
        const input: IAstChurnCalculatorInput = {
            repositoryPath,
            filePaths,
            days: this.defaultChurnDays,
        }

        try {
            const result = await this.churnCalculator.calculate(input)
            return new Map<string, number>(
                result.items.map((item): readonly [string, number] => [
                    item.filePath,
                    item.churn,
                ]),
            )
        } catch (error) {
            throw new AstFileMetricsProviderError(
                AST_FILE_METRICS_PROVIDER_ERROR_CODE.CHURN_CALCULATION_FAILED,
                {
                    repositoryId,
                    repositoryPath,
                    causeMessage: resolveUnknownErrorMessage(error),
                },
            )
        }
    }
}

/**
 * Validates repository id.
 *
 * @param repositoryId Raw repository identifier.
 * @returns Normalized repository identifier.
 */
function normalizeRepositoryId(repositoryId: string): string {
    const normalizedRepositoryId = repositoryId.trim()
    if (normalizedRepositoryId.length > 0) {
        return normalizedRepositoryId
    }

    throw new AstFileMetricsProviderError(
        AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_REPOSITORY_ID,
        {
            repositoryId,
        },
    )
}

/**
 * Normalizes repository-relative file paths.
 *
 * @param filePaths Raw file path list.
 * @returns Normalized file paths in the same order.
 */
function normalizeFilePaths(filePaths: readonly string[]): readonly string[] {
    return filePaths.map((filePath) => normalizeFilePath(filePath))
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
        throw new AstFileMetricsProviderError(
            AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_FILE_PATH,
            {
                filePath,
            },
        )
    }
}

/**
 * Produces deterministic unique file paths while preserving first-seen order.
 *
 * @param filePaths Normalized file paths.
 * @returns Unique file paths.
 */
function resolveUniqueFilePaths(filePaths: readonly string[]): readonly string[] {
    return [...new Set<string>(filePaths)]
}

/**
 * Normalizes resolved repository path and converts to absolute path.
 *
 * @param repositoryPath Raw repository path.
 * @param repositoryId Normalized repository identifier.
 * @returns Canonical absolute repository path.
 */
function normalizeRepositoryPath(
    repositoryPath: unknown,
    repositoryId: string,
): string {
    if (typeof repositoryPath !== "string") {
        throw new AstFileMetricsProviderError(
            AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_REPOSITORY_PATH,
            {
                repositoryId,
            },
        )
    }

    const normalizedRepositoryPath = repositoryPath.trim()
    if (normalizedRepositoryPath.length === 0) {
        throw new AstFileMetricsProviderError(
            AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_REPOSITORY_PATH,
            {
                repositoryId,
                repositoryPath,
            },
        )
    }

    return resolve(normalizedRepositoryPath)
}

/**
 * Resolves absolute file path and protects against path traversal.
 *
 * @param repositoryPath Canonical local repository path.
 * @param filePath Normalized repository-relative file path.
 * @returns Absolute file path.
 */
function resolveAbsoluteFilePath(repositoryPath: string, filePath: string): string {
    const absoluteFilePath = resolve(repositoryPath, filePath)
    const relativePath = relative(repositoryPath, absoluteFilePath)
    const isOutsideRepository = relativePath.startsWith("..") || isAbsolute(relativePath)
    if (!isOutsideRepository) {
        return absoluteFilePath
    }

    throw new AstFileMetricsProviderError(
        AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_FILE_PATH,
        {
            repositoryPath,
            filePath,
        },
    )
}

/**
 * Validates repository path resolver callback.
 *
 * @param resolveRepositoryPath Candidate resolver callback.
 * @returns Valid resolver callback.
 */
function validateResolveRepositoryPath(
    resolveRepositoryPath: AstFileMetricsProviderResolveRepositoryPath,
): AstFileMetricsProviderResolveRepositoryPath {
    if (typeof resolveRepositoryPath === "function") {
        return resolveRepositoryPath
    }

    throw new AstFileMetricsProviderError(
        AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_RESOLVE_REPOSITORY_PATH,
    )
}

/**
 * Validates source file reader callback.
 *
 * @param readFileCallback Candidate source file reader callback.
 * @returns Valid source file reader callback.
 */
function validateReadFile(
    readFileCallback: AstFileMetricsProviderReadFile,
): AstFileMetricsProviderReadFile {
    if (typeof readFileCallback === "function") {
        return readFileCallback
    }

    throw new AstFileMetricsProviderError(
        AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_READ_FILE,
    )
}

/**
 * Validates default churn lookback days.
 *
 * @param days Candidate churn lookback days.
 * @returns Valid churn lookback days.
 */
function validateDefaultChurnDays(days: number): number {
    if (Number.isSafeInteger(days) && days > 0) {
        return days
    }

    throw new AstFileMetricsProviderError(
        AST_FILE_METRICS_PROVIDER_ERROR_CODE.INVALID_DEFAULT_CHURN_DAYS,
        {days},
    )
}

/**
 * Default repository path resolver.
 *
 * @param repositoryId Repository identifier.
 * @returns Repository identifier interpreted as local repository path.
 */
function defaultResolveRepositoryPath(repositoryId: string): string {
    return repositoryId
}

/**
 * Default UTF-8 source file reader.
 *
 * @param absoluteFilePath Absolute file path.
 * @returns UTF-8 source code.
 */
async function defaultReadFile(absoluteFilePath: string): Promise<string> {
    return readFile(absoluteFilePath, "utf8")
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
