import {Result} from "../../shared/result"
import {ValidationError} from "../../domain/errors/validation.error"
import type {IUseCase} from "../ports/inbound/use-case.port"
import {
    MCP_METHOD,
    type IMCPToolsListResponse,
} from "../dto/mcp"
import type {IMCPServer} from "../services/mcp-server"

/**
 * Input for MCP tools discovery.
 */
export interface IDiscoverMCPToolsInput {
    /**
     * MCP server.
     */
    readonly server: IMCPServer
}

/**
 * Output for MCP tools discovery.
 */
export interface IDiscoverMCPToolsOutput {
    /**
     * Snapshot of registered tools.
     */
    readonly tools: IMCPToolsListResponse["tools"]
}

/**
 * Discover registered MCP tools.
 */
export class DiscoverMCPToolsUseCase implements IUseCase<IDiscoverMCPToolsInput, IDiscoverMCPToolsOutput, ValidationError> {
    /**
     * Creates discover use case instance.
     */
    public constructor() {
    }

    /**
     * Returns registered tool list.
     *
 * @param input Discovery request.
     * @returns Registered tools list.
     */
    public async execute(input: IDiscoverMCPToolsInput): Promise<Result<IDiscoverMCPToolsOutput, ValidationError>> {
        if (isServerOnly(input) === false) {
            return Promise.resolve(
                Result.fail<IDiscoverMCPToolsOutput, ValidationError>(
                    new ValidationError("Discover MCP tools failed", [
                        {
                            field: "server",
                            message: "server is required",
                        },
                    ]),
                ),
            )
        }

        try {
            const response = await input.server.handleRequest({
                id: "discover-tools",
                method: MCP_METHOD.TOOLS_LIST,
            })

            if (response.error !== undefined || response.result === undefined) {
                return Result.fail<IDiscoverMCPToolsOutput, ValidationError>(
                    new ValidationError("Discover MCP tools failed", [
                        {
                            field: "server",
                            message: response.error?.message ?? "tool discovery failed",
                        },
                    ]),
                )
            }

            if (isMCPToolsListResponse(response.result) === false) {
                return Result.fail<IDiscoverMCPToolsOutput, ValidationError>(
                    new ValidationError("Discover MCP tools failed", [
                        {
                            field: "tools",
                            message: "server returned unexpected tools/list format",
                        },
                    ]),
                )
            }

            return Result.ok<IDiscoverMCPToolsOutput, ValidationError>({
                tools: response.result.tools,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "tool discovery failed"
            return Result.fail<IDiscoverMCPToolsOutput, ValidationError>(
                new ValidationError("Discover MCP tools failed", [
                    {
                        field: "server",
                        message,
                    },
                ]),
            )
        }
    }
}

/**
 * Validates discover input.
 *
 * @param input Request.
 * @returns True when server exists.
 */
function isServerOnly(input: unknown): input is IDiscoverMCPToolsInput {
    return input !== undefined && input !== null && typeof input === "object" && "server" in input
}

/**
 * Validates tools/list response format.
 *
 * @param payload Response payload.
 * @returns True when payload has tools list.
 */
function isMCPToolsListResponse(payload: unknown): payload is IMCPToolsListResponse {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "tools" in payload &&
        Array.isArray((payload as {readonly tools: unknown[]}).tools)
    )
}
