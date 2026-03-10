import { describe, expect, it, vi } from "vitest"

import {
    buildGraphExportFileName,
    resolveGraphPngCanvasSize,
    buildGraphSvg,
    exportGraphAsJson,
    exportGraphAsSvg,
    exportGraphAsPng,
} from "@/components/graphs/graph-export"
import type { IGraphEdge, IGraphLayoutNode } from "@/components/graphs/xyflow-graph-layout"

describe("graph-export", (): void => {
    it("нормализует название файла под export", (): void => {
        expect(buildGraphExportFileName("File Dependency Graph")).toBe("file-dependency-graph")
        expect(buildGraphExportFileName("   @@@   ")).toBe("graph-export")
    })

    it("строит fallback SVG при пустом графе", (): void => {
        const svgPayload = buildGraphSvg("Empty Graph", [], [])

        expect(svgPayload).toContain("No graph data")
        expect(svgPayload).toContain("<svg")
        expect(svgPayload).toContain("</svg>")
    })

    it("строит SVG-контур с безопасным title, nodes и edges", (): void => {
        const nodes: ReadonlyArray<IGraphLayoutNode> = [
            {
                id: "file-a",
                label: "<src/index.ts>",
                width: 200,
                height: 60,
                position: { x: 0, y: 0 },
            },
            {
                id: "file-b",
                label: "src/utils.ts",
                width: 200,
                height: 60,
                position: { x: 320, y: 80 },
            },
        ]
        const edges = [
            {
                source: "file-a",
                target: "file-b",
                label: "runtime",
            },
        ] as const

        const svgPayload = buildGraphSvg("Graph & <details>", nodes, edges)

        expect(svgPayload).toContain("<svg")
        expect(svgPayload).toContain("&lt;details&gt;")
        expect(svgPayload).toContain("runtime")
        expect(svgPayload).toContain("src/index.ts")
    })

    it("ограничивает png canvas по размеру стороны и общему числу пикселей", (): void => {
        expect(resolveGraphPngCanvasSize(1280, 720)).toEqual({
            height: 720,
            width: 1280,
        })

        const resized = resolveGraphPngCanvasSize(12000, 9000)
        expect(resized.width).toBeLessThanOrEqual(4096)
        expect(resized.height).toBeLessThanOrEqual(4096)
        expect(resized.width * resized.height).toBeLessThanOrEqual(16_777_216)
    })

    it("ошибается на невалидных размерах png canvas", (): void => {
        expect((): void => {
            resolveGraphPngCanvasSize(0, 800)
        }).toThrowError("Unable to resolve PNG export canvas size")
    })

    it("скачивает SVG как blob при вызове экспорта", (): void => {
        const createObjectUrl = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:graph-export")
        const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

        try {
            exportGraphAsSvg("Graph file", [], [])

            expect(createObjectUrl).toHaveBeenCalledTimes(1)
            expect(clickSpy).toHaveBeenCalledTimes(1)
            expect(revokeObjectUrl).toHaveBeenCalledTimes(1)
        } finally {
            createObjectUrl.mockRestore()
            revokeObjectUrl.mockRestore()
            clickSpy.mockRestore()
        }
    })

    it("скачивает JSON-файл для aggregated fallback данных", (): void => {
        const createObjectUrl = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:graph-export-json")
        const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

        try {
            exportGraphAsJson("Huge Graph fallback", {
                sampledPaths: [{ source: "a", target: "b" }],
                topHubs: [{ id: "a", degree: 8 }],
            })

            expect(createObjectUrl).toHaveBeenCalledTimes(1)
            expect(clickSpy).toHaveBeenCalledTimes(1)
            expect(revokeObjectUrl).toHaveBeenCalledTimes(1)
        } finally {
            createObjectUrl.mockRestore()
            revokeObjectUrl.mockRestore()
            clickSpy.mockRestore()
        }
    })

    describe("buildGraphExportFileName edge cases", (): void => {
        it("when title is empty string, then returns fallback name", (): void => {
            expect(buildGraphExportFileName("")).toBe("graph-export")
        })

        it("when title has only whitespace, then returns fallback name", (): void => {
            expect(buildGraphExportFileName("   ")).toBe("graph-export")
        })

        it("when title has leading and trailing dashes after normalization, then trims them", (): void => {
            expect(buildGraphExportFileName("---hello---")).toBe("hello")
        })

        it("when title has mixed casing, then lowercases all", (): void => {
            expect(buildGraphExportFileName("My AWESOME Graph")).toBe("my-awesome-graph")
        })
    })

    describe("resolveGraphPngCanvasSize edge cases", (): void => {
        it("when width is negative, then throws error", (): void => {
            expect((): void => {
                resolveGraphPngCanvasSize(-100, 800)
            }).toThrowError("Unable to resolve PNG export canvas size")
        })

        it("when height is negative, then throws error", (): void => {
            expect((): void => {
                resolveGraphPngCanvasSize(800, -100)
            }).toThrowError("Unable to resolve PNG export canvas size")
        })

        it("when width is NaN, then throws error", (): void => {
            expect((): void => {
                resolveGraphPngCanvasSize(NaN, 800)
            }).toThrowError("Unable to resolve PNG export canvas size")
        })

        it("when height is Infinity, then throws error", (): void => {
            expect((): void => {
                resolveGraphPngCanvasSize(800, Infinity)
            }).toThrowError("Unable to resolve PNG export canvas size")
        })

        it("when both dimensions are within limits, then returns them floored", (): void => {
            const result = resolveGraphPngCanvasSize(100.7, 200.3)

            expect(result).toEqual({ width: 100, height: 200 })
        })

        it("when total pixels exceed limit but dimensions are within max, then scales down", (): void => {
            const result = resolveGraphPngCanvasSize(4096, 4096)

            expect(result.width * result.height).toBeLessThanOrEqual(16_777_216)
            expect(result.width).toBeGreaterThan(0)
            expect(result.height).toBeGreaterThan(0)
        })

        it("when one dimension exceeds max but other is small, then scales proportionally", (): void => {
            const result = resolveGraphPngCanvasSize(8000, 100)

            expect(result.width).toBeLessThanOrEqual(4096)
            expect(result.height).toBeGreaterThan(0)
        })
    })

    describe("buildGraphSvg edge cases", (): void => {
        it("when edge references nonexistent source node, then skips that edge", (): void => {
            const nodes: ReadonlyArray<IGraphLayoutNode> = [
                {
                    id: "node-a",
                    label: "Node A",
                    width: 200,
                    height: 60,
                    position: { x: 0, y: 0 },
                },
            ]
            const edges: ReadonlyArray<IGraphEdge> = [{ source: "nonexistent", target: "node-a" }]

            const svgPayload = buildGraphSvg("Test", nodes, edges)

            expect(svgPayload).toContain("<svg")
            expect(svgPayload).toContain("Node A")
            expect(svgPayload).not.toContain("<line")
        })

        it("when edge references nonexistent target node, then skips that edge", (): void => {
            const nodes: ReadonlyArray<IGraphLayoutNode> = [
                {
                    id: "node-a",
                    label: "Node A",
                    width: 200,
                    height: 60,
                    position: { x: 0, y: 0 },
                },
            ]
            const edges: ReadonlyArray<IGraphEdge> = [{ source: "node-a", target: "nonexistent" }]

            const svgPayload = buildGraphSvg("Test", nodes, edges)

            expect(svgPayload).toContain("<svg")
            expect(svgPayload).not.toContain("<line")
        })

        it("when edge has no label, then omits edge label text element", (): void => {
            const nodes: ReadonlyArray<IGraphLayoutNode> = [
                {
                    id: "a",
                    label: "A",
                    width: 200,
                    height: 60,
                    position: { x: 0, y: 0 },
                },
                {
                    id: "b",
                    label: "B",
                    width: 200,
                    height: 60,
                    position: { x: 300, y: 0 },
                },
            ]
            const edges: ReadonlyArray<IGraphEdge> = [{ source: "a", target: "b" }]

            const svgPayload = buildGraphSvg("Test", nodes, edges)

            expect(svgPayload).toContain("<line")
            const lineIndex = svgPayload.indexOf("<line")
            const nextTextIndex = svgPayload.indexOf('text-anchor="middle"', lineIndex)
            const nextGIndex = svgPayload.indexOf("<g>", lineIndex)
            if (nextTextIndex !== -1 && nextGIndex !== -1) {
                expect(nextGIndex).toBeLessThan(nextTextIndex)
            }
        })

        it("when title contains single quotes, then escapes them in SVG", (): void => {
            const nodes: ReadonlyArray<IGraphLayoutNode> = [
                {
                    id: "a",
                    label: "A",
                    width: 200,
                    height: 60,
                    position: { x: 0, y: 0 },
                },
            ]

            const svgPayload = buildGraphSvg('Graph\'s "title"', nodes, [])

            expect(svgPayload).toContain("&#39;")
            expect(svgPayload).toContain("&quot;")
        })
    })

    describe("exportGraphAsPng", (): void => {
        it("when image loads successfully, then downloads PNG blob", async (): Promise<void> => {
            const createObjectUrl = vi
                .spyOn(URL, "createObjectURL")
                .mockReturnValue("blob:test-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
            const clickSpy = vi
                .spyOn(HTMLAnchorElement.prototype, "click")
                .mockImplementation(() => {})

            const mockContext = {
                drawImage: vi.fn(),
            }
            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockContext),
                toBlob: vi.fn((callback: (blob: Blob | null) => void): void => {
                    callback(new Blob(["png-data"], { type: "image/png" }))
                }),
            }
            const originalCreateElement = Document.prototype.createElement.bind(document)
            const createElementSpy = vi.spyOn(document, "createElement")
            createElementSpy.mockImplementation((tag: string): HTMLElement => {
                if (tag === "canvas") {
                    return mockCanvas as unknown as HTMLCanvasElement
                }
                return originalCreateElement(tag)
            })

            const imagePrototypeDescriptor = Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "src",
            )
            Object.defineProperty(HTMLImageElement.prototype, "src", {
                set(value: string) {
                    if (imagePrototypeDescriptor?.set !== undefined) {
                        imagePrototypeDescriptor.set.call(this, value)
                    }
                    Object.defineProperty(this, "width", { value: 640, writable: true })
                    Object.defineProperty(this, "height", { value: 320, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await exportGraphAsPng("Test Graph", [], [])

                expect(clickSpy).toHaveBeenCalledTimes(1)
                expect(revokeObjectUrl).toHaveBeenCalled()
            } finally {
                if (imagePrototypeDescriptor !== undefined) {
                    Object.defineProperty(
                        HTMLImageElement.prototype,
                        "src",
                        imagePrototypeDescriptor,
                    )
                }
                createObjectUrl.mockRestore()
                revokeObjectUrl.mockRestore()
                clickSpy.mockRestore()
                createElementSpy.mockRestore()
            }
        })

        it("when image fails to load, then rejects and still revokes URL", async (): Promise<void> => {
            const createObjectUrl = vi
                .spyOn(URL, "createObjectURL")
                .mockReturnValue("blob:test-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

            const imagePrototypeDescriptor = Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "src",
            )
            Object.defineProperty(HTMLImageElement.prototype, "src", {
                set(value: string) {
                    if (imagePrototypeDescriptor?.set !== undefined) {
                        imagePrototypeDescriptor.set.call(this, value)
                    }
                    setTimeout((): void => {
                        if (typeof this.onerror === "function") {
                            this.onerror(new Event("error"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await expect(exportGraphAsPng("Fail", [], [])).rejects.toThrowError(
                    "Unable to load generated SVG image",
                )
                expect(revokeObjectUrl).toHaveBeenCalledWith("blob:test-svg")
            } finally {
                if (imagePrototypeDescriptor !== undefined) {
                    Object.defineProperty(
                        HTMLImageElement.prototype,
                        "src",
                        imagePrototypeDescriptor,
                    )
                }
                createObjectUrl.mockRestore()
                revokeObjectUrl.mockRestore()
            }
        })

        it("when canvas context is null, then throws error", async (): Promise<void> => {
            const createObjectUrl = vi
                .spyOn(URL, "createObjectURL")
                .mockReturnValue("blob:test-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(null),
                toBlob: vi.fn(),
            }
            const createElementSpy = vi.spyOn(document, "createElement")
            const originalCreateElement = document.createElement.bind(document)
            createElementSpy.mockImplementation((tag: string): HTMLElement => {
                if (tag === "canvas") {
                    return mockCanvas as unknown as HTMLCanvasElement
                }
                return originalCreateElement(tag)
            })

            const imagePrototypeDescriptor = Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "src",
            )
            Object.defineProperty(HTMLImageElement.prototype, "src", {
                set(value: string) {
                    if (imagePrototypeDescriptor?.set !== undefined) {
                        imagePrototypeDescriptor.set.call(this, value)
                    }
                    Object.defineProperty(this, "width", { value: 640, writable: true })
                    Object.defineProperty(this, "height", { value: 320, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await expect(exportGraphAsPng("NoCtx", [], [])).rejects.toThrowError(
                    "Unable to get 2d context",
                )
                expect(revokeObjectUrl).toHaveBeenCalled()
            } finally {
                if (imagePrototypeDescriptor !== undefined) {
                    Object.defineProperty(
                        HTMLImageElement.prototype,
                        "src",
                        imagePrototypeDescriptor,
                    )
                }
                createObjectUrl.mockRestore()
                revokeObjectUrl.mockRestore()
                createElementSpy.mockRestore()
            }
        })

        it("when canvas toBlob returns null, then rejects with conversion error", async (): Promise<void> => {
            const createObjectUrl = vi
                .spyOn(URL, "createObjectURL")
                .mockReturnValue("blob:test-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue({
                    drawImage: vi.fn(),
                }),
                toBlob: vi.fn((callback: (blob: Blob | null) => void): void => {
                    callback(null)
                }),
            }
            const createElementSpy = vi.spyOn(document, "createElement")
            const originalCreateElement = document.createElement.bind(document)
            createElementSpy.mockImplementation((tag: string): HTMLElement => {
                if (tag === "canvas") {
                    return mockCanvas as unknown as HTMLCanvasElement
                }
                return originalCreateElement(tag)
            })

            const imagePrototypeDescriptor = Object.getOwnPropertyDescriptor(
                HTMLImageElement.prototype,
                "src",
            )
            Object.defineProperty(HTMLImageElement.prototype, "src", {
                set(value: string) {
                    if (imagePrototypeDescriptor?.set !== undefined) {
                        imagePrototypeDescriptor.set.call(this, value)
                    }
                    Object.defineProperty(this, "width", { value: 640, writable: true })
                    Object.defineProperty(this, "height", { value: 320, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await expect(exportGraphAsPng("NullBlob", [], [])).rejects.toThrowError(
                    "Unable to convert canvas to PNG",
                )
                expect(revokeObjectUrl).toHaveBeenCalled()
            } finally {
                if (imagePrototypeDescriptor !== undefined) {
                    Object.defineProperty(
                        HTMLImageElement.prototype,
                        "src",
                        imagePrototypeDescriptor,
                    )
                }
                createObjectUrl.mockRestore()
                revokeObjectUrl.mockRestore()
                createElementSpy.mockRestore()
            }
        })
    })
})
