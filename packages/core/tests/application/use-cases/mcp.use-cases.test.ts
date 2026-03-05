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
import type {IMcpDefaults} from "../../../src/application/dto/config/system-defaults.dto"

const MCP_DEFAULTS: IMcpDefaults = {
    protocolVersion: "2025-01-01",
}

describe("MCP use cases", () => {
    test("registers MCP tool through use case", async () => {
        const server = new MCPServer(MCP_DEFAULTS)
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
        const server = new MCPServer(MCP_DEFAULTS)
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

    test("fails discover when server returns error response", async () => {
        const server = {
            handleRequest: () => {
                return Promise.resolve({
                    id: "tools-list",
                    error: {
                        message: "registry unavailable",
                    },
                })
            },
        } as unknown as MCPServer
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({server})

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("registry unavailable")
        }
    })

    test("fails discover when server error has no message", async () => {
        const server = {
            handleRequest: () => {
                return Promise.resolve({
                    id: "tools-list",
                    error: {},
                })
            },
        } as unknown as MCPServer
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({server})

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool discovery failed")
        }
    })

    test("fails discover when server returns unexpected format", async () => {
        const server = {
            handleRequest: () => {
                return Promise.resolve({
                    id: "tools-list",
                    result: {
                        tools: "invalid",
                    },
                })
            },
        } as unknown as MCPServer
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({server})

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("unexpected tools/list format")
        }
    })

    test("fails discover when server throws", async () => {
        const server = {
            handleRequest: () => {
                return Promise.reject(new Error("server offline"))
            },
        } as unknown as MCPServer
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({server})

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server offline")
        }
    })

    test("fails discover when server throws non-error", async () => {
        const server = {
            handleRequest: () => {
                return Promise.reject(new Error("registry down"))
            },
        } as unknown as MCPServer
        const useCase = new DiscoverMCPToolsUseCase()
        const result = await useCase.execute({server})

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("registry down")
        }
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

    test("fails register when input is malformed", async () => {
        const server = new MCPServer(MCP_DEFAULTS)
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server,
            tool: {
                name: "broken",
                description: "Missing handler",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        } as unknown as IRegisterMCPToolInput)

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when input is not an object", async () => {
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute(null as unknown as IRegisterMCPToolInput)

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when server is invalid", async () => {
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server: {} as MCPServer,
            tool: {
                name: "tool",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when server is null", async () => {
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server: null as unknown as MCPServer,
            tool: {
                name: "tool",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when server is not an object", async () => {
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server: 42 as unknown as MCPServer,
            tool: {
                name: "tool",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when tool is invalid", async () => {
        const server = new MCPServer(MCP_DEFAULTS)
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server,
            tool: null as unknown as IMCPTool,
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("server, tool and handler are required")
        }
    })

    test("fails register when server throws", async () => {
        const server = {
            registerTool: () => {
                throw new Error("registry locked")
            },
        } as unknown as MCPServer
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server,
            tool: {
                name: "tool",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("registry locked")
        }
    })

    test("fails register when server throws non-error", async () => {
        const server = {
            registerTool: () => {
                throw new Error("registry unavailable")
            },
        } as unknown as MCPServer
        const useCase = new RegisterMCPToolUseCase()
        const result = await useCase.execute({
            server,
            tool: {
                name: "tool",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            handler: () => "ok",
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("registry unavailable")
        }
    })

    test("fails validation when input payload is invalid", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({} as IValidateMCPToolInputInput)

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })

    test("fails validation when input is not an object", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute(null as unknown as IValidateMCPToolInputInput)

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })

    test("fails validation when tool shape is invalid", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({
            tool: {
                name: "",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            } as IMCPTool,
            arguments: {},
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })

    test("fails validation when tool description is empty", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({
            tool: {
                name: "tool",
                description: "  ",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            } as IMCPTool,
            arguments: {},
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })

    test("fails validation when tool schema is missing", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({
            tool: {
                name: "tool",
                description: "desc",
            } as IMCPTool,
            arguments: {},
        })

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })

    test("fails validation when arguments are missing", async () => {
        const useCase = new ValidateMCPToolInputUseCase()
        const result = await useCase.execute({
            tool: {
                name: "valid",
                description: "desc",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        } as IValidateMCPToolInputInput)

        expect(result.isFail).toBe(true)
        if (result.isFail) {
            expect(result.error.fields[0]?.message).toContain("tool and arguments are required")
        }
    })
})
