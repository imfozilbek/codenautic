import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface IScenarioSection {
    readonly heading: string
    readonly body: string
    readonly lineNumber: number
}

function collectScenarioSections(markdown: string): ReadonlyArray<IScenarioSection> {
    const headingPattern = /^##\s+Сценарий\s+S\d+\s+—\s+.+$/gm
    const matches = Array.from(markdown.matchAll(headingPattern))

    return matches.map((match, index): IScenarioSection => {
        const heading = match.at(0) ?? ""
        const startIndex = match.index ?? 0
        const endIndex = matches.at(index + 1)?.index ?? markdown.length
        const lineNumber = markdown.slice(0, startIndex).split(/\r?\n/).length
        const body = markdown.slice(startIndex, endIndex)

        return {
            body,
            heading,
            lineNumber,
        }
    })
}

function countFencedBlocks(markdown: string, fenceLanguage: string): number {
    const pattern = new RegExp("```" + fenceLanguage + "\\s*[\\s\\S]*?```", "g")
    return Array.from(markdown.matchAll(pattern)).length
}

describe("SCREENS and scenarios structure contract", (): void => {
    it("гарантирует структурную целостность сценариев и парность code fences", (): void => {
        const filePath = resolve(process.cwd(), "SCREENS-AND-SCENARIOS.md")
        const markdown = readFileSync(filePath, "utf8")
        const sections = collectScenarioSections(markdown)

        expect(sections.length).toBeGreaterThan(0)

        const totalFenceMarkers = Array.from(markdown.matchAll(/```/g)).length
        expect(totalFenceMarkers % 2).toBe(0)

        const issues: Array<string> = []

        sections.forEach((section): void => {
            const mermaidBlocks = countFencedBlocks(section.body, "mermaid")
            const textBlocks = countFencedBlocks(section.body, "text")

            if (mermaidBlocks < 1) {
                issues.push(`${section.heading} at line ${String(section.lineNumber)} has no mermaid block`)
            }

            if (textBlocks < 1) {
                issues.push(`${section.heading} at line ${String(section.lineNumber)} has no text mockup block`)
            }
        })

        expect(issues).toEqual([])
    })
})
