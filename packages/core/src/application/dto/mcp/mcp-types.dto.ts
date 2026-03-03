/**
 * JSON schema shape accepted by MCP tool contracts.
 */
export interface IMCPJSONSchema {
    /**
     * Schema type.
     */
    readonly type?: string

    /**
     * Object properties definitions.
     */
    readonly properties?: Record<string, IMCPJSONSchema>

    /**
     * Required property names.
     */
    readonly required?: readonly string[]
}

/**
 * MCP transport request identifier.
 */
export type IMCPRequestId = string | number | null

/**
 * Contract for MCP tool metadata.
 */
export interface IMCPTool {
    /**
     * Machine-readable tool name.
     */
    readonly name: string

    /**
     * Human description of tool behavior.
     */
    readonly description: string

    /**
     * JSON schema for input payload.
     */
    readonly inputSchema: IMCPJSONSchema

    /**
     * Optional JSON schema for output payload.
     */
    readonly outputSchema?: IMCPJSONSchema
}

/**
 * Contract for MCP resource metadata.
 */
export interface IMCPResource {
    /**
     * Resource URI.
     */
    readonly uri: string

    /**
     * Human-readable resource name.
     */
    readonly name: string

    /**
     * Optional resource description.
     */
    readonly description?: string

    /**
     * MIME type of resource content.
     */
    readonly mimeType: string
}

/**
 * MCP method names handled by built-in server implementation.
 */
export const MCP_METHOD = {
    INITIALIZE: "initialize",
    TOOLS_LIST: "tools/list",
    TOOLS_CALL: "tools/call",
    RESOURCES_LIST: "resources/list",
} as const

/**
 * MCP method enum type.
 */
export type MCPMethod = (typeof MCP_METHOD)[keyof typeof MCP_METHOD]

/**
 * Generic tool execution payload.
 */
export interface IMCPToolCallRequest {
    /**
     * Tool name to execute.
     */
    readonly name: string

    /**
     * Raw tool arguments.
     */
    readonly arguments: Record<string, unknown>
}

/**
 * Tools/list payload.
 */
export interface IMCPToolsListResponse {
    /**
     * Registered MCP tools.
     */
    readonly tools: readonly IMCPTool[]
}

/**
 * Resources/list payload.
 */
export interface IMCPResourcesListResponse {
    /**
     * Registered MCP resources.
     */
    readonly resources: readonly IMCPResource[]
}

/**
 * Server initialize payload.
 */
export interface IMCPInitializeResponse {
    /**
     * Protocol version.
     */
    readonly protocolVersion: "2025-01-01"

    /**
     * Server capability block.
     */
    readonly capabilities: {
        readonly tools: {
            readonly listChanged: boolean
        }
        readonly resources: {
            readonly subscribe: boolean
            readonly listChanged: boolean
        }
    }
}

/**
 * MCP response error payload.
 */
export interface IMCPResponseError {
    /**
     * Error code.
     */
    readonly code: number

    /**
     * Error message.
     */
    readonly message: string

    /**
     * Error details.
     */
    readonly data?: unknown
}

/**
 * JSON-RPC text content.
 */
export interface IMCPTextContent {
    /**
     * Fixed content type.
     */
    readonly type: "text"

    /**
     * Text content.
     */
    readonly text: string
}

/**
 * Tool call result payload.
 */
export interface IMCPToolCallResponse {
    /**
     * Tool output content.
     */
    readonly content: readonly IMCPTextContent[]

    /**
     * Error marker for tool-level failures.
     */
    readonly isError?: boolean
}

/**
 * JSON-RPC request envelope.
 */
export interface IMCPRequest {
    /**
     * JSON-RPC version.
     */
    readonly jsonrpc?: "2.0"

    /**
     * Correlation identifier.
     */
    readonly id?: IMCPRequestId

    /**
     * MCP request method.
     */
    readonly method: MCPMethod

    /**
     * Method params.
     */
    readonly params?: Record<string, unknown>
}

/**
 * JSON-RPC result payload (tool call / discovery / resources / initialize).
 */
export interface IMCPToolResult {
    /**
     * JSON-RPC version.
     */
    readonly jsonrpc: "2.0"

    /**
     * Matching correlation identifier.
     */
    readonly id: IMCPRequestId

    /**
     * Positive response payload.
     */
    readonly result?: IMCPToolsListResponse | IMCPResourcesListResponse | IMCPInitializeResponse | IMCPToolCallResponse

    /**
     * Error payload.
     */
    readonly error?: IMCPResponseError
}

/**
 * MCP request method union.
 */
export type IMCPRequestMethod = (typeof MCP_METHOD)[keyof typeof MCP_METHOD]

/**
 * Handler for MCP tool execution.
 */
export type IMCPToolHandler = (args: Record<string, unknown>) => unknown

/**
 * Provider callback for MCP resources.
 */
export type IMCPResourceProvider = () => unknown
