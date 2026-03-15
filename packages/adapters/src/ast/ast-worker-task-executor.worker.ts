import {parentPort, threadId, workerData} from "node:worker_threads"

import {AstParserFactory} from "./ast-parser.factory"

interface IAstWorkerTaskExecutorWorkerData {
    readonly filePath: string
    readonly content: string
    readonly language: string
}

interface IAstWorkerTaskExecutorWorkerSuccessMessage {
    readonly ok: true
    readonly workerThreadId: number
    readonly parsedFile: unknown
}

interface IAstWorkerTaskExecutorWorkerFailureMessage {
    readonly ok: false
    readonly reason: string
}

/**
 * Executes one parser task in worker context.
 *
 * @param workerPayload Normalized worker payload.
 * @returns Worker success message payload.
 */
async function executeWorkerTask(
    workerPayload: IAstWorkerTaskExecutorWorkerData,
): Promise<IAstWorkerTaskExecutorWorkerSuccessMessage> {
    const parserFactory = new AstParserFactory()
    const parser = parserFactory.create(workerPayload.language)
    const parsedFile = await parser.parse({
        filePath: workerPayload.filePath,
        content: workerPayload.content,
    })

    return {
        ok: true,
        parsedFile,
        workerThreadId: threadId,
    }
}

/**
 * Normalizes unknown worker payload.
 *
 * @param candidate Raw worker payload.
 * @returns Normalized worker payload.
 */
function normalizeWorkerPayload(candidate: unknown): IAstWorkerTaskExecutorWorkerData {
    if (isRecord(candidate) === false) {
        throw new Error("Worker payload must be an object")
    }

    return {
        filePath: readStringField(candidate, "filePath"),
        content: readStringField(candidate, "content"),
        language: readStringField(candidate, "language"),
    }
}

/**
 * Runs worker handler and posts one normalized response message.
 */
async function runWorker(): Promise<void> {
    if (parentPort === null) {
        return
    }

    try {
        const workerPayload = normalizeWorkerPayload(workerData)
        const successMessage = await executeWorkerTask(workerPayload)
        parentPort.postMessage(successMessage)
    } catch (error) {
        const failureMessage: IAstWorkerTaskExecutorWorkerFailureMessage = {
            ok: false,
            reason: resolveFailureReason(error),
        }
        parentPort.postMessage(failureMessage)
    }
}

/**
 * Returns stable failure reason text.
 *
 * @param error Unknown thrown value.
 * @returns Stable reason text.
 */
function resolveFailureReason(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === "string") {
        return error
    }

    return "Unknown worker failure"
}

/**
 * Reads one string field from unknown record.
 *
 * @param record Unknown record.
 * @param fieldName Field name.
 * @returns Normalized string value.
 */
function readStringField(record: Record<string, unknown>, fieldName: string): string {
    const value = record[fieldName]

    if (typeof value !== "string") {
        throw new Error(`Worker payload field must be a string: ${fieldName}`)
    }

    return value
}

/**
 * Type-guard for object records.
 *
 * @param candidate Unknown candidate.
 * @returns True when candidate is object record.
 */
function isRecord(candidate: unknown): candidate is Record<string, unknown> {
    return typeof candidate === "object" && candidate !== null
}

void runWorker()
