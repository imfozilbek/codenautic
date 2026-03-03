import {
    type IMCPInitializeResponse,
    type IMCPJSONSchema,
    type IMCPRequest,
    type IMCPRequestId,
    type IMCPResource,
    type IMCPResourceProvider,
    type IMCPResponseError,
    type IMCPResourcesListResponse,
    type IMCPTextContent,
    type IMCPTool,
    type IMCPToolCallRequest,
    type IMCPToolCallResponse,
    type IMCPToolHandler,
    type IMCPToolResult,
    type IMCPToolsListResponse,
    MCP_METHOD,
} from "../dto/mcp"

/**
 * Contract for MCP server implementation.
 */
export interface IMCPServer {
    /**
     * Registers MCP tool and handler.
     *
     * @param tool Tool definition.
     * @param handler Execution handler.
     */
    registerTool(tool: IMCPTool, handler: IMCPToolHandler): void

    /**
     * Registers MCP resource and optional provider.
     *
     * @param resource Resource metadata.
     * @param provider Resource value provider.
     */
    registerResource(resource: IMCPResource, provider: IMCPResourceProvider): void

    /**
     * Handles MCP request.
     *
     * @param request JSON-RPC request.
     * @returns JSON-RPC response.
     */
    handleRequest(request: IMCPRequest): Promise<IMCPToolResult>
}

/**
 * In-memory MCP server implementation.
 */
export class MCPServer implements IMCPServer {
    private readonly tools = new Map<string, IMCPTool>()
    private readonly resources = new Map<string, IMCPResource>()
    private readonly handlers = new Map<string, IMCPToolHandler>()
    private readonly resourceProviders = new Map<string, IMCPResourceProvider>()

    private static readonly JSONRPC_VERSION = "2.0"
    private static readonly DEFAULT_PROTOCOL_VERSION = "2025-01-01"
    private static readonly INVALID_REQUEST = -32600
    private static readonly METHOD_NOT_FOUND = -32601
    private static readonly INVALID_PARAMS = -32602

    /**
     * {@inheritDoc}
     */
    public registerTool(tool: IMCPTool, handler: IMCPToolHandler): void {
        const normalizedTool = this.normalizeTool(tool)
        const normalizedHandler = this.normalizeToolHandler(handler)

        this.tools.set(normalizedTool.name, normalizedTool)
        this.handlers.set(normalizedTool.name, normalizedHandler)
    }

    /**
     * {@inheritDoc}
     */
    public registerResource(resource: IMCPResource, provider: IMCPResourceProvider): void {
        const normalizedResource = this.normalizeResource(resource)
        const normalizedProvider = this.normalizeResourceProvider(provider)

        this.resources.set(normalizedResource.uri, normalizedResource)
        this.resourceProviders.set(normalizedResource.uri, normalizedProvider)
    }

    /**
     * {@inheritDoc}
     */
    public async handleRequest(request: IMCPRequest): Promise<IMCPToolResult> {
        if (this.isValidRequest(request) === false) {
            return this.createErrorResponse(
                request?.id,
                MCPServer.INVALID_REQUEST,
                "request must be object with method",
            )
        }

        const requestMethod = String(request.method)
        if (requestMethod === MCP_METHOD.INITIALIZE) {
            return this.createInitializeResponse(request.id)
        }
        if (requestMethod === MCP_METHOD.TOOLS_LIST) {
            return this.createToolsListResponse(request.id)
        }
        if (requestMethod === MCP_METHOD.TOOLS_CALL) {
            return this.handleToolCall(request.id, request.params)
        }
        if (requestMethod === MCP_METHOD.RESOURCES_LIST) {
            return this.createResourcesListResponse(request.id)
        }

        return this.createErrorResponse(
            request.id,
            MCPServer.METHOD_NOT_FOUND,
            `method ${requestMethod} not found`,
        )
    }

    /**
     * Creates initialize response.
     *
     * @param id Request identifier.
     * @returns MCP initialize payload.
     */
    private createInitializeResponse(id: IMCPRequestId | undefined): IMCPToolResult {
        const payload: IMCPInitializeResponse = {
            protocolVersion: MCPServer.DEFAULT_PROTOCOL_VERSION,
            capabilities: {
                tools: {
                    listChanged: false,
                },
                resources: {
                    subscribe: false,
                    listChanged: false,
                },
            },
        }

        return {
            jsonrpc: MCPServer.JSONRPC_VERSION,
            id: this.normalizeRequestId(id),
            result: payload,
        }
    }

    /**
     * Creates tools/list response.
     *
     * @param id Request identifier.
     * @returns MCP tools list payload.
     */
    private createToolsListResponse(id: IMCPRequestId | undefined): IMCPToolResult {
        const payload: IMCPToolsListResponse = {
            tools: [...this.tools.values()],
        }

        return {
            jsonrpc: MCPServer.JSONRPC_VERSION,
            id: this.normalizeRequestId(id),
            result: payload,
        }
    }

    /**
     * Creates resources/list response.
     *
     * @param id Request identifier.
     * @returns MCP resources list payload.
     */
    private createResourcesListResponse(id: IMCPRequestId | undefined): IMCPToolResult {
        const payload: IMCPResourcesListResponse = {
            resources: [...this.resources.values()],
        }

        return {
            jsonrpc: MCPServer.JSONRPC_VERSION,
            id: this.normalizeRequestId(id),
            result: payload,
        }
    }

    /**
     * Handles tool invocation request.
     *
     * @param requestId Request identifier.
     * @param requestParams Raw params.
     * @returns Tool execution response.
     */
    private async handleToolCall(
        requestId: IMCPRequestId | undefined,
        requestParams: unknown,
    ): Promise<IMCPToolResult> {
        if (isRecord(requestParams) === false) {
            return this.createErrorResponse(
                requestId,
                MCPServer.INVALID_PARAMS,
                "tool call params must be object",
            )
        }

        const callRequestResult = this.normalizeToolCallParams(requestParams)
        if (callRequestResult.isValid === false) {
            return this.createErrorResponse(
                requestId,
                MCPServer.INVALID_PARAMS,
                callRequestResult.error,
            )
        }

        const callRequest = callRequestResult.value
        const handler = this.handlers.get(callRequest.name)
        const tool = this.tools.get(callRequest.name)
        if (handler === undefined || tool === undefined) {
            return this.createErrorResponse(
                requestId,
                MCPServer.METHOD_NOT_FOUND,
                `tool ${callRequest.name} is not registered`,
            )
        }

        const validationResult = validateInputAgainstSchema(callRequest.arguments, tool.inputSchema)
        if (validationResult.isValid === false) {
            return this.createErrorResponse(
                requestId,
                MCPServer.INVALID_PARAMS,
                validationResult.errors.join("; "),
            )
        }

        try {
            const handlerOutput = await handler(callRequest.arguments)
            const response: IMCPToolCallResponse = {
                content: this.createTextContent(handlerOutput),
            }

            return {
                jsonrpc: MCPServer.JSONRPC_VERSION,
                id: this.normalizeRequestId(requestId),
                result: response,
            }
        } catch (error: unknown) {
            return {
                jsonrpc: MCPServer.JSONRPC_VERSION,
                id: this.normalizeRequestId(requestId),
                result: {
                    content: this.createTextContent(this.readErrorMessage(error)),
                    isError: true,
                },
            }
        }
    }

    /**
     * Creates standardized error response.
     *
     * @param id Request identifier.
     * @param code Error code.
     * @param message Error message.
     * @param data Error details.
     * @returns MCP error response.
     */
    private createErrorResponse(
        id: IMCPRequestId | undefined,
        code: number,
        message: string,
        data?: unknown,
    ): IMCPToolResult {
        const error: IMCPResponseError = {
            code,
            message,
            ...(data !== undefined ? {data} : {}),
        }
        return {
            jsonrpc: MCPServer.JSONRPC_VERSION,
            id: this.normalizeRequestId(id),
            error,
        }
    }

    /**
     * Validates and normalizes incoming tool.
     *
     * @param tool Incoming tool definition.
     * @returns Normalized tool definition.
     */
    private normalizeTool(tool: IMCPTool): IMCPTool {
        const name = this.normalizeNonEmptyString(tool?.name, "tool name must be non-empty string")
        const description = this.normalizeNonEmptyString(
            tool?.description,
            "tool description must be non-empty string",
        )

        if (isValidToolSchema(tool?.inputSchema) === false) {
            throw new Error("tool inputSchema must be object")
        }

        return {
            name,
            description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
        }
    }

    /**
     * Normalizes handler value.
     *
     * @param handler Handler function.
     * @returns Normalized handler.
     */
    private normalizeToolHandler(handler: IMCPToolHandler): IMCPToolHandler {
        if (typeof handler !== "function") {
            throw new Error("tool handler must be function")
        }

        return handler
    }

    /**
     * Validates and normalizes resource metadata.
     *
     * @param resource Incoming resource metadata.
     * @returns Normalized resource.
     */
    private normalizeResource(resource: IMCPResource): IMCPResource {
        const uri = this.normalizeNonEmptyString(resource?.uri, "resource uri must be non-empty string")
        const name = this.normalizeNonEmptyString(resource?.name, "resource name must be non-empty string")
        const mimeType = this.normalizeNonEmptyString(
            resource?.mimeType,
            "resource mimeType must be non-empty string",
        )
        const description = this.normalizeOptionalString(resource?.description)

        return {
            uri,
            name,
            description,
            mimeType,
        }
    }

    /**
     * Normalizes required string property.
     *
     * @param value Raw value.
     * @param errorMessage Failure message.
     * @returns Trimmed non-empty string.
     */
    private normalizeNonEmptyString(value: unknown, errorMessage: string): string {
        const normalized = typeof value === "string" ? value.trim() : ""
        if (normalized.length === 0) {
            throw new Error(errorMessage)
        }

        return normalized
    }

    /**
     * Normalizes optional string value.
     *
     * @param value Raw value.
     * @returns Trimmed string or undefined.
     */
    private normalizeOptionalString(value: unknown): string | undefined {
        const normalized = typeof value === "string" ? value.trim() : ""
        if (normalized.length === 0) {
            return undefined
        }

        return normalized
    }

    /**
     * Normalizes and validates tool call parameters.
     *
     * @param params Tool call params.
     * @returns Parsed payload.
     */
    private normalizeToolCallParams(params: Record<string, unknown>): {
        readonly isValid: boolean
        readonly value: IMCPToolCallRequest
        readonly error: string
    } {
        const name = typeof params?.name === "string" ? params.name.trim() : ""
        if (name.length === 0) {
            return {
                isValid: false,
                value: {
                    name: "",
                    arguments: {},
                },
                error: "tool call must include string name",
            }
        }

        const toolArguments = params?.arguments
        if (isRecord(toolArguments) === false) {
            return {
                isValid: false,
                value: {
                    name,
                    arguments: {},
                },
                error: "tool call arguments must be object",
            }
        }

        return {
            isValid: true,
            value: {
                name,
                arguments: toolArguments,
            },
            error: "",
        }
    }

    /**
     * Normalizes and validates resource provider.
     *
     * @param provider Resource provider.
     * @returns Provider.
     */
    private normalizeResourceProvider(provider: IMCPResourceProvider): IMCPResourceProvider {
        if (typeof provider !== "function") {
            throw new Error("resource provider must be function")
        }

        return provider
    }

    /**
     * Проверяет минимальную структуру MCP request.
     *
     * @param request Request.
     * @returns True когда есть поле method как строка.
     */
    private isValidRequest(request: IMCPRequest): boolean {
        return request !== undefined && request !== null && typeof request === "object" && typeof request.method === "string"
    }

    /**
     * Serializes handler output as text content.
     *
     * @param output Handler output.
     * @returns Text content array.
     */
    private createTextContent(output: unknown): readonly IMCPTextContent[] {
        if (typeof output === "string") {
            return [{type: "text", text: output}]
        }

        return [{type: "text", text: JSON.stringify(output)}]
    }

    /**
     * Normalizes request identifier.
     *
     * @param id Correlation id.
     * @returns MCP identifier or null.
     */
    private normalizeRequestId(id: IMCPRequestId | undefined): IMCPRequestId {
        if (id === undefined) {
            return null
        }

        return id
    }

    /**
     * Reads error message from unknown error object.
     *
     * @param error Incoming error.
     * @returns Human-readable message.
     */
    private readErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }
        if (typeof error === "string") {
            return error
        }

        return "tool execution failed"
    }
}

/**
 * Checks whether value looks like MCP schema.
 *
 * @param schema Candidate schema.
 * @returns True when schema object.
 */
function isValidToolSchema(schema: IMCPJSONSchema | undefined): schema is IMCPJSONSchema {
    return (
        schema !== undefined &&
        isRecord(schema) &&
        (schema.type === undefined || typeof schema.type === "string") &&
        (schema.required === undefined || isStringArray(schema.required))
    )
}

/**
 * Checks that required section is array of strings.
 *
 * @param required Candidate required list.
 * @returns True when valid.
 */
function isStringArray(required: unknown): required is readonly string[] {
    if (Array.isArray(required) === false) {
        return false
    }

    for (const value of required) {
        if (typeof value !== "string" || value.length === 0) {
            return false
        }
    }

    return true
}

/**
 * Checks if value is dictionary-like record.
 *
 * @param value Candidate value.
 * @returns True when plain object map.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && Array.isArray(value) === false
}

/**
 * Basic JSON schema validation helper for MCP tool arguments.
 *
 * @param args Raw args.
 * @param schema Tool input schema.
 * @returns Validation result.
 */
export function validateInputAgainstSchema(
    args: Record<string, unknown>,
    schema: IMCPJSONSchema,
): {
    readonly isValid: boolean
    readonly errors: readonly string[]
} {
    const errors: string[] = []

    if (schema.type === undefined || schema.type === "object") {
        if (isRecord(args) === false) {
            return {
                isValid: false,
                errors: ["tool arguments must be object"],
            }
        }
    }

    const requiredErrors = collectMissingRequiredErrors(schema.required, args)
    for (const item of requiredErrors) {
        errors.push(item)
    }

    const propertyErrors = collectPropertyTypeErrors(schema.properties, args)
    for (const item of propertyErrors) {
        errors.push(item)
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}

/**
 * Collects required field errors for schema validation.
 *
 * @param required Required field list.
 * @param args Payload.
 * @returns Required field errors.
 */
function collectMissingRequiredErrors(
    required: IMCPJSONSchema["required"],
    args: Record<string, unknown>,
): string[] {
    if (Array.isArray(required) === false) {
        return []
    }

    const requiredErrors: string[] = []
    for (const field of required) {
        if (typeof field !== "string") {
            continue
        }
        if (hasOwnProperty(args, field) === false) {
            requiredErrors.push(`required field ${field} is missing`)
        }
    }

    return requiredErrors
}

/**
 * Collects type check errors for each declared property.
 *
 * @param properties Schema properties.
 * @param args Payload.
 * @returns Type errors.
 */
function collectPropertyTypeErrors(
    properties: IMCPJSONSchema["properties"],
    args: Record<string, unknown>,
): string[] {
    if (isRecord(properties) === false) {
        return []
    }

    const propertyErrors: string[] = []
    for (const key of Object.keys(properties)) {
        const propertySchema = properties[key]
        if (isValidToolSchema(propertySchema) === false) {
            continue
        }

        if (hasOwnProperty(args, key) === false) {
            continue
        }

        if (isExpectedType(propertySchema.type, args[key]) === false) {
            propertyErrors.push(`field ${key} must be ${propertySchema.type}`)
        }
    }

    return propertyErrors
}

/**
 * Checks property type according to JSON schema.
 *
 * @param expectedType Expected schema type.
 * @param value Actual value.
 * @returns True when type matches.
 */
function isExpectedType(expectedType: unknown, value: unknown): boolean {
    if (typeof expectedType !== "string") {
        return true
    }

    const validators: Record<
        string,
        (arg: unknown) => boolean
    > = {
        integer: (arg: unknown): boolean => typeof arg === "number" && Number.isInteger(arg),
        number: (arg: unknown): boolean => typeof arg === "number" && Number.isFinite(arg),
        boolean: (arg: unknown): boolean => typeof arg === "boolean",
        string: (arg: unknown): boolean => typeof arg === "string",
        array: (arg: unknown): boolean => Array.isArray(arg),
        object: (arg: unknown): boolean => arg !== null && typeof arg === "object" && Array.isArray(arg) === false,
    }

    const validator = validators[expectedType]
    if (validator === undefined) {
        return true
    }

    return validator(value)
}

/**
 * Checks object property ownership safely for records.
 *
 * @param target Object.
 * @param key Property key.
 * @returns True when key exists directly.
 */
function hasOwnProperty(target: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(target, key)
}
