import {randomUUID} from "node:crypto"

import {
    LANGSMITH_TRACER_ERROR_CODE,
    LangSmithTracerError,
} from "./langsmith-tracer.error"

const DEFAULT_PROJECT_NAME = "codenautic"

/**
 * Minimal LangSmith client contract used by tracer.
 */
export interface ILangSmithClient {
    /**
     * Creates LangSmith run.
     *
     * @param payload Run payload.
     * @returns Completion promise.
     */
    createRun(payload: ILangSmithCreateRunPayload): Promise<void>

    /**
     * Updates existing LangSmith run.
     *
     * @param runId Run identifier.
     * @param payload Update payload.
     * @returns Completion promise.
     */
    updateRun(runId: string, payload: ILangSmithUpdateRunPayload): Promise<void>
}

/**
 * Run creation payload expected by LangSmith client.
 */
export interface ILangSmithCreateRunPayload {
    /**
     * Stable run identifier.
     */
    readonly id: string

    /**
     * Human-readable run name.
     */
    readonly name: string

    /**
     * LangSmith run type.
     */
    readonly run_type: "llm"

    /**
     * Trace project name.
     */
    readonly project_name: string

    /**
     * Run start timestamp.
     */
    readonly start_time: string

    /**
     * Request inputs payload.
     */
    readonly inputs: Readonly<Record<string, unknown>>

    /**
     * Optional run metadata.
     */
    readonly extra?: Readonly<Record<string, unknown>>
}

/**
 * Run update payload expected by LangSmith client.
 */
export interface ILangSmithUpdateRunPayload {
    /**
     * Optional outputs payload.
     */
    readonly outputs?: Readonly<Record<string, unknown>>

    /**
     * Optional error message.
     */
    readonly error?: string

    /**
     * Run end timestamp.
     */
    readonly end_time: string

    /**
     * Optional run metadata.
     */
    readonly extra?: Readonly<Record<string, unknown>>
}

/**
 * Start-run input contract.
 */
export interface ILangSmithTraceStartInput {
    /**
     * Human-readable run name.
     */
    readonly runName: string

    /**
     * Request input payload.
     */
    readonly inputs: Readonly<Record<string, unknown>>

    /**
     * Optional metadata.
     */
    readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * Complete-run input contract.
 */
export interface ILangSmithTraceCompleteInput {
    /**
     * Response output payload.
     */
    readonly outputs: Readonly<Record<string, unknown>>

    /**
     * Optional metadata.
     */
    readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * Runtime options for LangSmith tracer.
 */
export interface ILangSmithTracerOptions {
    /**
     * LangSmith API client implementation.
     */
    readonly client: ILangSmithClient

    /**
     * Trace project name.
     */
    readonly projectName?: string

    /**
     * Optional deterministic clock.
     */
    readonly now?: () => Date
}

/**
 * Map operation result into LangSmith outputs payload.
 */
export type LangSmithTraceOutputMapper<TResult> = (
    result: TResult,
) => Readonly<Record<string, unknown>>

/**
 * LangSmith tracer utility for run lifecycle management.
 */
export class LangSmithTracer {
    private readonly client: ILangSmithClient
    private readonly projectName: string
    private readonly now: () => Date

    /**
     * Creates LangSmith tracer.
     *
     * @param options Tracer options.
     */
    public constructor(options: ILangSmithTracerOptions) {
        this.client = validateClient(options.client)
        this.projectName = validateProjectName(options.projectName ?? DEFAULT_PROJECT_NAME)
        this.now = options.now ?? (() => new Date())
    }

    /**
     * Starts one LangSmith run and returns generated run identifier.
     *
     * @param input Start-run input.
     * @returns Created run identifier.
     */
    public async startRun(input: ILangSmithTraceStartInput): Promise<string> {
        const runName = validateRunName(input.runName)
        const runId = randomUUID()

        try {
            await this.client.createRun({
                id: runId,
                name: runName,
                run_type: "llm",
                project_name: this.projectName,
                start_time: this.now().toISOString(),
                inputs: input.inputs,
                extra: input.metadata,
            })
        } catch (error) {
            throw new LangSmithTracerError(
                LANGSMITH_TRACER_ERROR_CODE.CREATE_RUN_FAILED,
                {
                    causeMessage: resolveCauseMessage(error),
                },
            )
        }

        return runId
    }

    /**
     * Marks existing LangSmith run as completed.
     *
     * @param runId Run identifier.
     * @param input Complete-run input.
     * @returns Completion promise.
     */
    public async completeRun(
        runId: string,
        input: ILangSmithTraceCompleteInput,
    ): Promise<void> {
        const normalizedRunId = validateRunId(runId)

        await this.updateRunInternal(normalizedRunId, {
            outputs: input.outputs,
            end_time: this.now().toISOString(),
            extra: input.metadata,
        })
    }

    /**
     * Marks existing LangSmith run as failed.
     *
     * @param runId Run identifier.
     * @param error Unknown operation error.
     * @param metadata Optional failure metadata.
     * @returns Completion promise.
     */
    public async failRun(
        runId: string,
        error: unknown,
        metadata?: Readonly<Record<string, unknown>>,
    ): Promise<void> {
        const normalizedRunId = validateRunId(runId)

        await this.updateRunInternal(normalizedRunId, {
            error: resolveCauseMessage(error) ?? "Unknown LangSmith traced failure",
            end_time: this.now().toISOString(),
            extra: metadata,
        })
    }

    /**
     * Traces one async operation with automatic run start/finish/failure updates.
     *
     * @param input Start-run input.
     * @param operation Traced async operation.
     * @param mapOutput Optional output mapper.
     * @returns Operation result.
     */
    public async trace<TResult>(
        input: ILangSmithTraceStartInput,
        operation: () => Promise<TResult>,
        mapOutput?: LangSmithTraceOutputMapper<TResult>,
    ): Promise<TResult> {
        const runId = await this.startRun(input)

        try {
            const result = await operation()
            const outputs =
                mapOutput?.(result) ??
                ({
                    result,
                } as Readonly<Record<string, unknown>>)
            await this.completeRun(runId, {
                outputs,
            })
            return result
        } catch (error) {
            await this.failRun(runId, error)
            throw error
        }
    }

    /**
     * Updates LangSmith run and wraps update failures.
     *
     * @param runId Run identifier.
     * @param payload Run update payload.
     */
    private async updateRunInternal(
        runId: string,
        payload: ILangSmithUpdateRunPayload,
    ): Promise<void> {
        try {
            await this.client.updateRun(runId, payload)
        } catch (error) {
            throw new LangSmithTracerError(
                LANGSMITH_TRACER_ERROR_CODE.UPDATE_RUN_FAILED,
                {
                    causeMessage: resolveCauseMessage(error),
                },
            )
        }
    }
}

/**
 * Validates LangSmith client contract.
 *
 * @param client Client candidate.
 * @returns Validated client.
 */
function validateClient(client: ILangSmithClient): ILangSmithClient {
    if (typeof client.createRun !== "function" || typeof client.updateRun !== "function") {
        throw new LangSmithTracerError(LANGSMITH_TRACER_ERROR_CODE.INVALID_CLIENT)
    }

    return client
}

/**
 * Validates tracer project name.
 *
 * @param projectName Project name.
 * @returns Normalized project name.
 */
function validateProjectName(projectName: string): string {
    const normalized = projectName.trim()
    if (normalized.length === 0) {
        throw new LangSmithTracerError(
            LANGSMITH_TRACER_ERROR_CODE.INVALID_PROJECT_NAME,
        )
    }
    return normalized
}

/**
 * Validates run name.
 *
 * @param runName Run name.
 * @returns Normalized run name.
 */
function validateRunName(runName: string): string {
    const normalized = runName.trim()
    if (normalized.length === 0) {
        throw new LangSmithTracerError(LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_NAME)
    }
    return normalized
}

/**
 * Validates run identifier.
 *
 * @param runId Run identifier.
 * @returns Normalized run identifier.
 */
function validateRunId(runId: string): string {
    const normalized = runId.trim()
    if (normalized.length === 0) {
        throw new LangSmithTracerError(LANGSMITH_TRACER_ERROR_CODE.INVALID_RUN_ID)
    }
    return normalized
}

/**
 * Resolves safe lower-level cause message from unknown error.
 *
 * @param error Unknown error payload.
 * @returns Cause message or undefined.
 */
function resolveCauseMessage(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === "string") {
        return error
    }
    return undefined
}
