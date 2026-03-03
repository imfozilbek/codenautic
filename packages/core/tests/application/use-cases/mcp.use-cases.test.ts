import {describe, expect, test} from "bun:test"

import {MCPServer} from "../../../src/application/services/mcp-server"
import {MCP_METHOD, type IMCPTool} from "../../../src/application/dto/mcp"
import {
    DiscoverMCPToolsUseCase,
    type IDiscoverMCPToolsInput,
} from "../../../src/application/use-cases/discover-mcp-tools.use-case"
import {
    RegisterMCPToolUseCase,
    type IRegisterMCPToolInput,
} from "../../../src/application/use-cases/register-mcp-tool.use-case"
import {
    ValidateMCPToolInputUseCase,
    type IValidateMCPToolInputInput,
} from "../../../src/application/use-cases/validate-mcp-tool-input.use-case"
import {ValidationError} from "../../../src/domain/errors/validation.error"

describe("MCP use cases", () => {
    test("registers MCP tool through use case", async () => {
        const server = new MCPServer()
        const useCase = new RegisterMCPToolUseCase()
        const input: IRegisterMCPToolInput = {
            server,
            tool: {
                name: "find-issues",
                description: "Find issues for repo",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
                outputSchema: {
                    type: "string",
                },
            },
            handler: () => "ok",
        }
        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.registered).toBe(true)

        const toolsResponse = await server.handleRequest({
            id: "tools-list",
            method: MCP_METHOD.TOOLS_LIST,
        })
        if (toolsResponse.result === undefined || "tools" in toolsResponse.result === false) {
            throw new Error("expected tool list result")
        }
        expect(toolsResponse.result.tools).toHaveLength(1)
    })

    test("discovers tools through use case", async () => {
        const server = new MCPServer()
        server.registerTool(
            {
                name: "echo",
                description: "Echo args",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            () => "ok",
        )
        const useCase = new DiscoverMCPToolsUseCase()
        const input: IDiscoverMCPToolsInput = {
            server,
        }
        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        const output = result.value
        expect(output.tools).toHaveLength(1)
        expect(output.tools[0]?.name).toBe("echo")
    })

    test("fails discover when server missing", async () => {
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({} as IDiscoverMCPToolsInput)

        if (result.isOk) {
            throw new Error("expected failure")
        }

        expect(result.error).toBeInstanceOf(ValidationError)
    })

    test("validates tool args with schema", async () => {
        const tool: IMCPTool = {
            name: "sum",
            description: "Sum numbers",
            inputSchema: {
                type: "object",
                properties: {
                    a: {type: "number"},
                    b: {type: "number"},
                },
                required: ["a", "b"],
            },
        }
        const useCase = new ValidateMCPToolInputUseCase()
        const input: IValidateMCPToolInputInput = {
            tool,
            arguments: {
                a: 1,
                b: 2,
            },
        }
        const result = await useCase.execute(input)

        expect(result.isOk).toBe(true)
        expect(result.value.valid).toBe(true)
        expect(result.value.errors).toHaveLength(0)
    })

    test("returns validation errors for missing required args", async () => {
        const tool: IMCPTool = {
            name: "sum",
            description: "Sum numbers",
            inputSchema: {
                type: "object",
                properties: {
                    a: {type: "number"},
                    b: {type: "number"},
                },
                required: ["a", "b"],
            },
        }
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({
            tool,
            arguments: {
                a: 1,
            },
        })

        expect(result.isOk).toBe(true)
        expect(result.value.valid).toBe(false)
        expect(result.value.errors).toHaveLength(1)
        expect(result.value.errors[0]).toBe("required field b is missing")
    })
})
