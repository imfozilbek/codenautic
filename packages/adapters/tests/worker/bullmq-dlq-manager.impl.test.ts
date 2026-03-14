import {describe, expect, test} from "bun:test"

import type {ConnectionOptions} from "bullmq"

import {
    BullMqDlqManager,
    DEFAULT_WORKER_DLQ_MAX_ATTEMPTS,
    type IBullMqDlqJob,
    type IBullMqDlqManagerQueueEventsFactoryOptions,
    type IBullMqDlqQueueFactoryOptions,
    type IBullMqDlqQueueInstance,
    type IBullMqQueueEventsInstance,
    type IWorkerDlqAlert,
} from "../../src/worker"

/**
 * In-memory failed job double.
 */
class InMemoryDlqJob implements IBullMqDlqJob {
    public readonly id: string | number | undefined
    public readonly name: string
    public readonly data: unknown
    public readonly attemptsMade: number
    public readonly failedReason: string
    private retryCalls = 0

    /**
     * Creates failed job double.
     *
     * @param options Job fields.
     */
    public constructor(options: {
        readonly id: string
        readonly name: string
        readonly data: unknown
        readonly attemptsMade: number
        readonly failedReason: string
    }) {
        this.id = options.id
        this.name = options.name
        this.data = options.data
        this.attemptsMade = options.attemptsMade
        this.failedReason = options.failedReason
    }

    /**
     * Marks retry invocation.
     */
    public retry(): Promise<void> {
        this.retryCalls += 1
        return Promise.resolve()
    }

    /**
     * Returns number of retry invocations.
     *
     * @returns Retry call count.
     */
    public getRetryCalls(): number {
        return this.retryCalls
    }
}

/**
 * In-memory queue with failed jobs.
 */
class InMemoryDlqQueue implements IBullMqDlqQueueInstance {
    private readonly jobs = new Map<string, InMemoryDlqJob>()

    /**
     * Seeds one job in queue.
     *
     * @param job Job to seed.
     */
    public seed(job: InMemoryDlqJob): void {
        const jobId = job.id
        if (jobId === undefined) {
            return
        }
        this.jobs.set(`${jobId}`, job)
    }

    /**
     * Returns job by id.
     *
     * @param jobId Job id.
     * @returns Job or null.
     */
    public getJob(jobId: string): Promise<IBullMqDlqJob | null> {
        const job = this.jobs.get(jobId)
        return Promise.resolve(job ?? null)
    }
}

/**
 * Scriptable queue-events double.
 */
class FakeQueueEvents implements IBullMqQueueEventsInstance {
    private readonly failedHandlers = new Set<
        (payload: {readonly jobId: string; readonly failedReason: string}) => void
    >()
    private closed = false

    /**
     * Registers failed-event listener.
     *
     * @param event Event name.
     * @param handler Event listener.
     */
    public on(
        event: "failed",
        handler: (payload: {readonly jobId: string; readonly failedReason: string}) => void,
    ): void {
        if (event === "failed") {
            this.failedHandlers.add(handler)
        }
    }

    /**
     * Removes failed-event listener.
     *
     * @param event Event name.
     * @param handler Event listener.
     */
    public off(
        event: "failed",
        handler: (payload: {readonly jobId: string; readonly failedReason: string}) => void,
    ): void {
        if (event === "failed") {
            this.failedHandlers.delete(handler)
        }
    }

    /**
     * Closes queue events.
     */
    public close(): Promise<void> {
        this.closed = true
        return Promise.resolve()
    }

    /**
     * Emits failed event.
     *
     * @param payload Failed payload.
     */
    public emitFailed(payload: {readonly jobId: string; readonly failedReason: string}): void {
        for (const handler of this.failedHandlers.values()) {
            handler(payload)
        }
    }

    /**
     * Returns number of active failed listeners.
     *
     * @returns Listener count.
     */
    public failedListenerCount(): number {
        return this.failedHandlers.size
    }

    /**
     * Returns close flag.
     *
     * @returns True when closed.
     */
    public isClosed(): boolean {
        return this.closed
    }
}

describe("BullMqDlqManager", () => {
    test("raises alert when failed job reaches max attempts threshold", async () => {
        const queue = new InMemoryDlqQueue()
        const job = new InMemoryDlqJob({
            id: "job-1",
            name: "scan",
            data: {
                type: "scan",
                payload: {
                    repositoryId: "repo-1",
                },
            },
            attemptsMade: DEFAULT_WORKER_DLQ_MAX_ATTEMPTS,
            failedReason: "timeout",
        })
        queue.seed(job)
        const queueEvents = new FakeQueueEvents()
        const alerts: IWorkerDlqAlert[] = []
        const manager = createManager({
            queue,
            queueEvents,
            onDlqEntry: (alert: IWorkerDlqAlert): Promise<void> => {
                alerts.push(alert)
                return Promise.resolve()
            },
        })

        await manager.start()
        expect(queueEvents.failedListenerCount()).toBe(1)

        queueEvents.emitFailed({
            jobId: "job-1",
            failedReason: "timeout",
        })
        await waitUntil(
            () => alerts.length === 1,
            "Expected DLQ alert to be emitted",
        )

        expect(alerts).toEqual([
            {
                jobId: "job-1",
                jobType: "scan",
                payload: {
                    repositoryId: "repo-1",
                },
                attemptsMade: DEFAULT_WORKER_DLQ_MAX_ATTEMPTS,
                failedReason: "timeout",
                queueName: "review-jobs",
            },
        ])

        await manager.stop()
        expect(queueEvents.failedListenerCount()).toBe(0)
        expect(queueEvents.isClosed()).toBe(true)
    })

    test("does not raise alert before reaching max attempts", async () => {
        const queue = new InMemoryDlqQueue()
        queue.seed(
            new InMemoryDlqJob({
                id: "job-2",
                name: "scan",
                data: {},
                attemptsMade: 2,
                failedReason: "retrying",
            }),
        )
        const queueEvents = new FakeQueueEvents()
        const alerts: IWorkerDlqAlert[] = []
        const manager = createManager({
            queue,
            queueEvents,
            onDlqEntry: (alert: IWorkerDlqAlert): Promise<void> => {
                alerts.push(alert)
                return Promise.resolve()
            },
        })

        await manager.start()
        queueEvents.emitFailed({
            jobId: "job-2",
            failedReason: "retrying",
        })
        await flushMicrotasks()

        expect(alerts).toEqual([])
    })

    test("retries failed jobs via manual retry API", async () => {
        const queue = new InMemoryDlqQueue()
        const failedJob = new InMemoryDlqJob({
            id: "job-3",
            name: "review",
            data: {},
            attemptsMade: DEFAULT_WORKER_DLQ_MAX_ATTEMPTS,
            failedReason: "failed",
        })
        queue.seed(failedJob)
        const manager = createManager({
            queue,
            queueEvents: new FakeQueueEvents(),
        })

        expect(await manager.retry("job-3")).toBe(true)
        expect(failedJob.getRetryCalls()).toBe(1)
        expect(await manager.retry("missing")).toBe(false)
    })

    test("validates manager options", () => {
        expect(
            () =>
                new BullMqDlqManager({
                    queueName: " ",
                    connection: createConnectionOptions(),
                }),
        ).toThrow("queueName must be a non-empty string")

        expect(
            () =>
                new BullMqDlqManager({
                    queueName: "review-jobs",
                    connection: createConnectionOptions(),
                    maxAttempts: 0,
                }),
        ).toThrow("maxAttempts must be greater than zero")
    })
})

/**
 * Creates DLQ manager with test doubles.
 *
 * @param options Test options.
 * @returns DLQ manager.
 */
function createManager(options: {
    readonly queue: IBullMqDlqQueueInstance
    readonly queueEvents: FakeQueueEvents
    readonly onDlqEntry?: (alert: IWorkerDlqAlert) => Promise<void>
}): BullMqDlqManager {
    return new BullMqDlqManager({
        queueName: "review-jobs",
        connection: createConnectionOptions(),
        queueFactory: (
            _factoryOptions: IBullMqDlqQueueFactoryOptions,
        ): IBullMqDlqQueueInstance => {
            return options.queue
        },
        queueEventsFactory: (
            _factoryOptions: IBullMqDlqManagerQueueEventsFactoryOptions,
        ): IBullMqQueueEventsInstance => {
            return options.queueEvents
        },
        onDlqEntry: options.onDlqEntry,
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
 * Waits until predicate is true.
 *
 * @param predicate Condition predicate.
 * @param message Error message on timeout.
 */
async function waitUntil(
    predicate: () => boolean,
    message: string,
): Promise<void> {
    const maxAttempts = 30
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (predicate()) {
            return
        }

        await Promise.resolve()
    }

    throw new Error(message)
}

/**
 * Flushes pending microtasks.
 */
async function flushMicrotasks(): Promise<void> {
    const ticks = 5
    for (let tick = 0; tick < ticks; tick += 1) {
        await Promise.resolve()
    }
}
