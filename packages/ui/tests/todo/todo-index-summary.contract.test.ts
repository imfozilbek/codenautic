import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface IVersionSection {
    readonly statuses: ReadonlyArray<string>
}

interface ITodoIndexSummary {
    readonly tasks: number
    readonly versions: number
    readonly completed: number
}

function parseTodoTableStatuses(markdown: string): ReadonlyArray<string> {
    const statuses: string[] = []

    markdown.split(/\r?\n/).forEach((line): void => {
        if (/^\|\s*WEB-[A-Z0-9-]+\s*\|/.test(line) === false) {
            return
        }

        const columns = line
            .split("|")
            .map((column): string => column.trim())
            .filter((column): boolean => column.length > 0)
        const status = columns[2]
        if (status !== undefined) {
            statuses.push(status)
        }
    })

    return statuses
}

function parseVersionSections(markdown: string): ReadonlyArray<IVersionSection> {
    const sections: IVersionSection[] = []
    let currentStatuses: string[] = []

    markdown.split(/\r?\n/).forEach((line): void => {
        if (/^## v\d+\.\d+\.\d+/.test(line) === true) {
            if (currentStatuses.length > 0) {
                sections.push({
                    statuses: currentStatuses,
                })
            }
            currentStatuses = []
            return
        }

        if (/^\|\s*WEB-[A-Z0-9-]+\s*\|/.test(line) === false) {
            return
        }

        const columns = line
            .split("|")
            .map((column): string => column.trim())
            .filter((column): boolean => column.length > 0)
        const status = columns[2]
        if (status !== undefined) {
            currentStatuses.push(status)
        }
    })

    if (currentStatuses.length > 0) {
        sections.push({
            statuses: currentStatuses,
        })
    }

    return sections
}

function parseTodoIndexSummary(todoIndexMarkdown: string): ITodoIndexSummary {
    const match = todoIndexMarkdown.match(
        /\*\*Задач:\*\*\s*(\d+)\s*\|\s*\*\*Версий:\*\*\s*(\d+)\s*\|\s*\*\*Выполнено:\*\*\s*(\d+)/,
    )
    if (match === null) {
        throw new Error("Unable to parse UI TODO summary counters")
    }

    const tasks = Number(match[1])
    const versions = Number(match[2])
    const completed = Number(match[3])

    return {
        completed,
        tasks,
        versions,
    }
}

describe("ui todo index summary contract", (): void => {
    it("держит summary counters синхронизированными с milestone todo файлами", (): void => {
        const packageRoot = resolve(import.meta.dirname, "..", "..")
        const todoDirectory = resolve(packageRoot, "todo")
        const todoIndexPath = resolve(packageRoot, "TODO.md")

        const todoFiles = readdirSync(todoDirectory).filter((fileName): boolean =>
            fileName.endsWith(".md"),
        )
        const parsedSummary = parseTodoIndexSummary(readFileSync(todoIndexPath, "utf8"))

        let computedTasks = 0
        let computedVersions = 0
        let computedCompletedVersions = 0

        todoFiles.forEach((fileName): void => {
            const markdown = readFileSync(resolve(todoDirectory, fileName), "utf8")
            const tableStatuses = parseTodoTableStatuses(markdown)
            const versionSections = parseVersionSections(markdown)

            computedTasks += tableStatuses.length
            computedVersions += versionSections.length
            computedCompletedVersions += versionSections.filter((section): boolean => {
                return section.statuses.every((status): boolean => status === "DONE")
            }).length
        })

        expect(parsedSummary.tasks).toBe(computedTasks)
        expect(parsedSummary.versions).toBe(computedVersions)
        expect(parsedSummary.completed).toBe(computedCompletedVersions)
    })
})
