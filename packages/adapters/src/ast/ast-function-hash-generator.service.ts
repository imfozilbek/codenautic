import {
    FilePath,
    hash,
    type IAstCallDTO,
    type IAstFunctionDTO,
    type IAstImportDTO,
    type SupportedLanguage,
} from "@codenautic/core"

import {
    AST_FUNCTION_HASH_GENERATOR_ERROR_CODE,
    AstFunctionHashGeneratorError,
} from "./ast-function-hash-generator.error"

const UNKNOWN_RETURN_TYPE = "unknown"

/**
 * Input payload for function hash generation.
 */
export interface IAstFunctionHashInput {
    /**
     * Repository-relative file path that owns function declaration.
     */
    readonly filePath: string

    /**
     * Parsed language for source file.
     */
    readonly language: SupportedLanguage

    /**
     * Function metadata extracted by parser.
     */
    readonly function: IAstFunctionDTO

    /**
     * Optional imports from source file.
     */
    readonly imports?: readonly IAstImportDTO[]

    /**
     * Optional call expressions from source file.
     */
    readonly calls?: readonly IAstCallDTO[]

    /**
     * Optional ordered function parameter types.
     */
    readonly parameterTypes?: readonly string[]

    /**
     * Optional return type.
     */
    readonly returnType?: string
}

/**
 * Output payload for function hash generation.
 */
export interface IAstFunctionHashResult {
    /**
     * Hash of normalized function AST payload.
     */
    readonly functionHash: string

    /**
     * Hash of normalized signature payload (`params + return`).
     */
    readonly signatureHash: string

    /**
     * Deterministic normalized signature payload.
     */
    readonly normalizedSignature: string

    /**
     * Deterministic normalized function payload.
     */
    readonly normalizedFunctionPayload: string
}

/**
 * Function hash generator service contract.
 */
export interface IAstFunctionHashGenerator {
    /**
     * Generates deterministic function and signature hashes.
     *
     * @param input Function hash input payload.
     * @returns Function hash result payload.
     */
    generateHashes(input: IAstFunctionHashInput): Promise<IAstFunctionHashResult>
}

interface IPreparedFunctionHashInput {
    readonly filePath: string
    readonly language: SupportedLanguage
    readonly functionName: string
    readonly function: IAstFunctionDTO
    readonly imports: readonly string[]
    readonly calls: readonly string[]
    readonly normalizedSignature: string
}

/**
 * Generates deterministic function and signature hashes from parsed AST data.
 */
export class AstFunctionHashGenerator implements IAstFunctionHashGenerator {
    /**
     * Generates deterministic function and signature hashes.
     *
     * @param input Function hash input payload.
     * @returns Function hash result payload.
     */
    public generateHashes(input: IAstFunctionHashInput): Promise<IAstFunctionHashResult> {
        const preparedInput = prepareInput(input)
        const normalizedFunctionPayload = buildNormalizedFunctionPayload(preparedInput)

        return Promise.resolve({
            functionHash: hash(normalizedFunctionPayload),
            signatureHash: hash(preparedInput.normalizedSignature),
            normalizedSignature: preparedInput.normalizedSignature,
            normalizedFunctionPayload,
        })
    }
}

/**
 * Normalizes raw hash input.
 *
 * @param input Raw hash input payload.
 * @returns Prepared normalized hash input.
 */
function prepareInput(input: IAstFunctionHashInput): IPreparedFunctionHashInput {
    const filePath = normalizeFilePath(input.filePath)
    const functionName = normalizeFunctionName(input.function.name)
    const imports = normalizeImports(input.imports ?? [])
    const calls = normalizeCalls(input.calls ?? [], functionName)
    const normalizedSignature = normalizeSignature(
        input.parameterTypes ?? [],
        input.returnType,
    )

    return {
        filePath,
        language: input.language,
        functionName,
        function: input.function,
        imports,
        calls,
        normalizedSignature,
    }
}

/**
 * Builds deterministic normalized payload for function hash.
 *
 * @param input Prepared hash input.
 * @returns Normalized function payload.
 */
function buildNormalizedFunctionPayload(input: IPreparedFunctionHashInput): string {
    const normalizedParentClassName =
        normalizeOptionalToken(input.function.parentClassName) ?? "<none>"
    const functionLineSpan = resolveLineSpan(
        input.function.location.lineStart,
        input.function.location.lineEnd,
    )

    return [
        `language=${normalizeToken(input.language)}`,
        `filePath=${input.filePath}`,
        `name=${normalizeToken(input.functionName)}`,
        `kind=${normalizeToken(input.function.kind)}`,
        `async=${input.function.async ? "1" : "0"}`,
        `exported=${input.function.exported ? "1" : "0"}`,
        `parent=${normalizedParentClassName}`,
        `lineSpan=${functionLineSpan}`,
        `imports=${input.imports.join(",")}`,
        `calls=${input.calls.join(",")}`,
        `signature=${input.normalizedSignature}`,
    ].join("|")
}

/**
 * Resolves normalized line-span token.
 *
 * @param lineStart Function start line.
 * @param lineEnd Function end line.
 * @returns Deterministic line-span token.
 */
function resolveLineSpan(lineStart: number, lineEnd: number): string {
    return String(Math.max(1, lineEnd - lineStart + 1))
}

/**
 * Normalizes imports for deterministic hashing.
 *
 * @param imports Raw imports.
 * @returns Normalized sorted unique imports.
 */
function normalizeImports(imports: readonly IAstImportDTO[]): readonly string[] {
    const normalizedImports = new Set<string>()

    for (const fileImport of imports) {
        const source = normalizeOptionalToken(fileImport.source)
        if (source !== undefined) {
            normalizedImports.add(source)
        }
    }

    return [...normalizedImports].sort()
}

/**
 * Normalizes calls for deterministic hashing.
 *
 * @param calls Raw calls.
 * @param functionName Target function name.
 * @returns Normalized sorted unique calls.
 */
function normalizeCalls(calls: readonly IAstCallDTO[], functionName: string): readonly string[] {
    const normalizedCalls = new Set<string>()

    for (const call of calls) {
        if (belongsToFunctionCall(call, functionName) === false) {
            continue
        }

        const normalizedCallee = normalizeOptionalToken(call.callee)
        if (normalizedCallee !== undefined) {
            normalizedCalls.add(normalizedCallee)
        }
    }

    return [...normalizedCalls].sort()
}

/**
 * Checks whether call belongs to target function context.
 *
 * @param call Call DTO.
 * @param functionName Target function name.
 * @returns True when call belongs to function context.
 */
function belongsToFunctionCall(call: IAstCallDTO, functionName: string): boolean {
    const caller = normalizeOptionalToken(call.caller)
    if (caller === undefined) {
        return true
    }

    return caller === normalizeToken(functionName)
}

/**
 * Normalizes signature payload (`params + return`) for deterministic hashing.
 *
 * @param parameterTypes Raw ordered parameter types.
 * @param returnType Raw return type.
 * @returns Normalized signature payload.
 */
function normalizeSignature(parameterTypes: readonly string[], returnType?: string): string {
    const normalizedParameterTypes = parameterTypes.map((parameterType) =>
        normalizeParameterType(parameterType),
    )
    const normalizedReturnType =
        returnType !== undefined
            ? normalizeReturnType(returnType)
            : UNKNOWN_RETURN_TYPE

    return `(${normalizedParameterTypes.join(",")})=>${normalizedReturnType}`
}

/**
 * Validates and normalizes one parameter type token.
 *
 * @param parameterType Raw parameter type token.
 * @returns Normalized parameter type token.
 */
function normalizeParameterType(parameterType: string): string {
    const normalizedParameterType = normalizeToken(parameterType)
    if (normalizedParameterType.length === 0) {
        throw new AstFunctionHashGeneratorError(
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_PARAMETER_TYPE,
            {parameterType},
        )
    }

    return normalizedParameterType
}

/**
 * Validates and normalizes return type token.
 *
 * @param returnType Raw return type token.
 * @returns Normalized return type token.
 */
function normalizeReturnType(returnType: string): string {
    const normalizedReturnType = normalizeToken(returnType)
    if (normalizedReturnType.length === 0) {
        throw new AstFunctionHashGeneratorError(
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_RETURN_TYPE,
            {returnType},
        )
    }

    return normalizedReturnType
}

/**
 * Validates and normalizes file path.
 *
 * @param filePath Raw repository-relative file path.
 * @returns Normalized file path.
 */
function normalizeFilePath(filePath: string): string {
    try {
        return FilePath.create(filePath).toString()
    } catch {
        throw new AstFunctionHashGeneratorError(
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_FILE_PATH,
            {filePath},
        )
    }
}

/**
 * Validates and normalizes function name.
 *
 * @param functionName Raw function name.
 * @returns Normalized function name.
 */
function normalizeFunctionName(functionName: string): string {
    const normalizedFunctionName = functionName.trim()
    if (normalizedFunctionName.length === 0) {
        throw new AstFunctionHashGeneratorError(
            AST_FUNCTION_HASH_GENERATOR_ERROR_CODE.INVALID_FUNCTION_NAME,
            {functionName},
        )
    }

    return normalizedFunctionName
}

/**
 * Normalizes required token for deterministic hashing.
 *
 * @param value Raw token.
 * @returns Normalized token.
 */
function normalizeToken(value: string): string {
    return value.trim().toLowerCase()
}

/**
 * Normalizes optional token and filters blank values.
 *
 * @param value Optional raw token.
 * @returns Normalized token or undefined.
 */
function normalizeOptionalToken(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined
    }

    const normalizedValue = normalizeToken(value)
    return normalizedValue.length > 0 ? normalizedValue : undefined
}
