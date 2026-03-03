import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"

import {
    ARCHITECTURE_LAYER,
    collectTypeScriptFiles,
    validateDependencyDirection,
} from "../../src/shared/dependency-direction-guard"

/**
 * Loads fixture source files for dependency direction tests.
 *
 * @param fixtureName Fixture directory name.
 * @returns Snapshot list collected from fixture source tree.
 */
function loadFixture(fixtureName: string): readonly {path: string; content: string}[] {
    const fixtureSourcePath = resolve(import.meta.dir, "fixtures", fixtureName, "src")
    return collectTypeScriptFiles(fixtureSourcePath)
}

describe("dependency direction guardrails", () => {
    test("detects violation when domain imports application", () => {
        const fixtureFiles = loadFixture("domain-imports-application")

        const violations = validateDependencyDirection(fixtureFiles)

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("detects violation when domain imports infrastructure", () => {
        const fixtureFiles = loadFixture("domain-imports-infrastructure")

        const violations = validateDependencyDirection(fixtureFiles)

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.INFRASTRUCTURE)
    })

    test("detects violation when application imports infrastructure", () => {
        const fixtureFiles = loadFixture("application-imports-infrastructure")

        const violations = validateDependencyDirection(fixtureFiles)

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.INFRASTRUCTURE)
    })

    test("detects violation when import goes through alias mapping", () => {
        const fixtureFiles = loadFixture("domain-imports-application-alias")
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application-alias", "src")

        const violations = validateDependencyDirection(fixtureFiles, {
            aliasDirectories: {
                "@fixture": fixtureRoot,
            },
        })

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
        expect(violations[0]?.importPath).toBe("@fixture/application/use-cases/review.use-case")
    })

    test("detects violation through built-in package aliases", () => {
        const repositoryRoot = resolve(import.meta.dir, "../../../..")
        const sourceFilePath = resolve(repositoryRoot, "packages/core/src/domain/services/alias-default-domain.service.ts")
        const violations = validateDependencyDirection([
            {
                path: sourceFilePath,
                content: 'import {runReviewUseCase} from "@codenautic/core/application/use-cases/review.use-case"',
            },
        ])

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
        expect(violations[0]?.importPath).toBe("@codenautic/core/application/use-cases/review.use-case")
    })

    test("detects violation when import uses absolute path", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const domainFilePath = resolve(fixtureRoot, "domain/services/absolute-invalid-domain.service.ts")
        const absoluteApplicationPath = resolve(fixtureRoot, "application/use-cases/review.use-case")

        const violations = validateDependencyDirection([
            {
                path: domainFilePath,
                content: `import {runReviewUseCase} from "${absoluteApplicationPath}"\nexport const execute = runReviewUseCase`,
            },
        ])

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("detects violation for export-from statement", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/export-invalid-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content:
                    "export {runReviewUseCase} from \"../../application/use-cases/review.use-case\"",
            },
        ])

        expect(violations).toHaveLength(1)
        expect(violations[0]?.sourceLayer).toBe(ARCHITECTURE_LAYER.DOMAIN)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("detects violation for import type syntax", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/type-invalid-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content:
                    "type ReviewModule = import(\"../../application/use-cases/review.use-case\")",
            },
        ])

        expect(violations).toHaveLength(1)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("detects violation for import equals require syntax", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-equals-invalid-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content:
                    "import reviewUseCase = require(\"../../application/use-cases/review.use-case\")",
            },
        ])

        expect(violations).toHaveLength(1)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("detects violation for alias import without nested suffix", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application-alias", "src")
        const domainPath = resolve(fixtureRoot, "domain/services/exact-alias-invalid-domain.service.ts")
        const aliasTarget = resolve(fixtureRoot, "application/use-cases")

        const violations = validateDependencyDirection(
            [
                {
                    path: domainPath,
                    content: "import \"@fixture-app\"",
                },
            ],
            {
                aliasDirectories: {
                    "@fixture-app": aliasTarget,
                },
            },
        )

        expect(violations).toHaveLength(1)
        expect(violations[0]?.targetLayer).toBe(ARCHITECTURE_LAYER.APPLICATION)
    })

    test("ignores external package imports", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/external-import-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "import {readFileSync} from \"node:fs\"",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores dynamic import call with non-string argument", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/non-string-dynamic-import-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "const target = \"../../application/use-cases/review.use-case\"; void import(target)",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores malformed dynamic import call without arguments", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/malformed-dynamic-import-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "void import()",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores export declaration without module specifier", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/export-local-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "const internalValue = 1\nexport {internalValue}",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores malformed import type with non-literal argument", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-type-non-literal-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "type ReviewModule = import(target).ReviewTarget",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores malformed import type with numeric literal argument", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-type-number-literal-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "type ReviewModule = import(123).ReviewTarget",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores import-equals declaration with non-require module reference", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-equals-non-require-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "import reviewUseCase = ReviewNamespace.UseCase",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores malformed import-equals require call without argument", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-equals-require-empty-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "import reviewUseCase = require()",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores malformed import-equals require call with non-string argument", () => {
        const fixtureRoot = resolve(import.meta.dir, "fixtures", "domain-imports-application", "src")
        const filePath = resolve(fixtureRoot, "domain/services/import-equals-require-number-domain.service.ts")

        const violations = validateDependencyDirection([
            {
                path: filePath,
                content: "import reviewUseCase = require(123)",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores unresolved alias for files outside packages directory", () => {
        const violations = validateDependencyDirection([
            {
                path: "/tmp/codenautic/src/domain/services/unresolved.ts",
                content: "import \"@codenautic/core/application/use-cases/review.use-case\"",
            },
        ])

        expect(violations).toHaveLength(0)
    })

    test("ignores import-like text inside comments and strings", () => {
        const fixtureFiles = [
            {
                path: resolve(import.meta.dir, "fixtures", "valid-direction", "src/domain/services/safe-comment.ts"),
                content: `
                export const text = "import {x} from '../../application/use-cases/review.use-case'"
                /** import {x} from '../../infrastructure/database/client' */
                `,
            },
        ]

        const violations = validateDependencyDirection(fixtureFiles)

        expect(violations).toHaveLength(0)
    })

    test("allows valid inward dependency direction", () => {
        const fixtureFiles = loadFixture("valid-direction")

        const violations = validateDependencyDirection(fixtureFiles)

        expect(violations).toHaveLength(0)
    })

    test("passes for current core and adapters source trees", () => {
        const repositoryRoot = resolve(import.meta.dir, "../../../..")
        const coreFiles = collectTypeScriptFiles(resolve(repositoryRoot, "packages/core/src"))
        const adaptersFiles = collectTypeScriptFiles(resolve(repositoryRoot, "packages/adapters/src"))

        const violations = validateDependencyDirection([...coreFiles, ...adaptersFiles])

        expect(violations).toHaveLength(0)
    })
})
