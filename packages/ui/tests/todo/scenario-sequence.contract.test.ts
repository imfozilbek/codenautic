import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function extractScenarioNumbers(markdown: string): ReadonlyArray<number> {
    const pattern = /^##\s+Сценарий\s+S(\d+)\s+—\s+.+$/gm
    const numbers: Array<number> = []
    let match: RegExpExecArray | null = pattern.exec(markdown)

    while (match !== null) {
        const value = Number.parseInt(match.at(1) ?? "", 10)
        if (Number.isNaN(value) === false) {
            numbers.push(value)
        }
        match = pattern.exec(markdown)
    }

    return numbers
}

describe("SCREENS and scenarios sequence contract", (): void => {
    it("гарантирует уникальную и непрерывную нумерацию сценариев", (): void => {
        const filePath = resolve(process.cwd(), "SCREENS-AND-SCENARIOS.md")
        const markdown = readFileSync(filePath, "utf8")
        const scenarioNumbers = extractScenarioNumbers(markdown)

        expect(scenarioNumbers.length).toBeGreaterThan(0)

        const uniqueNumbers = Array.from(new Set(scenarioNumbers))
        expect(uniqueNumbers.length).toBe(scenarioNumbers.length)

        const sortedNumbers = [...uniqueNumbers].sort((left, right): number => left - right)
        const firstScenarioNumber = sortedNumbers.at(0)
        const lastScenarioNumber = sortedNumbers.at(-1)

        expect(firstScenarioNumber).toBe(1)
        expect(lastScenarioNumber).toBeGreaterThan(0)

        if (lastScenarioNumber === undefined) {
            return
        }

        const missingNumbers: Array<number> = []
        for (let expectedNumber = 1; expectedNumber <= lastScenarioNumber; expectedNumber += 1) {
            if (sortedNumbers.includes(expectedNumber) === false) {
                missingNumbers.push(expectedNumber)
            }
        }

        expect(missingNumbers).toEqual([])
    })
})
