import { describe, expect, it, vi } from "vitest"

import {
    buildGraphExportFileName,
    buildGraphSvg,
    resolveGraphPngCanvasSize,
    exportGraphAsSvg,
    exportGraphAsPng,
    exportGraphAsJson,
} from "@/components/graphs/graph-export"
import type { IGraphLayoutNode, IGraphEdge } from "@/components/graphs/xyflow-graph-layout"
import {
    GRAPH_EXPORT_BACKGROUND,
    GRAPH_EXPORT_EMPTY_BACKGROUND,
    GRAPH_EXPORT_EMPTY_TEXT,
    GRAPH_EXPORT_NODE_FILL,
    GRAPH_EXPORT_NODE_STROKE,
    GRAPH_EXPORT_EDGE_STROKE,
    GRAPH_EXPORT_TITLE_TEXT,
} from "@/lib/constants/graph-colors"

function createTestNode(overrides: Partial<IGraphLayoutNode> = {}): IGraphLayoutNode {
    return {
        id: "node-1",
        label: "TestNode",
        position: { x: 10, y: 20 },
        width: 120,
        height: 40,
        ...overrides,
    }
}

function createTestEdge(overrides: Partial<IGraphEdge> = {}): IGraphEdge {
    return {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        ...overrides,
    }
}

describe("buildGraphExportFileName", (): void => {
    it("when title has normal text, then returns kebab-case lowercase", (): void => {
        expect(buildGraphExportFileName("My Graph Title")).toBe("my-graph-title")
    })

    it("when title has special characters, then strips them", (): void => {
        expect(buildGraphExportFileName("Graph!@#$%Test")).toBe("graph-test")
    })

    it("when title is empty, then returns default name", (): void => {
        expect(buildGraphExportFileName("")).toBe("graph-export")
    })

    it("when title is only whitespace, then returns default name", (): void => {
        expect(buildGraphExportFileName("   ")).toBe("graph-export")
    })

    it("when title has leading/trailing special chars, then trims dashes", (): void => {
        expect(buildGraphExportFileName("---hello---")).toBe("hello")
    })

    it("when title has consecutive special characters, then collapses into single dash", (): void => {
        expect(buildGraphExportFileName("a!!!b")).toBe("a-b")
    })

    it("when title has only special characters, then returns default name", (): void => {
        expect(buildGraphExportFileName("!@#$%")).toBe("graph-export")
    })

    it("when title has numbers, then preserves them", (): void => {
        expect(buildGraphExportFileName("Graph 42 Test")).toBe("graph-42-test")
    })
})

describe("resolveGraphPngCanvasSize", (): void => {
    it("when dimensions are within limits, then returns as-is (floored)", (): void => {
        const result = resolveGraphPngCanvasSize(800, 600)
        expect(result.width).toBe(800)
        expect(result.height).toBe(600)
    })

    it("when width is 0, then throws error", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(0, 600)
        }).toThrow("Unable to resolve PNG export canvas size")
    })

    it("when height is 0, then throws error", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(800, 0)
        }).toThrow("Unable to resolve PNG export canvas size")
    })

    it("when width is negative, then throws error", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(-100, 600)
        }).toThrow("Unable to resolve PNG export canvas size")
    })

    it("when width is NaN, then throws error", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(NaN, 600)
        }).toThrow("Unable to resolve PNG export canvas size")
    })

    it("when width is Infinity, then throws error", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(Infinity, 600)
        }).toThrow("Unable to resolve PNG export canvas size")
    })

    it("when dimensions exceed max single dimension, then scales down", (): void => {
        const result = resolveGraphPngCanvasSize(8192, 800)
        expect(result.width).toBeLessThanOrEqual(4096)
        expect(result.height).toBeLessThanOrEqual(4096)
        expect(result.width).toBeGreaterThan(0)
        expect(result.height).toBeGreaterThan(0)
    })

    it("when total pixel count exceeds limit, then scales down", (): void => {
        const result = resolveGraphPngCanvasSize(4096, 4096)
        expect(result.width * result.height).toBeLessThanOrEqual(16_777_216)
    })

    it("when dimensions are fractional, then floors them", (): void => {
        const result = resolveGraphPngCanvasSize(100.9, 200.7)
        expect(result.width).toBe(100)
        expect(result.height).toBe(200)
    })

    it("when dimensions are exactly at max, then returns them unchanged", (): void => {
        const result = resolveGraphPngCanvasSize(4096, 4096)
        expect(result.width).toBeGreaterThan(0)
        expect(result.height).toBeGreaterThan(0)
    })

    it("when one dimension is very small, then preserves minimum of 1", (): void => {
        const result = resolveGraphPngCanvasSize(1, 1)
        expect(result.width).toBeGreaterThanOrEqual(1)
        expect(result.height).toBeGreaterThanOrEqual(1)
    })
})

describe("buildGraphSvg", (): void => {
    it("when nodes is empty, then returns empty canvas SVG", (): void => {
        const svg = buildGraphSvg("Test Graph", [], [])
        expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>')
        expect(svg).toContain(`fill="${GRAPH_EXPORT_EMPTY_BACKGROUND}"`)
        expect(svg).toContain(`fill="${GRAPH_EXPORT_EMPTY_TEXT}"`)
        expect(svg).toContain("No graph data")
        expect(svg).toContain('width="640"')
        expect(svg).toContain('height="320"')
    })

    it("when nodes are provided, then includes background, title and nodes", (): void => {
        const nodes: ReadonlyArray<IGraphLayoutNode> = [
            createTestNode({ id: "n1", label: "Alpha" }),
            createTestNode({ id: "n2", label: "Beta", position: { x: 200, y: 100 } }),
        ]
        const svg = buildGraphSvg("My Graph", nodes, [])
        expect(svg).toContain(`fill="${GRAPH_EXPORT_BACKGROUND}"`)
        expect(svg).toContain(`fill="${GRAPH_EXPORT_TITLE_TEXT}"`)
        expect(svg).toContain("My Graph")
        expect(svg).toContain("Alpha")
        expect(svg).toContain("Beta")
        expect(svg).toContain(`fill="${GRAPH_EXPORT_NODE_FILL}"`)
        expect(svg).toContain(`stroke="${GRAPH_EXPORT_NODE_STROKE}"`)
    })

    it("when edges connect valid nodes, then renders lines", (): void => {
        const nodeA = createTestNode({ id: "n1", label: "A", position: { x: 0, y: 0 } })
        const nodeB = createTestNode({ id: "n2", label: "B", position: { x: 200, y: 100 } })
        const edge = createTestEdge({ source: "n1", target: "n2" })
        const svg = buildGraphSvg("Edge Graph", [nodeA, nodeB], [edge])
        expect(svg).toContain(`stroke="${GRAPH_EXPORT_EDGE_STROKE}"`)
        expect(svg).toContain('stroke-width="2"')
    })

    it("when edge has label, then renders edge label text", (): void => {
        const nodeA = createTestNode({ id: "n1", label: "A", position: { x: 0, y: 0 } })
        const nodeB = createTestNode({ id: "n2", label: "B", position: { x: 200, y: 100 } })
        const edge = createTestEdge({ source: "n1", target: "n2", label: "depends on" })
        const svg = buildGraphSvg("Labeled Edge", [nodeA, nodeB], [edge])
        expect(svg).toContain("depends on")
    })

    it("when edge references non-existent node, then produces empty edge segment", (): void => {
        const node = createTestNode({ id: "n1", label: "Only" })
        const edge = createTestEdge({ source: "n1", target: "n-missing" })
        const svg = buildGraphSvg("Missing Target", [node], [edge])
        expect(svg).not.toContain(`stroke="${GRAPH_EXPORT_EDGE_STROKE}"`)
    })

    it("when title contains HTML-like characters, then escapes them", (): void => {
        const node = createTestNode({ id: "n1", label: "Normal" })
        const svg = buildGraphSvg("<script>alert</script>", [node], [])
        expect(svg).toContain("&lt;script&gt;alert&lt;/script&gt;")
        expect(svg).not.toContain("<script>")
    })

    it("when node label contains special characters, then escapes them", (): void => {
        const node = createTestNode({ id: "n1", label: 'A & B "test"' })
        const svg = buildGraphSvg("Escape Test", [node], [])
        expect(svg).toContain("A &amp; B &quot;test&quot;")
    })
})

describe("exportGraphAsSvg", (): void => {
    it("when called with valid data, then triggers download with SVG blob", (): void => {
        const clickSpy = vi.fn()
        const appendSpy = vi.fn()
        const removeSpy = vi.fn()
        const revokeObjectURLSpy = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation((): void => {})
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url")
        const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
            set href(value: string) {
                /* noop */
            },
            set download(value: string) {
                /* noop */
            },
            click: clickSpy,
            remove: removeSpy,
        } as unknown as HTMLAnchorElement)
        vi.spyOn(document.body, "append").mockImplementation(appendSpy)

        const node = createTestNode({ id: "n1", label: "Export" })
        exportGraphAsSvg("Test Export", [node], [])

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(clickSpy).toHaveBeenCalledTimes(1)
        expect(removeSpy).toHaveBeenCalledTimes(1)
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)

        createObjectURLSpy.mockRestore()
        createElementSpy.mockRestore()
        revokeObjectURLSpy.mockRestore()
    })
})

describe("exportGraphAsJson", (): void => {
    it("when called, then triggers download with JSON blob", (): void => {
        const clickSpy = vi.fn()
        const removeSpy = vi.fn()
        const revokeObjectURLSpy = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation((): void => {})
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:json-url")
        const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
            set href(_value: string) {
                /* noop */
            },
            set download(_value: string) {
                /* noop */
            },
            click: clickSpy,
            remove: removeSpy,
        } as unknown as HTMLAnchorElement)
        vi.spyOn(document.body, "append").mockImplementation((): void => {})

        exportGraphAsJson("JSON Export", { nodes: 5, edges: 3 })

        expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
        expect(clickSpy).toHaveBeenCalledTimes(1)

        createObjectURLSpy.mockRestore()
        createElementSpy.mockRestore()
        revokeObjectURLSpy.mockRestore()
    })
})
