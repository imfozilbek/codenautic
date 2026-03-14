import {describe, expect, test} from "bun:test"

import type {ILogger} from "@codenautic/core"

import {
    BaseWorkerProcessor,
    type IWorkerProcessorJob,
    type IWorkerProcessorMetrics,
} from "../../src/worker"

/**
 * Captured log record.
 */
interface ILogEntry {
    /**
     * Log message.
     */
    readonly message: string

    /**
     * Structured context.
     */
    readonly context: Record<string, unknown> | undefined
}

/**
 * Logger double for processor tests.
 */
class RecordingLogger implements ILogger {
    public readonly infoLogs: ILogEntry[] = []
    public readonly warnLogs: ILogEntry[] = []
    public readonly errorLogs: ILogEntry[] = []
    public readonly debugLogs: ILogEntry[] = []

    /**
     * Records info message.
     */
    public info(message: string, context?: Record<string, unknown>): Promise<void> {
        this.infoLogs.push({
            message,
            context,
        })
        return Promise.resolve()
    }

    /**
     * Records warning message.
     */
    public warn(message: string, context?: Record<string, unknown>): Promise<void> {
        this.warnLogs.push({
            message,
            context,
        })
        return Promise.resolve()
    }

    /**
     * Records error message.
     */
    public error(message: string, context?: Record<string, unknown>): Promise<void> {
        this.errorLogs.push({
            message,
            context,
        })
        return Promise.resolve()
    }

    /**
     * Records debug message.
     */
    public debug(message: string, context?: Record<string, unknown>): Promise<void> {
        this.debugLogs.push({
            message,
            context,
        })
        return Promise.resolve()
    }

    /**
     * Returns same logger for child context.
     */
    public child(_context: Record<string, unknown>): ILogger {
        return this
    }
}

/**
 * Metrics double for processor tests.
 */
class RecordingMetrics implements IWorkerProcessorMetrics {
    public readonly processedJobTypes: string[] = []
    public readonly failedJobTypes: string[] = []
    public readonly durationRecords: Array<{
        readonly jobType: string
        readonly durationMs: number
    }> = []

    /**
     * Captures success metric.
     */
    public incrementProcessed(jobType: string): void {
        this.processedJobTypes.push(jobType)
    }

    /**
     * Captures failure metric.
     */
    public incrementFailed(jobType: string): void {
        this.failedJobTypes.push(jobType)
    }

    /**
     * Captures duration metric.
     */
    public recordDurationMs(jobType: string, durationMs: number): void {
        this.durationRecords.push({
            jobType,
            durationMs,
        })
    }
}

/**
 * Base processor test harness.
 */
class TestWorkerProcessor extends BaseWorkerProcessor {
    private readonly handler: (job: IWorkerProcessorJob) => Promise<void>

    /**
     * Creates test processor.
     *
     * @param options Processor options and handler.
     */
    public constructor(options: {
        readonly processorName: string
        readonly logger: ILogger
        readonly metrics?: IWorkerProcessorMetrics
        readonly now?: () => number
        readonly handler: (job: IWorkerProcessorJob) => Promise<void>
    }) {
        super({
            processorName: options.processorName,
            logger: options.logger,
            metrics: options.metrics,
            now: options.now,
        })
        this.handler = options.handler
    }

    /**
     * Delegates to scripted handler.
     */
    protected handle(job: IWorkerProcessorJob): Promise<void> {
        return this.handler(job)
    }
}

describe("BaseWorkerProcessor", () => {
    test("processes successful job with debug/info logging and success metrics", async () => {
        const logger = new RecordingLogger()
        const metrics = new RecordingMetrics()
        const now = createSequenceClock([
            100,
            145,
        ])
        const handledJobs: IWorkerProcessorJob[] = []
        const processor = new TestWorkerProcessor({
            processorName: "scan-processor",
            logger,
            metrics,
            now,
            handler: (job: IWorkerProcessorJob): Promise<void> => {
                handledJobs.push(job)
                return Promise.resolve()
            },
        })

        await processor.process({
            id: "job-1",
            type: "scan",
            payload: {
                repositoryId: "repo-1",
            },
            attempt: 1,
        })

        expect(handledJobs.length).toBe(1)
        expect(logger.debugLogs[0]?.message).toBe("Worker processor started")
        expect(logger.infoLogs[0]?.message).toBe("Worker processor completed")
        expect(logger.infoLogs[0]?.context).toEqual({
            processorName: "scan-processor",
            jobId: "job-1",
            jobType: "scan",
            durationMs: 45,
            attempt: 1,
        })
        expect(metrics.processedJobTypes).toEqual(["scan"])
        expect(metrics.failedJobTypes).toEqual([])
        expect(metrics.durationRecords).toEqual([
            {
                jobType: "scan",
                durationMs: 45,
            },
        ])
    })

    test("logs failures, records failure metrics, and rethrows processor error", async () => {
        const logger = new RecordingLogger()
        const metrics = new RecordingMetrics()
        const now = createSequenceClock([
            200,
            260,
        ])
        const processor = new TestWorkerProcessor({
            processorName: "scan-processor",
            logger,
            metrics,
            now,
            handler: (): Promise<void> => {
                return Promise.reject(new Error("processor-failed"))
            },
        })

        await expectPromiseRejectMessage(
            processor.process({
                id: "job-2",
                type: "scan",
                payload: {},
            }),
            "processor-failed",
        )

        expect(logger.errorLogs[0]?.message).toBe("Worker processor failed")
        expect(logger.errorLogs[0]?.context).toEqual({
            processorName: "scan-processor",
            jobId: "job-2",
            jobType: "scan",
            attempt: undefined,
            durationMs: 60,
            errorMessage: "processor-failed",
        })
        expect(metrics.processedJobTypes).toEqual([])
        expect(metrics.failedJobTypes).toEqual(["scan"])
        expect(metrics.durationRecords).toEqual([
            {
                jobType: "scan",
                durationMs: 60,
            },
        ])
    })

    test("supports direct onFailed invocation without duration", async () => {
        const logger = new RecordingLogger()
        const metrics = new RecordingMetrics()
        const processor = new TestWorkerProcessor({
            processorName: "scan-processor",
            logger,
            metrics,
            handler: (): Promise<void> => Promise.resolve(),
        })

        await processor.onFailed(
            {
                id: "job-3",
                type: "scan",
                payload: {},
            },
            new Error("manual-failure"),
        )

        expect(logger.errorLogs[0]?.context).toEqual({
            processorName: "scan-processor",
            jobId: "job-3",
            jobType: "scan",
            attempt: undefined,
            durationMs: undefined,
            errorMessage: "manual-failure",
        })
        expect(metrics.failedJobTypes).toEqual(["scan"])
        expect(metrics.durationRecords).toEqual([])
    })

    test("validates processor name and job identity fields", async () => {
        const logger = new RecordingLogger()
        expect(
            () =>
                new TestWorkerProcessor({
                    processorName: " ",
                    logger,
                    handler: (): Promise<void> => Promise.resolve(),
                }),
        ).toThrow("processorName must be a non-empty string")

        const processor = new TestWorkerProcessor({
            processorName: "scan-processor",
            logger,
            handler: (): Promise<void> => Promise.resolve(),
        })

        await expectPromiseRejectMessage(
            processor.process({
                id: " ",
                type: "scan",
                payload: {},
            }),
            "job.id must be a non-empty string",
        )
        await expectPromiseRejectMessage(
            processor.process({
                id: "job-4",
                type: " ",
                payload: {},
            }),
            "job.type must be a non-empty string",
        )
    })
})

/**
 * Creates sequence clock for deterministic duration tests.
 *
 * @param values Sequence of timestamps.
 * @returns Clock function.
 */
function createSequenceClock(values: readonly number[]): () => number {
    const fallbackValue = values[values.length - 1]
    if (fallbackValue === undefined) {
        throw new Error("values must contain at least one timestamp")
    }

    let cursor = 0
    return (): number => {
        const value = values[cursor] ?? fallbackValue
        cursor += 1
        return value
    }
}

/**
 * Asserts that promise rejects with exact message.
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
