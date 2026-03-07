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

function hasDirectLucideImport(fileContent: string): boolean {
    return /from\s+["']lucide-react["']/.test(fileContent)
}

function isAllowedLucideImportFile(filePath: string): boolean {
    const normalizedPath = filePath.replaceAll("\\", "/")
    return normalizedPath.endsWith("/src/components/icons/app-icons.ts")
}

function hasLiteralIconHexColor(fileContent: string): boolean {
    const hasLucideImport = /from\s+["']lucide-react["']/.test(fileContent)
    if (hasLucideImport === false) {
        return false
    }

    const literalHexColorPattern =
        /<(?:[A-Z][A-Za-z0-9]*)[^>]*(?:color|stroke|fill)=["']#[0-9A-Fa-f]{3,8}["'][^>]*>/m
    return literalHexColorPattern.test(fileContent)
}

function extractLucideIconNames(fileContent: string): ReadonlyArray<string> {
    const lucideImportMatch = fileContent.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/)
    if (lucideImportMatch === null) {
        return []
    }

    const rawSpecifiers = lucideImportMatch[1] ?? ""
    return rawSpecifiers
        .split(",")
        .map((specifier): string => specifier.trim())
        .map((specifier): string => {
            const [name] = specifier.split(/\s+as\s+/)
            return (name ?? "").trim()
        })
        .filter((name): boolean => /^[A-Z][A-Za-z0-9_]*$/.test(name))
}

function hasHardcodedUtilityColorOnLucideIcon(fileContent: string): boolean {
    const iconNames = extractLucideIconNames(fileContent)
    if (iconNames.length === 0) {
        return false
    }

    const utilityColorToken =
        /text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/

    return iconNames.some((iconName): boolean => {
        const iconTagPattern = new RegExp(`<${iconName}\\b[^>]*className=["'][^"']*["'][^>]*>`, "g")
        let match: RegExpExecArray | null = iconTagPattern.exec(fileContent)

        while (match !== null) {
            const tagSource = match[0]
            if (utilityColorToken.test(tagSource)) {
                return true
            }
            match = iconTagPattern.exec(fileContent)
        }

        return false
    })
}

function hasExplicitColorPropOnLucideIcon(fileContent: string): boolean {
    const iconNames = extractLucideIconNames(fileContent)
    if (iconNames.length === 0) {
        return false
    }

    return iconNames.some((iconName): boolean => {
        const iconTagPattern = new RegExp(`<${iconName}\\b[^>]*>`, "g")
        let match: RegExpExecArray | null = iconTagPattern.exec(fileContent)

        while (match !== null) {
            const tagSource = match[0]
            if (/\b(?:color|stroke|fill)\s*=/.test(tagSource)) {
                return true
            }
            match = iconTagPattern.exec(fileContent)
        }

        return false
    })
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

function hasIconOnlyButtonWithoutAriaLabel(fileContent: string): boolean {
    const iconOnlyButtonPattern = /<Button\b[\s\S]*?\bisIconOnly\b[\s\S]*?>[\s\S]*?<\/Button>/g
    let match: RegExpExecArray | null = iconOnlyButtonPattern.exec(fileContent)

    while (match !== null) {
        const buttonSource = match[0]
        if (/aria-label\s*=/.test(buttonSource) === false) {
            return true
        }

        match = iconOnlyButtonPattern.exec(fileContent)
    }

    return false
}

describe("ui icon policy contract", (): void => {
    it("запрещает сторонние icon-пакеты, hardcoded icon-цвета, glyph-текст и icon-only кнопки без aria-label", (): void => {
        const packageRoot = resolve(import.meta.dirname, "..", "..")
        const sourceFiles = listSourceFiles(resolve(packageRoot, "src"))

        const filesWithForbiddenImports = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasForbiddenIconImport(fileContent)
        })
        const filesWithDirectLucideImports = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return (
                hasDirectLucideImport(fileContent)
                && isAllowedLucideImportFile(filePath) === false
            )
        })
        const filesWithLiteralIconColors = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasLiteralIconHexColor(fileContent)
        })
        const filesWithGlyphIcons = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasIconOnlyButtonWithGlyphText(fileContent)
        })
        const filesWithAriaViolations = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasIconOnlyButtonWithoutAriaLabel(fileContent)
        })
        const filesWithHardcodedUtilityIconColors = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasHardcodedUtilityColorOnLucideIcon(fileContent)
        })
        const filesWithExplicitIconColorProps = sourceFiles.filter((filePath): boolean => {
            const fileContent = readFileSync(filePath, "utf8")
            return hasExplicitColorPropOnLucideIcon(fileContent)
        })

        expect(filesWithForbiddenImports).toStrictEqual([])
        expect(filesWithDirectLucideImports).toStrictEqual([])
        expect(filesWithLiteralIconColors).toStrictEqual([])
        expect(filesWithHardcodedUtilityIconColors).toStrictEqual([])
        expect(filesWithExplicitIconColorProps).toStrictEqual([])
        expect(filesWithGlyphIcons).toStrictEqual([])
        expect(filesWithAriaViolations).toStrictEqual([])
    })
})
