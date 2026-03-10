import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type ICodeGraph,
    type ICodeGraphPageRankInput,
    type ICodeGraphPageRankService,
    type IHotspotMetric,
} from "../../../../../src"

class InMemoryCodeGraphPageRankService implements ICodeGraphPageRankService {
    public calculateHotspots(input: ICodeGraphPageRankInput): Promise<readonly IHotspotMetric[]> {
        const filePaths = input.filePaths ?? input.graph.nodes
            .filter((node) => node.type === CODE_GRAPH_NODE_TYPE.FILE)
            .map((node) => node.filePath)

        return Promise.resolve(
            [...filePaths].sort().map((filePath, index, items) => {
                return {
                    filePath,
                    score: items.length - index,
                }
            }),
        )
    }
}

describe("ICodeGraphPageRankService contract", () => {
    test("calculates hotspot metrics for requested file subset", async () => {
        const service = new InMemoryCodeGraphPageRankService()
        const hotspots = await service.calculateHotspots({
            graph: createGraph(),
            filePaths: ["src/utils.ts", "src/index.ts"],
            dampingFactor: 0.9,
            iterations: 30,
        })

        expect(hotspots).toEqual([
            {
                filePath: "src/index.ts",
                score: 2,
            },
            {
                filePath: "src/utils.ts",
                score: 1,
            },
        ])
    })

    test("falls back to graph file nodes when file subset is omitted", async () => {
        const service = new InMemoryCodeGraphPageRankService()
        const hotspots = await service.calculateHotspots({
            graph: createGraph(),
        })

        expect(hotspots).toHaveLength(2)
        expect(hotspots[0]?.filePath).toBe("src/index.ts")
        expect(hotspots[1]?.filePath).toBe("src/utils.ts")
    })
})

/**
 * Creates minimal deterministic graph fixture.
 *
 * @returns Graph fixture.
 */
function createGraph(): ICodeGraph {
    return {
        nodes: [
            {
                id: "file:src/index.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "index.ts",
                filePath: "src/index.ts",
            },
            {
                id: "file:src/utils.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "utils.ts",
                filePath: "src/utils.ts",
            },
        ],
        edges: [
            {
                source: "file:src/index.ts",
                target: "file:src/utils.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ],
    }
}
