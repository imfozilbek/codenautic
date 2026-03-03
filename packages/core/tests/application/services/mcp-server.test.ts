import {describe, expect, test} from "bun:test"

import {MCPServer} from "../../../src/application/services/mcp-server"
import {
    MCP_METHOD,
    type MCPMethod,
    type IMCPInitializeResponse,
    type IMCPResourcesListResponse,
    type IMCPTool,
    type IMCPToolCallResponse,
    type IMCPToolResult,
    type IMCPToolsListResponse,
} from "../../../src/application/dto/mcp"

describe("MCPServer", () => {
    test("returns initialize capabilities", async () => {
        const server = new MCPServer()

        const response = await server.handleRequest({
            id: "init-1",
            method: MCP_METHOD.INITIALIZE,
        })

        if (isInitializeResponse(response.result) === false) {
            throw new Error("expected initialize result")
        }

        expect(response.error).toBeUndefined()
        expect(response.result.protocolVersion).toBe("2025-01-01")
        expect(response.result.capabilities.tools.listChanged).toBe(false)
    })

    test("lists registered tools", async () => {
        const server = new MCPServer()
        const tool: IMCPTool = {
            name: "echo",
            description: "Echo args",
            inputSchema: {
                type: "object",
                properties: {
                    message: {type: "string"},
                },
                required: ["message"],
            },
        }
        server.registerTool(tool, () => "ok")

        const response = await server.handleRequest({
            id: "tools-list",
            method: MCP_METHOD.TOOLS_LIST,
        })

        if (isToolsListResponse(response.result) === false) {
            throw new Error("expected tools/list result")
        }

        expect(response.result.tools).toHaveLength(1)
        expect(response.result.tools[0]?.name).toBe("echo")
    })

    test("calls tool and validates result output", async () => {
        const server = new MCPServer()
        server.registerTool(
            {
                name: "echo",
                description: "Echo args",
                inputSchema: {
                    type: "object",
                    properties: {
                        message: {type: "string"},
                    },
                    required: ["message"],
                },
            },
            (args) => {
                return {message: args.message}
            },
        )

        const response = await server.handleRequest({
            id: "call",
            method: MCP_METHOD.TOOLS_CALL,
            params: {
                name: "echo",
                arguments: {
                    message: "hello",
                },
            },
        })

        if (isToolCallResponse(response.result) === false) {
            throw new Error("expected tool call result")
        }

        expect(response.error).toBeUndefined()
        expect(response.result.content[0]?.text).toBe('{"message":"hello"}')
    })

    test("returns list of resources", async () => {
        const server = new MCPServer()
        server.registerResource(
            {
                uri: "mcp://system/info",
                name: "system info",
                mimeType: "application/json",
                description: "system metadata",
            },
            () => ({
                version: "1.0.0",
            }),
        )

        const response = await server.handleRequest({
            id: "resources-list",
            method: MCP_METHOD.RESOURCES_LIST,
        })

        if (isResourcesListResponse(response.result) === false) {
            throw new Error("expected resources/list result")
        }

        expect(response.result.resources).toHaveLength(1)
        expect(response.result.resources[0]?.uri).toBe("mcp://system/info")
    })

    test("returns method not found for unknown method", async () => {
        const server = new MCPServer()

        const response = await server.handleRequest({
            id: "bad",
            method: "not-real" as MCPMethod,
        })

        expect(response.error).toBeDefined()
        expect(response.error?.code).toBe(-32601)
    })

    test("returns invalid params for malformed tool call", async () => {
        const server = new MCPServer()
        server.registerTool(
            {
                name: "echo",
                description: "Echo args",
                inputSchema: {
                    type: "object",
                    properties: {
                        message: {type: "string"},
                    },
                    required: ["message"],
                },
            },
            () => "ok",
        )

        const response = await server.handleRequest({
            id: "call-bad",
            method: MCP_METHOD.TOOLS_CALL,
            params: {
                name: 11,
            },
        })

        expect(response.error).toBeDefined()
        expect(response.error?.code).toBe(-32602)
    })
})

function isInitializeResponse(result: IMCPToolResult["result"]): result is IMCPInitializeResponse {
    if (result === undefined || result === null) {
        return false
    }

    return "protocolVersion" in result
}

function isToolsListResponse(result: IMCPToolResult["result"]): result is IMCPToolsListResponse {
    if (result === undefined || result === null) {
        return false
    }

    return "tools" in result && Array.isArray(result.tools)
}

function isToolCallResponse(result: IMCPToolResult["result"]): result is IMCPToolCallResponse {
    if (result === undefined || result === null) {
        return false
    }

    return "content" in result && Array.isArray(result.content)
}

function isResourcesListResponse(
    result: IMCPToolResult["result"],
): result is IMCPResourcesListResponse {
    if (result === undefined || result === null) {
        return false
    }

    return "resources" in result && Array.isArray(result.resources)
}
