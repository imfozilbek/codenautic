import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface IMermaidBlock {
    readonly content: string
    readonly filePath: string
    readonly startLine: number
}

interface IMermaidLine {
    readonly line: string
    readonly sourceLineOffset: number
}

function collectMarkdownFiles(directoryPath: string): ReadonlyArray<string> {
    const files: Array<string> = []

    const walk = (currentPath: string): void => {
        const entries = readdirSync(currentPath, { withFileTypes: true })

        entries.forEach((entry): void => {
            const entryPath = join(currentPath, entry.name)
            if (entry.isDirectory()) {
                walk(entryPath)
                return
            }

            if (entry.isFile() && entryPath.endsWith(".md")) {
                files.push(entryPath)
            }
        })
    }

    walk(directoryPath)
    return files
}

function extractMermaidBlocks(markdown: string, filePath: string): ReadonlyArray<IMermaidBlock> {
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
                filePath,
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

function normalizeLines(blockContent: string): ReadonlyArray<IMermaidLine> {
    return blockContent
        .split(/\r?\n/)
        .map((line, index): IMermaidLine => ({
            line: line.trim(),
            sourceLineOffset: index,
        }))
        .filter((entry): boolean => entry.line.length > 0)
}

function toRelativePath(rootPath: string, absolutePath: string): string {
    const prefix = `${rootPath}/`
    if (absolutePath.startsWith(prefix)) {
        return absolutePath.slice(prefix.length)
    }
    return absolutePath
}

describe("SCREENS and scenarios mermaid syntax contract", (): void => {
    it("валидирует базовую синтаксическую целостность всех mermaid блоков в ui markdown", (): void => {
        const rootDirectory = resolve(process.cwd())
        const markdownFiles = collectMarkdownFiles(rootDirectory)

        expect(markdownFiles.length).toBeGreaterThan(0)

        const blocks = markdownFiles.flatMap((filePath): ReadonlyArray<IMermaidBlock> => {
            const markdown = readFileSync(filePath, "utf8")
            return extractMermaidBlocks(markdown, filePath)
        })

        expect(blocks.length).toBeGreaterThan(0)

        const issues: Array<string> = []

        blocks.forEach((block, blockIndex): void => {
            const lines = normalizeLines(block.content)
            const firstLine = lines.at(0)?.line
            const graphDirective = /^(flowchart|graph|sequenceDiagram|stateDiagram(?:-v2)?|gantt)\b/
            const relativePath = toRelativePath(rootDirectory, block.filePath)

            if (firstLine === undefined || graphDirective.test(firstLine) === false) {
                issues.push(
                    `Block #${blockIndex + 1} in ${relativePath}:${String(block.startLine)} has invalid graph directive`,
                )
                return
            }

            lines.forEach((entry): void => {
                if (detectArrowToken(entry.line) === undefined) {
                    return
                }
                const lineNumber = block.startLine + entry.sourceLineOffset

                if (/^[A-Za-z][A-Za-z0-9_]*/.test(entry.line) === false) {
                    issues.push(
                        `Block #${blockIndex + 1} in ${relativePath}:${String(lineNumber)} has edge without start node id`,
                    )
                    return
                }

                const target = extractEdgeTarget(entry.line)
                if (target === undefined) {
                    issues.push(
                        `Block #${blockIndex + 1} in ${relativePath}:${String(lineNumber)} has missing edge target`,
                    )
                    return
                }

                if (/^[A-Za-z][A-Za-z0-9_]*/.test(target) === false) {
                    issues.push(
                        `Block #${blockIndex + 1} in ${relativePath}:${String(lineNumber)} has edge target without node id`,
                    )
                }
            })
        })

        expect(issues).toEqual([])
    })
})
