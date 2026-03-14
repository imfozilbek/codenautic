import {describe, expect, test} from "bun:test"

import type {ConnectionOptions, JobType} from "bullmq"

import {
    BullMqQueueService,
    MAX_WORKER_QUEUE_PRIORITY,
    WORKER_QUEUE_JOB_STATUS,
    type IBullMqQueueFactoryOptions,
    type IBullMqQueueInstance,
    type IBullMqQueueJob,
} from "../../src/worker"

/**
 * In-memory queue job double.
 */
class InMemoryQueueJob implements IBullMqQueueJob {
    public readonly id: string | number | undefined
    public readonly name: string
    public readonly data: unknown
    public readonly priority: number | undefined
    private readonly state: string
    private removed = false

    /**
     * Creates queue job.
     *
     * @param options Job fields.
     */
    public constructor(options: {
        readonly id: string
        readonly name: string
        readonly data: unknown
        readonly priority?: number
        readonly state: string
    }) {
        this.id = options.id
        this.name = options.name
        this.data = options.data
        this.priority = options.priority
        this.state = options.state
    }

    /**
     * Removes job from queue.
     */
    public remove(): Promise<void> {
        this.removed = true
        return Promise.resolve()
    }

    /**
     * Returns scripted job state.
     */
    public getState(): Promise<string> {
        return Promise.resolve(this.state)
    }

    /**
     * Returns scripted state synchronously.
     *
     * @returns State string.
     */
    public getStateSync(): string {
        return this.state
    }

    /**
     * Returns removed flag.
     *
     * @returns True when removed.
     */
    public isRemoved(): boolean {
        return this.removed
    }
}

/**
 * In-memory queue double.
 */
class InMemoryQueue implements IBullMqQueueInstance {
    public readonly addCalls: Array<{
        readonly name: string
        readonly data: {
            readonly type: string
            readonly payload: unknown
        }
        readonly options:
            | {
                  readonly priority?: number
              }
            | undefined
    }> = []
    private readonly jobs = new Map<string, InMemoryQueueJob>()
    private nextId = 1

    /**
     * Adds job to queue.
     *
     * @param name Job name.
     * @param data Job payload.
     * @param options Optional add options.
     * @returns Created job.
     */
    public add(
        name: string,
        data: {
            readonly type: string
            readonly payload: unknown
        },
        options?: {
            readonly priority?: number
        },
    ): Promise<IBullMqQueueJob> {
        const id = `${this.nextId}`
        this.nextId += 1
        const job = new InMemoryQueueJob({
            id,
            name,
            data,
            priority: options?.priority,
            state: options?.priority === undefined ? "waiting" : "prioritized",
        })
        this.jobs.set(id, job)
        this.addCalls.push({
            name,
            data,
            options,
        })
        return Promise.resolve(job)
    }

    /**
     * Returns queue jobs filtered by states.
     *
     * @param states Allowed states.
     * @param start Start index.
     * @param end End index.
     * @returns Filtered jobs.
     */
    public getJobs(
        states: readonly JobType[],
        start: number,
        end: number,
    ): Promise<readonly IBullMqQueueJob[]> {
        const allowedStates = new Set<string>(states)
        const matchedJobs = [...this.jobs.values()].filter((job): boolean => {
            if (job.isRemoved()) {
                return false
            }

            return allowedStates.has(this.getJobState(job))
        })

        return Promise.resolve(matchedJobs.slice(start, end + 1))
    }

    /**
     * Returns job by id.
     *
     * @param jobId Job id.
     * @returns Job or null.
     */
    public getJob(jobId: string): Promise<IBullMqQueueJob | null> {
        const job = this.jobs.get(jobId)
        if (job === undefined || job.isRemoved()) {
            return Promise.resolve(null)
        }

        return Promise.resolve(job)
    }

    /**
     * Seeds one job with explicit state.
     *
     * @param options Seed options.
     * @returns Created job id.
     */
    public seedJob(options: {
        readonly id: string
        readonly state: string
        readonly data: unknown
        readonly priority?: number
    }): string {
        const job = new InMemoryQueueJob({
            id: options.id,
            name: "seed",
            data: options.data,
            state: options.state,
            priority: options.priority,
        })
        this.jobs.set(options.id, job)
        return options.id
    }

    /**
     * Returns current state for job.
     *
     * @param job Queue job.
     * @returns State string.
     */
    private getJobState(job: InMemoryQueueJob): string {
        return job.getStateSync()
    }
}

describe("BullMqQueueService", () => {
    test("enqueues jobs with priority mapping where higher app priority is sooner", async () => {
        const queue = new InMemoryQueue()
        const service = createQueueService(queue)

        const jobId = await service.enqueue({
            type: "scan-repository",
            payload: {
                repositoryId: "repo-1",
            },
            priority: 10,
        })

        expect(jobId).toBe("1")
        expect(queue.addCalls[0]).toEqual({
            name: "scan-repository",
            data: {
                type: "scan-repository",
                payload: {
                    repositoryId: "repo-1",
                },
            },
            options: {
                priority: MAX_WORKER_QUEUE_PRIORITY - 10 + 1,
            },
        })
    })

    test("dequeues pending jobs and returns normalized payload and priority", async () => {
        const queue = new InMemoryQueue()
        const service = createQueueService(queue)

        await service.enqueue({
            type: "scan-repository",
            payload: {
                repositoryId: "repo-1",
            },
        })
        await service.enqueue({
            type: "scan-repository",
            payload: {
                repositoryId: "repo-2",
            },
            priority: 25,
        })

        const dequeuedJobs = await service.dequeue(2)

        expect(dequeuedJobs).toEqual([
            {
                id: "1",
                type: "scan-repository",
                payload: {
                    repositoryId: "repo-1",
                },
                priority: undefined,
            },
            {
                id: "2",
                type: "scan-repository",
                payload: {
                    repositoryId: "repo-2",
                },
                priority: 25,
            },
        ])
        expect(await service.getStatus("1")).toBeNull()
        expect(await service.getStatus("2")).toBeNull()
    })

    test("maps queue job status values and returns null for unknown job", async () => {
        const queue = new InMemoryQueue()
        const service = createQueueService(queue)

        queue.seedJob({
            id: "w",
            state: "waiting",
            data: {
                type: "scan",
                payload: {},
            },
        })
        queue.seedJob({
            id: "p",
            state: "prioritized",
            data: {
                type: "scan",
                payload: {},
            },
            priority: MAX_WORKER_QUEUE_PRIORITY - 7 + 1,
        })
        queue.seedJob({
            id: "a",
            state: "active",
            data: {
                type: "scan",
                payload: {},
            },
        })
        queue.seedJob({
            id: "u",
            state: "weird-custom-state",
            data: {
                type: "scan",
                payload: {},
            },
        })

        expect(await service.getStatus("w")).toBe(WORKER_QUEUE_JOB_STATUS.Waiting)
        expect(await service.getStatus("p")).toBe(WORKER_QUEUE_JOB_STATUS.Prioritized)
        expect(await service.getStatus("a")).toBe(WORKER_QUEUE_JOB_STATUS.Active)
        expect(await service.getStatus("u")).toBe(WORKER_QUEUE_JOB_STATUS.Unknown)
        expect(await service.getStatus("missing")).toBeNull()
    })

    test("validates queue options and operation inputs", async () => {
        expect(
            () =>
                new BullMqQueueService({
                    queueName: " ",
                    connection: createConnectionOptions(),
                }),
        ).toThrow("queueName must be a non-empty string")

        const queue = new InMemoryQueue()
        const service = createQueueService(queue)

        await expectPromiseRejectMessage(
            service.enqueue({
                type: " ",
                payload: {},
            }),
            "queueName must be a non-empty string",
        )
        await expectPromiseRejectMessage(service.dequeue(0), "limit must be greater than zero")
        await expectPromiseRejectMessage(service.getStatus(" "), "jobId must be a non-empty string")
        await expectPromiseRejectMessage(
            service.enqueue({
                type: "scan",
                payload: {},
                priority: MAX_WORKER_QUEUE_PRIORITY + 1,
            }),
            `priority must be less or equal to ${MAX_WORKER_QUEUE_PRIORITY}`,
        )
    })

    test("rejects dequeue when queued payload has invalid envelope structure", async () => {
        const queue = new InMemoryQueue()
        queue.seedJob({
            id: "broken",
            state: "waiting",
            data: "not-an-object",
        })
        const service = createQueueService(queue)

        await expectPromiseRejectMessage(
            service.dequeue(1),
            "Queue payload must be an object with type and payload fields",
        )
    })
})

/**
 * Creates queue service for tests.
 *
 * @param queue Queue double.
 * @returns Queue service.
 */
function createQueueService(queue: IBullMqQueueInstance): BullMqQueueService {
    return new BullMqQueueService({
        queueName: "review-jobs",
        connection: createConnectionOptions(),
        queueFactory: (_options: IBullMqQueueFactoryOptions): IBullMqQueueInstance => queue,
    })
}

/**
 * Creates test connection options.
 *
 * @returns Redis connection options.
 */
function createConnectionOptions(): ConnectionOptions {
    return {
        host: "127.0.0.1",
        port: 6379,
    }
}

/**
 * Asserts rejected promise message.
 *
 * @param promise Promise expected to reject.
 * @param expectedMessage Expected message.
 */
async function expectPromiseRejectMessage(
    promise: Promise<unknown>,
    expectedMessage: string,
): Promise<void> {
    try {
        await promise
        throw new Error("Expected promise to reject")
    } catch (error: unknown) {
        if (error instanceof Error) {
            expect(error.message).toBe(expectedMessage)
            return
        }

        throw error
    }
}
