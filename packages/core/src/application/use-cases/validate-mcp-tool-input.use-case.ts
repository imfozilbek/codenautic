import {Result} from "../../shared/result"
import {ValidationError} from "../../domain/errors/validation.error"
import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IMCPTool} from "../dto/mcp"
import {validateInputAgainstSchema} from "../services/mcp-server"

/**
 * Input for MCP tool input validation.
 */
export interface IValidateMCPToolInputInput {
    /**
     * Target MCP tool.
     */
    readonly tool: IMCPTool

    /**
     * Candidate arguments.
     */
    readonly arguments: Record<string, unknown>
}

/**
 * Output for MCP tool input validation.
 */
export interface IValidateMCPToolInputOutput {
    /**
     * True when input can be executed.
     */
    readonly valid: boolean

    /**
     * List of validation errors.
     */
    readonly errors: readonly string[]
}

/**
 * Validates MCP tool arguments against schema.
 */
export class ValidateMCPToolInputUseCase
    implements IUseCase<IValidateMCPToolInputInput, IValidateMCPToolInputOutput, ValidationError>
{
    /**
     * Creates validation use case instance.
     */
    public constructor() {
    }

    /**
     * Validates input against tool schema.
     *
     * @param input Validation request.
     * @returns Validation result.
     */
    public execute(input: IValidateMCPToolInputInput): Promise<Result<IValidateMCPToolInputOutput, ValidationError>> {
        if (isValidValidationInput(input) === false) {
            return Promise.resolve(
                Result.fail<IValidateMCPToolInputOutput, ValidationError>(
                    new ValidationError("Validate MCP tool input failed", [
                        {
                            field: "input",
                            message: "tool and arguments are required",
                        },
                    ]),
                ),
            )
        }

        const args = input.arguments
        const validation = validateInputAgainstSchema(args, input.tool.inputSchema)
        if (validation.isValid === false) {
            return Promise.resolve(
                Result.ok<IValidateMCPToolInputOutput, ValidationError>({
                    valid: false,
                    errors: validation.errors,
                }),
            )
        }

        return Promise.resolve(
            Result.ok<IValidateMCPToolInputOutput, ValidationError>({
                valid: true,
                errors: [],
            }),
        )
    }
}

/**
 * Validates input shape.
 *
 * @param input Unknown input.
 * @returns True when payload is well-formed.
 */
function isValidValidationInput(input: unknown): input is IValidateMCPToolInputInput {
    if (typeof input !== "object" || input === null) {
        return false
    }
    if (hasValidTool(input as Record<string, unknown>) === false) {
        return false
    }
    if (hasArguments(input as Record<string, unknown>) === false) {
        return false
    }
    return true
}

/**
 * Ensures source contains valid tool.
 *
 * @param source Candidate source.
 * @returns True when tool matches schema.
 */
function hasValidTool(source: Record<string, unknown>): source is {tool: IMCPTool} {
    if (typeof source.tool !== "object" || source.tool === null || Array.isArray(source.tool)) {
        return false
    }

    const toolCandidate = source.tool as {
        readonly name?: unknown
        readonly description?: unknown
        readonly inputSchema?: unknown
        readonly outputSchema?: unknown
    }
    if (typeof toolCandidate.name !== "string" || toolCandidate.name.trim().length === 0) {
        return false
    }
    if (typeof toolCandidate.description !== "string" || toolCandidate.description.trim().length === 0) {
        return false
    }
    if (toolCandidate.inputSchema === undefined || isRecord(toolCandidate.inputSchema) === false) {
        return false
    }

    return true
}

/**
 * Ensures source has arguments map.
 *
 * @param source Candidate source.
 * @returns True when arguments is object.
 */
function hasArguments(source: Record<string, unknown>): source is {arguments: Record<string, unknown>} {
    return isRecord(source.arguments)
}

/**
 * Проверяет, является ли значение обычным объектом.
 *
 * @param value Candidate value.
 * @returns True when value is record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && Array.isArray(value) === false
}
