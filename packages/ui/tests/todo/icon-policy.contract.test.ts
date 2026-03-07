import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const FORBIDDEN_ICON_MODULE_PATTERNS = [
    "@heroicons/react",
    "react-icons",
    "@tabler/icons-react",
    "phosphor-react",
    "@iconify/react",
] as const

function listSourceFiles(directory: string): ReadonlyArray<string> {
    const filePaths: string[] = []
    const entries = readdirSync(directory, { withFileTypes: true })

    entries.forEach((entry): void => {
        const entryPath = resolve(directory, entry.name)
        if (entry.isDirectory() === true) {
            filePaths.push(...listSourceFiles(entryPath))
            return
        }

        if (entry.isFile() === true && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
            filePaths.push(entryPath)
        }
    })

    return filePaths
}

function hasForbiddenIconImport(fileContent: string): boolean {
    return FORBIDDEN_ICON_MODULE_PATTERNS.some((modulePattern): boolean => {
        const directImportPattern = new RegExp(`from\\s+["']${modulePattern}["']`)
        return directImportPattern.test(fileContent)
    })
}

function hasLiteralIconHexColor(fileContent: string): boolean {
    const hasLucideImport = /from\s+["']lucide-react["']/.test(fileContent)
    if (hasLucideImport === false) {
        return false
    }

    const literalHexColorPattern =
        /<(?:[A-Z][A-Za-z0-9]*)[^>]*(?:color|stroke)=["']#[0-9A-Fa-f]{3,8}["'][^>]*>/m
    return literalHexColorPattern.test(fileContent)
}

function hasIconOnlyButtonWithGlyphText(fileContent: string): boolean {
    const iconOnlyButtonPattern = /<Button\b[\s\S]*?\bisIconOnly\b[\s\S]*?>([\s\S]*?)<\/Button>/g
    let match: RegExpExecArray | null = iconOnlyButtonPattern.exec(fileContent)

    while (match !== null) {
        const body = (match[1] ?? "").trim()
        if (body.length > 0 && body.includes("<") === false) {
            return true
        }

        match = iconOnlyButtonPattern.exec(fileContent)
    }

    return false
}

describe("ui icon policy contract", (): void => {
    it("запрещает сторонние icon-пакеты, literal hex-цвета и glyph-текст в icon-only кнопках", (): void => {
        const packageRoot = resolve(import.meta.dirname, "..", "..")
        const sourceFiles = listSourceFiles(resolve(packageRoot, "src"))

        const filesWithForbiddenImports = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasForbiddenIconImport(fileContent)
        })
        const filesWithLiteralIconColors = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasLiteralIconHexColor(fileContent)
        })
        const filesWithGlyphIcons = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasIconOnlyButtonWithGlyphText(fileContent)
        })

        expect(filesWithForbiddenImports).toStrictEqual([])
        expect(filesWithLiteralIconColors).toStrictEqual([])
        expect(filesWithGlyphIcons).toStrictEqual([])
    })
})
