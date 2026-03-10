import { describe, expect, it, vi } from "vitest"

import {
    buildKnowledgeMapExportFileName,
    buildKnowledgeMapExportSvg,
    exportKnowledgeMapAsSvg,
    exportKnowledgeMapAsPng,
    type IKnowledgeMapExportModel,
} from "@/components/graphs/knowledge-map-export"

const TEST_MODEL: IKnowledgeMapExportModel = {
    metadata: {
        generatedAt: "2026-03-05T10:00:00.000Z",
        metricLabel: "Complexity",
        repositoryId: "platform-team/api-gateway",
        repositoryLabel: "platform-team/api-gateway",
        totalContributors: 4,
        totalFiles: 16,
    },
    owners: [
        {
            color: "#0284c7",
            fileCount: 6,
            ownerName: "Alice Rivera",
        },
        {
            color: "#e879f9",
            fileCount: 4,
            ownerName: "Max H.",
        },
    ],
    districts: [
        {
            busFactor: 1,
            districtLabel: "src/api",
            riskLabel: "Critical",
        },
    ],
    silos: [
        {
            contributorCount: 1,
            fileCount: 5,
            riskScore: 84,
            siloLabel: "src/api",
        },
    ],
}

describe("knowledge-map-export", (): void => {
    it("нормализует file name для knowledge map snapshot", (): void => {
        expect(buildKnowledgeMapExportFileName("Platform Team / API Gateway")).toBe(
            "platform-team-api-gateway-knowledge-map",
        )
    })

    it("строит SVG со встроенными legend и metadata", (): void => {
        const svgPayload = buildKnowledgeMapExportSvg(TEST_MODEL)

        expect(svgPayload).toContain("<svg")
        expect(svgPayload).toContain("Knowledge Map Snapshot")
        expect(svgPayload).toContain("Metadata")
        expect(svgPayload).toContain("Legend — Ownership")
        expect(svgPayload).toContain("Legend — Bus Factor Risk")
        expect(svgPayload).toContain("src/api • risk 84")
        expect(svgPayload).toContain(
            "&quot;repositoryId&quot;:&quot;platform-team/api-gateway&quot;",
        )
    })

    it("скачивает knowledge map как SVG blob", (): void => {
        const createObjectUrl = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:knowledge-map-export")
        const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

        try {
            exportKnowledgeMapAsSvg(TEST_MODEL)

            expect(createObjectUrl).toHaveBeenCalledTimes(1)
            expect(clickSpy).toHaveBeenCalledTimes(1)
            expect(revokeObjectUrl).toHaveBeenCalledTimes(1)
        } finally {
            createObjectUrl.mockRestore()
            revokeObjectUrl.mockRestore()
            clickSpy.mockRestore()
        }
    })

    describe("buildKnowledgeMapExportFileName edge cases", (): void => {
        it("when repository label is empty, then returns fallback name with suffix", (): void => {
            expect(buildKnowledgeMapExportFileName("")).toBe("graph-export-knowledge-map")
        })

        it("when repository label has special chars, then normalizes them", (): void => {
            expect(buildKnowledgeMapExportFileName("My Repo!@#")).toBe("my-repo-knowledge-map")
        })
    })

    describe("buildKnowledgeMapExportSvg edge cases", (): void => {
        it("when model has no owners, then renders SVG without ownership legend entries", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                owners: [],
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("Legend — Ownership")
            expect(svgPayload).not.toContain("Alice Rivera")
        })

        it("when model has no districts, then renders SVG without bus factor risk entries", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                districts: [],
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("Legend — Bus Factor Risk")
            expect(svgPayload).not.toContain("Critical")
        })

        it("when model has no silos, then renders SVG without silo entries", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                silos: [],
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("Knowledge Silos")
            expect(svgPayload).not.toContain("risk 84")
        })

        it("when owner has invalid color, then uses fallback color", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                owners: [
                    {
                        color: "invalid-color",
                        fileCount: 3,
                        ownerName: "Bad Color Owner",
                    },
                ],
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("#94a3b8")
            expect(svgPayload).toContain("Bad Color Owner")
        })

        it("when owner has valid short hex color, then uses it directly", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                owners: [
                    {
                        color: "#abc",
                        fileCount: 2,
                        ownerName: "Short Hex",
                    },
                ],
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("#abc")
        })

        it("when model has more than 8 owners, then renders exactly 8 legend rects", (): void => {
            const owners = Array.from({ length: 12 }, (_, index) => ({
                color: `#${String(index).padStart(6, "a")}`,
                fileCount: index + 1,
                ownerName: `OwnerLegend${String(index)}`,
            }))

            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                owners,
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)
            const ownershipSectionStart = svgPayload.indexOf("Legend — Ownership")
            const busfactorSectionStart = svgPayload.indexOf("Legend — Bus Factor Risk")
            const ownershipSection = svgPayload.slice(ownershipSectionStart, busfactorSectionStart)
            const legendRectMatches = ownershipSection.match(/rx="3"/g)

            expect(legendRectMatches).toHaveLength(8)
        })

        it("when metadata contains special HTML characters, then escapes them", (): void => {
            const model: IKnowledgeMapExportModel = {
                ...TEST_MODEL,
                metadata: {
                    ...TEST_MODEL.metadata,
                    repositoryLabel: "repo<script>alert(1)</script>",
                },
            }

            const svgPayload = buildKnowledgeMapExportSvg(model)

            expect(svgPayload).toContain("&lt;script&gt;")
            expect(svgPayload).not.toContain("<script>")
        })
    })

    describe("exportKnowledgeMapAsPng", (): void => {
        it("when image loads successfully, then downloads PNG blob", async (): Promise<void> => {
            const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:km-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
            const clickSpy = vi
                .spyOn(HTMLAnchorElement.prototype, "click")
                .mockImplementation(() => {})

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
                toBlob: vi.fn((callback: (blob: Blob | null) => void): void => {
                    callback(new Blob(["png"], { type: "image/png" }))
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
                    Object.defineProperty(this, "width", { value: 1040, writable: true })
                    Object.defineProperty(this, "height", { value: 720, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await exportKnowledgeMapAsPng(TEST_MODEL)

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

        it("when image fails to load, then rejects and revokes URL", async (): Promise<void> => {
            const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:km-svg")
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
                await expect(exportKnowledgeMapAsPng(TEST_MODEL)).rejects.toThrowError(
                    "Unable to load generated knowledge map SVG image",
                )
                expect(revokeObjectUrl).toHaveBeenCalledWith("blob:km-svg")
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

        it("when canvas context is null, then throws error and revokes URL", async (): Promise<void> => {
            const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:km-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(null),
                toBlob: vi.fn(),
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
                    Object.defineProperty(this, "width", { value: 1040, writable: true })
                    Object.defineProperty(this, "height", { value: 720, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await expect(exportKnowledgeMapAsPng(TEST_MODEL)).rejects.toThrowError(
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
            const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:km-svg")
            const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
                toBlob: vi.fn((callback: (blob: Blob | null) => void): void => {
                    callback(null)
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
                    Object.defineProperty(this, "width", { value: 1040, writable: true })
                    Object.defineProperty(this, "height", { value: 720, writable: true })
                    setTimeout((): void => {
                        if (typeof this.onload === "function") {
                            this.onload(new Event("load"))
                        }
                    }, 0)
                },
                configurable: true,
            })

            try {
                await expect(exportKnowledgeMapAsPng(TEST_MODEL)).rejects.toThrowError(
                    "Unable to convert knowledge map canvas to PNG",
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
