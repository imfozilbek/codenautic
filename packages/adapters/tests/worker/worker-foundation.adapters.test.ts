import {describe, expect, test} from "bun:test"

import {
    WORKER_ADAPTER_ERROR_CODE,
    WORKER_ENQUEUE_STATUS,
    InMemoryWorkerQueueAdapter,
    WorkerProcessorRegistryAdapter,
} from "../../src/worker"

describe("InMemoryWorkerQueueAdapter", () => {
    test("enqueues jobs and dequeues in FIFO order", () => {
        let callCount = 0
        const queue = new InMemoryWorkerQueueAdapter(() => {
            callCount += 1
            return new Date(`2026-03-03T12:00:0${callCount}.000Z`)
        })

        const first = queue.enqueue({
            id: "job-1",
            type: "scan",
            payload: {
                repositoryId: "repo-1",
            },
        })
        const second = queue.enqueue({
            id: "job-2",
            type: "review",
            payload: {
                repositoryId: "repo-2",
            },
        })

        expect(first.isOk).toBe(true)
        expect(second.isOk).toBe(true)
        if (first.isFail || second.isFail) {
            throw new Error("Expected successful enqueue")
        }

        expect(first.value.status).toBe(WORKER_ENQUEUE_STATUS.ENQUEUED)
        expect(second.value.status).toBe(WORKER_ENQUEUE_STATUS.ENQUEUED)
        expect(queue.size()).toBe(2)

        const firstDequeued = queue.dequeue()
        const secondDequeued = queue.dequeue()
        const none = queue.dequeue()

        expect(firstDequeued?.id).toBe("job-1")
        expect(secondDequeued?.id).toBe("job-2")
        expect(none).toBeUndefined()
        expect(queue.size()).toBe(0)
    })

    test("returns duplicate status for repeated id", () => {
        const queue = new InMemoryWorkerQueueAdapter(
            () => new Date("2026-03-03T12:10:00.000Z"),
        )

        const first = queue.enqueue({
            id: "job-duplicate",
            type: "scan",
            payload: {
                reviewId: "rev-1",
            },
        })
        const second = queue.enqueue({
            id: "job-duplicate",
            type: "scan",
            payload: {
                reviewId: "rev-changed",
            },
        })

        expect(first.isOk).toBe(true)
        expect(second.isOk).toBe(true)
        if (first.isFail || second.isFail) {
            throw new Error("Expected successful enqueue")
        }

        expect(first.value.status).toBe(WORKER_ENQUEUE_STATUS.ENQUEUED)
        expect(second.value.status).toBe(WORKER_ENQUEUE_STATUS.DUPLICATE)
        expect(second.value.job.payload).toEqual({
            reviewId: "rev-1",
        })
        expect(queue.size()).toBe(1)
    })

    test("dequeues by type filter and handles empty filter", () => {
        const queue = new InMemoryWorkerQueueAdapter(
            () => new Date("2026-03-03T12:20:00.000Z"),
        )
        void queue.enqueue({
            id: "job-scan",
            type: "scan",
            payload: {},
        })
        void queue.enqueue({
            id: "job-review",
            type: "review",
            payload: {},
        })

        const filtered = queue.dequeue("review")
        const invalidFilter = queue.dequeue(" ")
        const remaining = queue.dequeue()

        expect(filtered?.id).toBe("job-review")
        expect(invalidFilter).toBeUndefined()
        expect(remaining?.id).toBe("job-scan")
    })

    test("validates enqueue request payload", () => {
        const queue = new InMemoryWorkerQueueAdapter()

        const invalidId = queue.enqueue({
            id: " ",
            type: "scan",
            payload: {},
        })
        const invalidType = queue.enqueue({
            id: "job-invalid-type",
            type: " ",
            payload: {},
        })
        const invalidPayload = queue.enqueue({
            id: "job-invalid-payload",
            type: "scan",
            payload: [] as unknown as Readonly<Record<string, unknown>>,
        })

        expect(invalidId.isFail).toBe(true)
        expect(invalidType.isFail).toBe(true)
        expect(invalidPayload.isFail).toBe(true)
        if (invalidId.isOk || invalidType.isOk || invalidPayload.isOk) {
            throw new Error("Expected invalid enqueue errors")
        }

        expect(invalidId.error.code).toBe(WORKER_ADAPTER_ERROR_CODE.INVALID_JOB)
        expect(invalidType.error.code).toBe(WORKER_ADAPTER_ERROR_CODE.INVALID_JOB)
        expect(invalidPayload.error.code).toBe(WORKER_ADAPTER_ERROR_CODE.INVALID_JOB)
    })
})

describe("WorkerProcessorRegistryAdapter", () => {
    test("registers and resolves processor by type", async () => {
        const registry = new WorkerProcessorRegistryAdapter()
        let invoked = false

        const registerResult = registry.register("scan", (_payload) => {
            invoked = true
        })
        expect(registerResult.isOk).toBe(true)

        const processor = registry.resolve("scan")
        if (processor === undefined) {
            throw new Error("Expected processor to be resolved")
        }

        await processor({
            repositoryId: "repo-1",
        })
        expect(invoked).toBe(true)
    })

    test("rejects duplicate processor registration", () => {
        const registry = new WorkerProcessorRegistryAdapter()

        const first = registry.register("review", (_payload) => {
            return
        })
        const duplicate = registry.register("review", (_payload) => {
            return
        })

        expect(first.isOk).toBe(true)
        expect(duplicate.isFail).toBe(true)
        if (duplicate.isOk) {
            throw new Error("Expected duplicate registration failure")
        }

        expect(duplicate.error.code).toBe(
            WORKER_ADAPTER_ERROR_CODE.PROCESSOR_ALREADY_REGISTERED,
        )
    })

    test("validates processor type and resolve behavior", () => {
        const registry = new WorkerProcessorRegistryAdapter()

        const invalidType = registry.register(" ", (_payload) => {
            return
        })
        const missing = registry.resolve("unknown")
        const invalidResolve = registry.resolve(" ")

        expect(invalidType.isFail).toBe(true)
        if (invalidType.isOk) {
            throw new Error("Expected invalid type failure")
        }

        expect(invalidType.error.code).toBe(WORKER_ADAPTER_ERROR_CODE.INVALID_JOB)
        expect(missing).toBeUndefined()
        expect(invalidResolve).toBeUndefined()
    })
})
