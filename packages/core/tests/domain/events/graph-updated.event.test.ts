import {describe, expect, test} from "bun:test"

import {GraphUpdated} from "../../../src/domain/events/graph-updated"

describe("GraphUpdated event", () => {
    test("resolves event name and immutable payload", () => {
        const event = new GraphUpdated("gh:repo-1", [
            "file:src/index.ts",
            "file:src/utils.ts",
        ])

        expect(event.eventName).toBe("GraphUpdated")
        expect(event.aggregateId).toBe("gh:repo-1")
        expect(event.payload).toEqual({
            repositoryId: "gh:repo-1",
            changedNodeIds: ["file:src/index.ts", "file:src/utils.ts"],
        })
    })
})
