import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CodeDiffViewer } from "@/components/reviews/code-diff-viewer"
import type { ICcrDiffFile, ICcrDiffLine } from "@/lib/types/ccr-types"
import { renderWithProviders } from "../../utils/render"

function createDiffLine(overrides: Partial<ICcrDiffLine> = {}): ICcrDiffLine {
    return {
        leftLine: 1,
        leftText: "const a = 1",
        rightLine: 1,
        rightText: "const a = 1",
        type: "context",
        ...overrides,
    }
}

function createDiffFile(overrides: Partial<ICcrDiffFile> = {}): ICcrDiffFile {
    return {
        filePath: "src/auth/middleware.ts",
        language: "typescript",
        lines: [
            createDiffLine({ leftLine: 1, rightLine: 1, type: "context" }),
            createDiffLine({
                leftLine: 2,
                rightLine: 2,
                leftText: "const old = true",
                rightText: "const updated = true",
                type: "added",
            }),
            createDiffLine({
                leftLine: 3,
                rightLine: undefined,
                leftText: "const removed = false",
                rightText: "",
                type: "removed",
            }),
        ],
        ...overrides,
    }
}

describe("CodeDiffViewer", (): void => {
    it("when files provided, then renders section title and file path", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [createDiffFile()]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByText("Code diff")).not.toBeNull()
        expect(screen.getByText("src/auth/middleware.ts")).not.toBeNull()
    })

    it("when files is empty, then renders no diff content message", (): void => {
        renderWithProviders(<CodeDiffViewer files={[]} />)

        expect(screen.getByText("No available diff content for this CCR.")).not.toBeNull()
    })

    it("when file has language, then renders language label", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [createDiffFile({ language: "typescript" })]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByText("Language: typescript")).not.toBeNull()
    })

    it("when file has added and removed lines, then renders line count summary", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [createDiffFile()]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByText("+1 / -1")).not.toBeNull()
    })

    it("when multiple files provided, then renders all file panels", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [
            createDiffFile({ filePath: "src/auth/middleware.ts" }),
            createDiffFile({ filePath: "src/auth/index.ts", language: "typescript" }),
        ]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByText("src/auth/middleware.ts")).not.toBeNull()
        expect(screen.getByText("src/auth/index.ts")).not.toBeNull()
    })

    it("when file has diff lines with comments, then renders comment author and message", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [
            createDiffFile({
                lines: [
                    createDiffLine({
                        leftLine: 1,
                        rightLine: 1,
                        type: "added",
                        comments: [
                            {
                                author: "Neo",
                                line: 1,
                                message: "Need consistent error message.",
                                side: "right",
                            },
                        ],
                    }),
                ],
            }),
        ]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByText(/Neo/)).not.toBeNull()
        expect(screen.getByText("Need consistent error message.")).not.toBeNull()
    })

    it("when viewer rendered, then has accessible aria label", (): void => {
        const files: ReadonlyArray<ICcrDiffFile> = [createDiffFile()]

        renderWithProviders(<CodeDiffViewer files={files} />)

        expect(screen.getByLabelText("Code diff viewer")).not.toBeNull()
    })
})
