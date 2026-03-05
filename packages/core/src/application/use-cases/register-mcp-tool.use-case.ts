import {Result} from "../../shared/result"
import type {
    IMCPTool,
    IMCPToolHandler,
} from "../dto/mcp"
import {ValidationError} from "../../domain/errors/validation.error"
import type {IUseCase} from "../ports/inbound/use-case.port"
import type {IMCPServer} from "../services/mcp-server"

/**
 * Input for MCP tool registration.
 */
export interface IRegisterMCPToolInput {
    /**
     * MCP server.
     */
    readonly server: IMCPServer

    /**
     * Tool definition.
     */
    readonly tool: IMCPTool

    /**
     * Tool execution handler.
     */
    readonly handler: IMCPToolHandler
}

/**
 * Output for MCP tool registration.
 */
export interface IRegisterMCPToolOutput {
    /**
     * Registration success flag.
     */
    readonly registered: boolean
}

/**
 * Registers MCP tool into server registry.
 */
export class RegisterMCPToolUseCase implements IUseCase<IRegisterMCPToolInput, IRegisterMCPToolOutput, ValidationError> {
    /**
     * Creates register use case instance.
     */
    public constructor() {
    }

    /**
     * Registers tool and returns success.
     *
     * @param input Registration request.
     * @returns Registration result.
     */
    public execute(input: IRegisterMCPToolInput): Promise<Result<IRegisterMCPToolOutput, ValidationError>> {
        if (isValidRegisterInput(input) === false) {
            return Promise.resolve(
                Result.fail<IRegisterMCPToolOutput, ValidationError>(
                    new ValidationError("Register MCP tool failed", [
                        {
                            field: "input",
                            message: "server, tool and handler are required",
                        },
                    ]),
                ),
            )
        }

        try {
            input.server.registerTool(input.tool, input.handler)
            return Promise.resolve(Result.ok<IRegisterMCPToolOutput, ValidationError>({registered: true}))
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "unknown error"
            return Promise.resolve(
                Result.fail<IRegisterMCPToolOutput, ValidationError>(
                    new ValidationError("Register MCP tool failed", [
                        {
                            field: "tool",
                            message,
                        },
                    ]),
                ),
            )
        }
    }
}

/**
 * Validates registration input.
 *
 * @param input Registration input.
 * @returns True when required fields are present.
 */
function isValidRegisterInput(input: unknown): input is IRegisterMCPToolInput {
    if (typeof input !== "object" || input === null) {
        return false
    }

    const source = input as Record<string, unknown>
    return (
        source.server !== undefined &&
        source.server !== null &&
        hasValidServer(source.server) &&
        hasValidTool(source.tool) &&
        hasValidToolHandler(source.handler)
    )
}

/**
 * Validates MCP server handler.
 *
 * @param server Candidate server.
 * @returns True when value is MCP server with expected method.
 */
function hasValidServer(server: unknown): server is IMCPServer {
    if (server === null || server === undefined || typeof server !== "object") {
        return false
    }

    return "registerTool" in server && typeof (server as {readonly registerTool: unknown}).registerTool === "function"
}

/**
 * Validates MCP tool contract.
 *
 * @param tool Candidate tool.
 * @returns True when tool shape is valid.
 */
function hasValidTool(tool: unknown): tool is IMCPTool {
    if (tool === null || tool === undefined || typeof tool !== "object") {
        return false
    }

    const toolCandidate = tool as Record<string, unknown>
    return (
        typeof toolCandidate.name === "string" &&
        typeof toolCandidate.description === "string" &&
        toolCandidate.description.length > 0 &&
        toolCandidate.inputSchema !== undefined &&
        typeof toolCandidate.inputSchema === "object"
    )
}

/**
 * Validates handler type.
 *
 * @param handler Candidate handler.
 * @returns True when function.
 */
function hasValidToolHandler(handler: unknown): handler is IMCPToolHandler {
    return typeof handler === "function"
}
