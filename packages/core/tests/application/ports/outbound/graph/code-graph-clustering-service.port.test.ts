import {describe, expect, test} from "bun:test"

import {
    CODE_GRAPH_EDGE_TYPE,
    CODE_GRAPH_NODE_TYPE,
    type ICodeGraph,
    type ICodeGraphClusteringInput,
    type ICodeGraphClusteringResult,
    type ICodeGraphClusteringService,
} from "../../../../../src"

class InMemoryCodeGraphClusteringService implements ICodeGraphClusteringService {
    public detectCommunities(
        input: ICodeGraphClusteringInput,
    ): Promise<ICodeGraphClusteringResult> {
        const filePaths = input.filePaths ?? input.graph.nodes
            .filter((node) => node.type === CODE_GRAPH_NODE_TYPE.FILE)
            .map((node) => node.filePath)
        const normalized = [...new Set(filePaths)].sort()
        const grouped = new Map<string, string[]>()

        for (const filePath of normalized) {
            const groupKey = filePath.split("/")[0] ?? "root"
            const bucket = grouped.get(groupKey)

            if (bucket === undefined) {
                grouped.set(groupKey, [filePath])
                continue
            }

            bucket.push(filePath)
        }

        const communities = [...grouped.entries()]
            .sort((left, right) => left[0].localeCompare(right[0]))
            .map(([groupKey, members], index) => {
                return {
                    id: `community-${String(index + 1).padStart(3, "0")}`,
                    filePaths: members,
                    intraCommunityEdgeWeight: Math.max(0, members.length - 1),
                    totalIncidentEdgeWeight: members.length,
                    metadata: {
                        groupKey,
                    },
                }
            })
            .map(({metadata: _metadata, ...community}) => community)

        return Promise.resolve({
            communities,
            modularity: communities.length === 0 ? 0 : 1 / communities.length,
        })
    }
}

describe("ICodeGraphClusteringService contract", () => {
    test("detects deterministic communities for requested file subset", async () => {
        const service = new InMemoryCodeGraphClusteringService()
        const clustering = await service.detectCommunities({
            graph: createGraph(),
            filePaths: [
                "tests/index.test.ts",
                "src/utils.ts",
                "src/index.ts",
            ],
            resolution: 1.2,
            iterations: 15,
        })

        expect(clustering.communities).toEqual([
            {
                id: "community-001",
                filePaths: [
                    "src/index.ts",
                    "src/utils.ts",
                ],
                intraCommunityEdgeWeight: 1,
                totalIncidentEdgeWeight: 2,
            },
            {
                id: "community-002",
                filePaths: ["tests/index.test.ts"],
                intraCommunityEdgeWeight: 0,
                totalIncidentEdgeWeight: 1,
            },
        ])
        expect(clustering.modularity).toBe(0.5)
    })

    test("falls back to file nodes from graph when subset is omitted", async () => {
        const service = new InMemoryCodeGraphClusteringService()
        const clustering = await service.detectCommunities({
            graph: createGraph(),
        })

        expect(clustering.communities).toHaveLength(2)
        expect(clustering.communities[0]?.filePaths).toEqual([
            "src/index.ts",
            "src/utils.ts",
        ])
        expect(clustering.communities[1]?.filePaths).toEqual(["tests/index.test.ts"])
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
            {
                id: "file:tests/index.test.ts",
                type: CODE_GRAPH_NODE_TYPE.FILE,
                name: "index.test.ts",
                filePath: "tests/index.test.ts",
            },
        ],
        edges: [
            {
                source: "file:src/index.ts",
                target: "file:src/utils.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
            {
                source: "file:tests/index.test.ts",
                target: "file:src/index.ts",
                type: CODE_GRAPH_EDGE_TYPE.IMPORTS,
            },
        ],
    }
}
