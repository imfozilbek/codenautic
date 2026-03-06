import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

interface IPackageJson {
    readonly dependencies?: Readonly<Record<string, string>>
    readonly devDependencies?: Readonly<Record<string, string>>
}

function readPackageJson(packageRoot: string): IPackageJson {
    const packageJsonPath = resolve(packageRoot, "package.json")
    return JSON.parse(readFileSync(packageJsonPath, "utf8")) as IPackageJson
}

function collectDependencyNames(packageJson: IPackageJson): ReadonlyArray<string> {
    const dependencyNames = Object.keys(packageJson.dependencies ?? {})
    const devDependencyNames = Object.keys(packageJson.devDependencies ?? {})

    return [ ...dependencyNames, ...devDependencyNames ]
}

describe("ui dependency migration policy contract", (): void => {
    it("гарантирует HeroUI-first stack и отсутствие legacy shadcn/radix артефактов", (): void => {
        const packageRoot = resolve(import.meta.dirname, "..", "..")
        const packageJson = readPackageJson(packageRoot)
        const dependencyNames = collectDependencyNames(packageJson)

        const hasHeroUi = dependencyNames.includes("@heroui/react")
        const hasLegacyCva = dependencyNames.includes("class-variance-authority")
        const hasRadixDependency = dependencyNames.some((dependencyName): boolean => {
            return dependencyName.startsWith("@radix-ui/")
        })
        const hasShadcnSchema = existsSync(resolve(packageRoot, "components.json"))

        expect(hasHeroUi).toBe(true)
        expect(hasLegacyCva).toBe(false)
        expect(hasRadixDependency).toBe(false)
        expect(hasShadcnSchema).toBe(false)
    })
})
