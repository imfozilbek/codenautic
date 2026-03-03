import {describe, expect, test} from "bun:test"
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {dirname, resolve} from "node:path"

import {ArchitectureAnalyzer} from "../../../src/application/services/architecture-analyzer.service"

interface IFixtureFile {
    readonly relativePath: string
    readonly content: string
}

interface IFixtureWorkspace {
    readonly rootPath: string
    cleanup(): void
}

function createFixtureWorkspace(files: readonly IFixtureFile[]): IFixtureWorkspace {
    const rootPath = mkdtempSync(resolve(tmpdir(), "codenautic-core-architecture-analyzer-"))
    for (const file of files) {
        const absolutePath = resolve(rootPath, file.relativePath)
        const directoryPath = dirname(absolutePath)
        mkdirSync(directoryPath, {recursive: true})
        writeFileSync(absolutePath, file.content, "utf8")
    }
    return {
        rootPath,
        cleanup: () => rmSync(rootPath, {recursive: true, force: true}),
    }
}

describe("ArchitectureAnalyzer", () => {
    test("detects layer violations in repository", async () => {
        const fixture = createFixtureWorkspace([
            {
                relativePath: "src/domain/services/order.service.ts",
                content:
                    'import {runOrderFlow} from "../../application/use-cases/order.use-case"\nexport const analyzeOrder = (): void => {}',
            },
            {
                relativePath: "src/application/use-cases/order.use-case.ts",
                content: "export const runOrderFlow = (): void => {}",
            },
        ])
        try {
            const analyzer = new ArchitectureAnalyzer()
            const violations = await analyzer.detectViolations(fixture.rootPath)

            expect(violations).toHaveLength(1)
            const violation = violations[0]
            if (violation === undefined) {
                throw new Error("expected one violation")
            }

            expect(violation.sourceLayer).toBe("domain")
            expect(violation.targetLayer).toBe("application")
            expect(violation.sourceFile).toContain("src/domain/services/order.service.ts")
            expect(violation.targetFile).toContain("src/application/use-cases/order.use-case")
        } finally {
            fixture.cleanup()
        }
    })

    test("returns empty violations when architecture direction is valid", async () => {
        const fixture = createFixtureWorkspace([
            {
                relativePath: "src/application/use-cases/order.use-case.ts",
                content:
                    'import {OrderAggregate} from "../../domain/entities/order.aggregate"\nexport const execute = (): OrderAggregate | null => null',
            },
            {
                relativePath: "src/domain/entities/order.aggregate.ts",
                content: "export class OrderAggregate {}\n",
            },
        ])

        try {
            const analyzer = new ArchitectureAnalyzer()
            const violations = await analyzer.detectViolations(fixture.rootPath)

            expect(violations).toHaveLength(0)
        } finally {
            fixture.cleanup()
        }
    })

    test("computes DDD compliance with anemic model detection", async () => {
        const fixture = createFixtureWorkspace([
            {
                relativePath: "src/domain/orders/order.aggregate.ts",
                content:
                    "export class OrderAggregate {\n  public getTotal(): number { return 0 }\n  public applyDiscount(): void {}\n}",
            },
            {
                relativePath: "src/domain/orders/payment.model.ts",
                content: "export class PaymentAggregate {\n  public calculateAmount(): number { return 0 }\n}",
            },
            {
                relativePath: "src/domain/orders/legacy.model.ts",
                content: "export class LegacyAggregate {}",
            },
        ])

        try {
            const analyzer = new ArchitectureAnalyzer()
            const report = await analyzer.getDDDCompliance(fixture.rootPath)

            expect(report.boundedContexts).toEqual(["orders"])
            expect(report.aggregateHealth).toHaveLength(3)
            expect(report.aggregateHealth.find((item) => item.name === "PaymentAggregate")?.methodCount).toBe(1)
            expect(report.violations).toHaveLength(2)
            expect(report.violations[0]?.type).toBe("ANEMIC_MODEL")
            expect(report.violations[0]?.entity).toBe("LegacyAggregate")
        } finally {
            fixture.cleanup()
        }
    })

    test("returns health score based on violations and DDD metrics", async () => {
        const fixture = createFixtureWorkspace([
            {
                relativePath: "src/domain/services/order.service.ts",
                content:
                    'import {runOrderFlow} from "../../application/use-cases/order.use-case"\nexport const analyzeOrder = () => runOrderFlow()',
            },
            {
                relativePath: "src/application/use-cases/order.use-case.ts",
                content: "export const runOrderFlow = (): void => {}",
            },
            {
                relativePath: "src/domain/orders/order.aggregate.ts",
                content:
                    "export class OrderAggregate {\n  public getTotal(): number { return 0 }\n  public applyDiscount(): void {}\n}",
            },
            {
                relativePath: "src/domain/orders/payment.model.ts",
                content: "export class PaymentAggregate {\n  public calculateAmount(): number { return 0 }\n}",
            },
        ])

        try {
            const analyzer = new ArchitectureAnalyzer()
            const health = await analyzer.analyzeHealth(fixture.rootPath)

            expect(health.overall).toBe(66)
            expect(health.violations).toHaveLength(1)
            expect(health.dimensions.coupling).toBe(96)
            expect(health.dimensions.layerCompliance).toBe(92)
            expect(health.dimensions.cohesion).toBe(24)
            expect(health.dimensions.dddCompliance).toBe(50)
            expect(health.anemicModelIndex).toBe(50)
        } finally {
            fixture.cleanup()
        }
    })
})
