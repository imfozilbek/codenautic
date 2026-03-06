import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface ITodoRow {
    readonly fileName: string
    readonly id: string
    readonly lineNumber: number
    readonly rawLine: string
    readonly resultCell: string
    readonly status: string
}

function collectTodoMarkdownFiles(directoryPath: string): ReadonlyArray<string> {
    return readdirSync(directoryPath)
        .filter((fileName): boolean => fileName.endsWith(".md"))
        .map((fileName): string => resolve(directoryPath, fileName))
}

function toRelativePath(rootPath: string, absolutePath: string): string {
    const prefix = `${rootPath}/`
    if (absolutePath.startsWith(prefix)) {
        return absolutePath.slice(prefix.length)
    }
    return absolutePath
}

function parseTodoRows(markdown: string, fileName: string): ReadonlyArray<ITodoRow> {
    const rows: Array<ITodoRow> = []
    const lines = markdown.split(/\r?\n/)

    lines.forEach((line, index): void => {
        if (line.startsWith("| WEB-") === false) {
            return
        }

        const rowMatch = line.match(
            /^\|\s*(WEB-[^|]+?)\s*\|\s*[^|]*\|\s*([^|]+?)\s*\|\s*([^|]*)\|/,
        )
        if (rowMatch === null) {
            return
        }

        const id = rowMatch.at(1)?.trim() ?? ""
        const status = rowMatch.at(2)?.trim() ?? ""
        const resultCell = rowMatch.at(3)?.trim() ?? ""
        if (id.startsWith("WEB-") === false || status.length === 0) {
            return
        }

        rows.push({
            fileName,
            id,
            lineNumber: index + 1,
            rawLine: line,
            resultCell,
            status,
        })
    })

    return rows
}

describe("UI todo done quality contract", (): void => {
    it("гарантирует, что каждая DONE-задача содержит результат и DoD в acceptance criteria", (): void => {
        const workspaceRoot = resolve(process.cwd(), "..")
        const todoDirectory = resolve(process.cwd(), "todo")
        const todoFiles = collectTodoMarkdownFiles(todoDirectory)

        expect(todoFiles.length).toBeGreaterThan(0)

        const allRows = todoFiles.flatMap((filePath): ReadonlyArray<ITodoRow> => {
            const markdown = readFileSync(filePath, "utf8")
            const relativePath = toRelativePath(workspaceRoot, filePath)
            return parseTodoRows(markdown, relativePath)
        })

        const doneRows = allRows.filter((row): boolean => row.status === "DONE")
        expect(doneRows.length).toBeGreaterThan(0)

        const issues: Array<string> = []

        doneRows.forEach((row): void => {
            if (row.resultCell.length === 0) {
                issues.push(`${row.fileName}:${String(row.lineNumber)} ${row.id} has empty result`)
            }
            if (/DoD:/i.test(row.rawLine) === false) {
                issues.push(
                    `${row.fileName}:${String(row.lineNumber)} ${row.id} is missing DoD marker in acceptance criteria`,
                )
            }
            if (/bun run (lint|typecheck|test)/i.test(row.rawLine) === false) {
                issues.push(
                    `${row.fileName}:${String(row.lineNumber)} ${row.id} is missing run commands in acceptance criteria`,
                )
            }
        })

        expect(issues).toEqual([])
    })
})
