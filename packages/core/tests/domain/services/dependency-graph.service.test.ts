import {describe, expect, test} from "bun:test"

import {DIFF_FILE_STATUS, DiffFile} from "../../../src/domain/value-objects/diff-file.value-object"
import {FilePath} from "../../../src/domain/value-objects/file-path.value-object"
import {DependencyGraphService} from "../../../src/domain/services/dependency-graph.service"

function createDiffFile(filePath: string, patch: string): DiffFile {
    return DiffFile.create({
        filePath: FilePath.create(filePath),
        status: DIFF_FILE_STATUS.ADDED,
        hunks: [],
        patch,
    })
}

describe("DependencyGraphService", () => {
    test("builds file nodes and imports edges", async () => {
        const service = new DependencyGraphService()
        const app = createDiffFile("src/app.ts", "+import { util } from \"./utils\";")
        const utils = createDiffFile("src/utils.ts", "")

        const graph = await service.buildGraph([app, utils])

        expect(graph.nodes).toHaveLength(2)
        const appNode = graph.nodes[0]
        expect(appNode).not.toBeUndefined()
        if (appNode === undefined) {
            return
        }

        expect(appNode.id).toBe("file:src/app.ts")
        expect(appNode.filePath).toBe("src/app.ts")
        expect(appNode.type).toBe("file")

        const importEdge = graph.edges[0]
        expect(importEdge).not.toBeUndefined()
        if (importEdge === undefined) {
            return
        }

        expect(importEdge).toEqual({
            source: "file:src/app.ts",
            target: "file:src/utils.ts",
            type: "IMPORTS",
        })
    })

    test("returns changed and affected nodes for reverse dependencies", async () => {
        const service = new DependencyGraphService()
        await service.buildGraph([
            createDiffFile("src/app.ts", "+import { util } from \"./utils\";"),
            createDiffFile("src/utils.ts", "+import { core } from \"./core\";"),
            createDiffFile("src/core.ts", ""),
        ])

        const impact = await service.getImpact([FilePath.create("src/utils.ts")])

        const changedNode = impact.changedNodes[0]
        expect(changedNode).not.toBeUndefined()
        if (changedNode === undefined) {
            return
        }
        expect(changedNode.id).toBe("file:src/utils.ts")

        const affectedNodeIds = impact.affectedNodes.map((node) => node.id)
        expect(affectedNodeIds).toEqual([
            "file:src/app.ts",
            "file:src/utils.ts",
        ])
        expect(impact.impactRadius).toBe(1)
        expect(impact.breakingChanges).toHaveLength(0)
    })

    test("marks missing changed files as breaking changes", async () => {
        const service = new DependencyGraphService()
        await service.buildGraph([createDiffFile("src/index.ts", "")])

        const impact = await service.getImpact([FilePath.create("src/missing.ts")])

        const changedNode = impact.changedNodes[0]
        expect(changedNode).not.toBeUndefined()
        if (changedNode === undefined) {
            return
        }
        expect(changedNode.filePath).toBe("src/missing.ts")
        expect(impact.breakingChanges).toHaveLength(1)
        const breakingChange = impact.breakingChanges[0]
        expect(breakingChange).not.toBeUndefined()
        if (breakingChange === undefined) {
            return
        }
        expect(breakingChange.node.filePath).toBe("src/missing.ts")
        expect(breakingChange.reason).toBe("CHANGED_FILE_NOT_IN_GRAPH")
    })

    test("detects circular dependency", async () => {
        const service = new DependencyGraphService()
        await service.buildGraph([
            createDiffFile("src/a.ts", "+import { b } from \"./b\";"),
            createDiffFile("src/b.ts", "+import { a } from \"./a\";"),
        ])

        const cycles = await service.detectCircular()

        expect(cycles).toHaveLength(1)
        const cycle = cycles[0]
        expect(cycle).not.toBeUndefined()
        if (cycle === undefined) {
            return
        }

        expect(cycle.nodeA).toBe("file:src/a.ts")
        expect(cycle.nodeB).toBe("file:src/b.ts")
        expect(cycle.path).toEqual([
            "file:src/a.ts",
            "file:src/b.ts",
            "file:src/a.ts",
        ])
    })
})
