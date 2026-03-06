import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface IMermaidBlock {
    readonly content: string
    readonly startLine: number
}

function extractMermaidBlocks(markdown: string): ReadonlyArray<IMermaidBlock> {
    const pattern = /```mermaid\s*\n([\s\S]*?)```/g
    const blocks: Array<IMermaidBlock> = []
    let match: RegExpExecArray | null = pattern.exec(markdown)

    while (match !== null) {
        const sourceBeforeBlock = markdown.slice(0, match.index)
        const startLine = sourceBeforeBlock.split(/\r?\n/).length + 1
        const content = match.at(1)

        if (content !== undefined) {
            blocks.push({
                content,
                startLine,
            })
        }
        match = pattern.exec(markdown)
    }

    return blocks
}

function detectArrowToken(line: string): "-->" | "-.->" | undefined {
    if (line.includes("-->")) {
        return "-->"
    }
    if (line.includes("-.->")) {
        return "-.->"
    }
    return undefined
}

function extractEdgeTarget(line: string): string | undefined {
    const arrowToken = detectArrowToken(line)
    if (arrowToken === undefined) {
        return undefined
    }
    const arrowIndex = line.lastIndexOf(arrowToken)
    if (arrowIndex === -1) {
        return undefined
    }

    let target = line.slice(arrowIndex + arrowToken.length).trim()
    if (target.startsWith("|")) {
        const secondPipeIndex = target.indexOf("|", 1)
        if (secondPipeIndex === -1) {
            return ""
        }
        target = target.slice(secondPipeIndex + 1).trim()
    }

    return target
}

function normalizeLines(blockContent: string): ReadonlyArray<string> {
    return blockContent
        .split(/\r?\n/)
        .map((line): string => line.trim())
        .filter((line): boolean => line.length > 0)
}

describe("SCREENS and scenarios mermaid syntax contract", (): void => {
    it("валидирует базовую синтаксическую целостность всех mermaid блоков", (): void => {
        const filePath = resolve(process.cwd(), "SCREENS-AND-SCENARIOS.md")
        const markdown = readFileSync(filePath, "utf8")
        const blocks = extractMermaidBlocks(markdown)

        expect(blocks.length).toBeGreaterThan(0)

        const issues: Array<string> = []

        blocks.forEach((block, blockIndex): void => {
            const lines = normalizeLines(block.content)
            const firstLine = lines.at(0)
            const graphDirective = /^(flowchart|graph|sequenceDiagram|stateDiagram(?:-v2)?|gantt)\b/

            if (firstLine === undefined || graphDirective.test(firstLine) === false) {
                issues.push(
                    `Block #${blockIndex + 1} at line ${block.startLine}: missing or invalid graph directive`,
                )
                return
            }

            lines.forEach((line, lineIndex): void => {
                if (detectArrowToken(line) === undefined) {
                    return
                }

                if (/^[A-Za-z][A-Za-z0-9_]*/.test(line) === false) {
                    issues.push(
                        `Block #${blockIndex + 1} line ${block.startLine + lineIndex}: edge line must start with node id`,
                    )
                    return
                }

                const target = extractEdgeTarget(line)
                if (target === undefined) {
                    issues.push(
                        `Block #${blockIndex + 1} line ${block.startLine + lineIndex}: edge target is missing`,
                    )
                    return
                }

                if (/^[A-Za-z][A-Za-z0-9_]*/.test(target) === false) {
                    issues.push(
                        `Block #${blockIndex + 1} line ${block.startLine + lineIndex}: edge target must start with node id`,
                    )
                }
            })
        })

        expect(issues).toEqual([])
    })
})
