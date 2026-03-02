/**
 * Structured payload used in pipeline state snapshots.
 */
export type PipelinePayload = Readonly<Record<string, unknown>>

/**
 * Structured item inside pipeline collections.
 */
export type PipelineCollectionItem = Readonly<Record<string, unknown>>

/**
 * Immutable snapshot of review pipeline execution state.
 */
export interface IReviewPipelineStateProps {
    runId: string
    definitionVersion: string
    mergeRequest: PipelinePayload
    config: PipelinePayload
    files: readonly PipelineCollectionItem[]
    suggestions: readonly PipelineCollectionItem[]
    discardedSuggestions: readonly PipelineCollectionItem[]
    metrics: PipelinePayload | null
    checkId: string | null
    commentId: string | null
    externalContext: PipelinePayload | null
    currentStageId: string | null
    lastCompletedStageId: string | null
    stageAttempts: Readonly<Record<string, number>>
}

/**
 * State creation payload.
 */
export interface ICreateReviewPipelineStateProps {
    runId: string
    definitionVersion: string
    mergeRequest: PipelinePayload
    config: PipelinePayload
    files?: readonly PipelineCollectionItem[]
    suggestions?: readonly PipelineCollectionItem[]
    discardedSuggestions?: readonly PipelineCollectionItem[]
    metrics?: PipelinePayload | null
    checkId?: string | null
    commentId?: string | null
    externalContext?: PipelinePayload | null
    currentStageId?: string | null
    lastCompletedStageId?: string | null
    stageAttempts?: Readonly<Record<string, number>>
}

/**
 * Partial update payload for immutable state.
 */
export interface IUpdateReviewPipelineStateProps {
    definitionVersion?: string
    mergeRequest?: PipelinePayload
    config?: PipelinePayload
    files?: readonly PipelineCollectionItem[]
    suggestions?: readonly PipelineCollectionItem[]
    discardedSuggestions?: readonly PipelineCollectionItem[]
    metrics?: PipelinePayload | null
    checkId?: string | null
    commentId?: string | null
    externalContext?: PipelinePayload | null
    currentStageId?: string | null
    lastCompletedStageId?: string | null
    stageAttempts?: Readonly<Record<string, number>>
}

/**
 * Immutable data class for pipeline execution state.
 */
export class ReviewPipelineState {
    private readonly props: Readonly<IReviewPipelineStateProps>

    /**
     * Creates immutable state instance.
     *
     * @param props Fully normalized state props.
     */
    private constructor(props: IReviewPipelineStateProps) {
        this.props = Object.freeze({
            runId: props.runId,
            definitionVersion: props.definitionVersion,
            mergeRequest: ReviewPipelineState.cloneAndFreezePayload(props.mergeRequest),
            config: ReviewPipelineState.cloneAndFreezePayload(props.config),
            files: Object.freeze(
                props.files.map((item): PipelineCollectionItem => {
                    return ReviewPipelineState.cloneAndFreezeCollectionItem(item)
                }),
            ),
            suggestions: Object.freeze(
                props.suggestions.map((item): PipelineCollectionItem => {
                    return ReviewPipelineState.cloneAndFreezeCollectionItem(item)
                }),
            ),
            discardedSuggestions: Object.freeze(
                props.discardedSuggestions.map((item): PipelineCollectionItem => {
                    return ReviewPipelineState.cloneAndFreezeCollectionItem(item)
                }),
            ),
            metrics: ReviewPipelineState.cloneAndFreezeOptionalPayload(props.metrics),
            checkId: props.checkId,
            commentId: props.commentId,
            externalContext: ReviewPipelineState.cloneAndFreezeOptionalPayload(props.externalContext),
            currentStageId: props.currentStageId,
            lastCompletedStageId: props.lastCompletedStageId,
            stageAttempts: Object.freeze({...props.stageAttempts}),
        })
    }

    /**
     * Creates state from user payload.
     *
     * @param props Create payload.
     * @returns Immutable state.
     */
    public static create(props: ICreateReviewPipelineStateProps): ReviewPipelineState {
        return this.createFromProps(this.normalizeCreateProps(props))
    }

    /**
     * Pipeline run identifier.
     *
     * @returns Run identifier.
     */
    public get runId(): string {
        return this.props.runId
    }

    /**
     * Pinned pipeline definition version.
     *
     * @returns Definition version.
     */
    public get definitionVersion(): string {
        return this.props.definitionVersion
    }

    /**
     * Merge request payload.
     *
     * @returns Merge request snapshot.
     */
    public get mergeRequest(): PipelinePayload {
        return ReviewPipelineState.clonePayload(this.props.mergeRequest)
    }

    /**
     * Resolved review configuration snapshot.
     *
     * @returns Config payload.
     */
    public get config(): PipelinePayload {
        return ReviewPipelineState.clonePayload(this.props.config)
    }

    /**
     * Changed files snapshot.
     *
     * @returns Files list copy.
     */
    public get files(): readonly PipelineCollectionItem[] {
        return this.props.files.map((item): PipelineCollectionItem => {
            return ReviewPipelineState.cloneCollectionItem(item)
        })
    }

    /**
     * Accepted suggestions snapshot.
     *
     * @returns Suggestions list copy.
     */
    public get suggestions(): readonly PipelineCollectionItem[] {
        return this.props.suggestions.map((item): PipelineCollectionItem => {
            return ReviewPipelineState.cloneCollectionItem(item)
        })
    }

    /**
     * Discarded suggestions snapshot.
     *
     * @returns Discarded suggestions copy.
     */
    public get discardedSuggestions(): readonly PipelineCollectionItem[] {
        return this.props.discardedSuggestions.map((item): PipelineCollectionItem => {
            return ReviewPipelineState.cloneCollectionItem(item)
        })
    }

    /**
     * Aggregated metrics payload.
     *
     * @returns Metrics snapshot.
     */
    public get metrics(): PipelinePayload | null {
        return ReviewPipelineState.cloneOptionalPayload(this.props.metrics)
    }

    /**
     * External check identifier.
     *
     * @returns Check identifier.
     */
    public get checkId(): string | null {
        return this.props.checkId
    }

    /**
     * Initial comment identifier.
     *
     * @returns Comment identifier.
     */
    public get commentId(): string | null {
        return this.props.commentId
    }

    /**
     * External context snapshot.
     *
     * @returns External context payload.
     */
    public get externalContext(): PipelinePayload | null {
        return ReviewPipelineState.cloneOptionalPayload(this.props.externalContext)
    }

    /**
     * Current stage identifier.
     *
     * @returns Current stage id.
     */
    public get currentStageId(): string | null {
        return this.props.currentStageId
    }

    /**
     * Last completed stage identifier.
     *
     * @returns Last completed stage id.
     */
    public get lastCompletedStageId(): string | null {
        return this.props.lastCompletedStageId
    }

    /**
     * Attempts count by stage identifier.
     *
     * @returns Attempts map copy.
     */
    public get stageAttempts(): Readonly<Record<string, number>> {
        return {...this.props.stageAttempts}
    }

    /**
     * Indicates that state already contains progress checkpoint.
     *
     * @returns True when state has prior progress.
     */
    public get hasProgress(): boolean {
        const hasCompletedStage = this.lastCompletedStageId !== null
        const hasCurrentStage = this.currentStageId !== null
        const hasAttempts = Object.keys(this.props.stageAttempts).length > 0

        return hasCompletedStage || hasCurrentStage || hasAttempts
    }

    /**
     * Returns attempts number for stage.
     *
     * @param stageId Stage identifier.
     * @returns Attempts count.
     */
    public getStageAttempt(stageId: string): number {
        ReviewPipelineState.ensureStageId(stageId)
        const attempt = this.props.stageAttempts[stageId]

        if (attempt === undefined) {
            return 0
        }

        return attempt
    }

    /**
     * Creates new state with incremented attempt for stage.
     *
     * @param stageId Stage identifier.
     * @returns Updated immutable state.
     */
    public incrementStageAttempt(stageId: string): ReviewPipelineState {
        ReviewPipelineState.ensureStageId(stageId)
        const nextAttempts = {...this.props.stageAttempts}
        const currentAttempt = this.getStageAttempt(stageId)
        nextAttempts[stageId] = currentAttempt + 1

        return this.with({
            stageAttempts: nextAttempts,
        })
    }

    /**
     * Creates immutable state copy with partial updates.
     *
     * @param updates Partial updates.
     * @returns Updated immutable state.
     */
    public with(updates: IUpdateReviewPipelineStateProps): ReviewPipelineState {
        return ReviewPipelineState.createFromProps({
            runId: this.props.runId,
            definitionVersion: ReviewPipelineState.resolveNextValue(
                this.props.definitionVersion,
                updates.definitionVersion,
            ),
            mergeRequest: ReviewPipelineState.resolveNextValue(
                this.props.mergeRequest,
                updates.mergeRequest,
            ),
            config: ReviewPipelineState.resolveNextValue(this.props.config, updates.config),
            files: ReviewPipelineState.resolveNextValue(this.props.files, updates.files),
            suggestions: ReviewPipelineState.resolveNextValue(
                this.props.suggestions,
                updates.suggestions,
            ),
            discardedSuggestions: ReviewPipelineState.resolveNextValue(
                this.props.discardedSuggestions,
                updates.discardedSuggestions,
            ),
            metrics: ReviewPipelineState.resolveNextValue(this.props.metrics, updates.metrics),
            checkId: ReviewPipelineState.resolveNextValue(this.props.checkId, updates.checkId),
            commentId: ReviewPipelineState.resolveNextValue(this.props.commentId, updates.commentId),
            externalContext: ReviewPipelineState.resolveNextValue(
                this.props.externalContext,
                updates.externalContext,
            ),
            currentStageId: ReviewPipelineState.resolveNextValue(
                this.props.currentStageId,
                updates.currentStageId,
            ),
            lastCompletedStageId: ReviewPipelineState.resolveNextValue(
                this.props.lastCompletedStageId,
                updates.lastCompletedStageId,
            ),
            stageAttempts: ReviewPipelineState.resolveNextValue(
                this.props.stageAttempts,
                updates.stageAttempts,
            ),
        })
    }

    /**
     * Serializes state into immutable plain object copy.
     *
     * @returns Plain state snapshot.
     */
    public toSnapshot(): IReviewPipelineStateProps {
        return {
            runId: this.runId,
            definitionVersion: this.definitionVersion,
            mergeRequest: this.mergeRequest,
            config: this.config,
            files: this.files,
            suggestions: this.suggestions,
            discardedSuggestions: this.discardedSuggestions,
            metrics: this.metrics,
            checkId: this.checkId,
            commentId: this.commentId,
            externalContext: this.externalContext,
            currentStageId: this.currentStageId,
            lastCompletedStageId: this.lastCompletedStageId,
            stageAttempts: this.stageAttempts,
        }
    }

    /**
     * Resolves updated field value.
     *
     * @template TValue Field value type.
     * @param current Current value.
     * @param next Next value or undefined.
     * @returns Next value when provided, otherwise current.
     */
    private static resolveNextValue<TValue>(current: TValue, next: TValue | undefined): TValue {
        if (next === undefined) {
            return current
        }

        return next
    }

    /**
     * Creates state instance from normalized props.
     *
     * @param props Normalized state props.
     * @returns Immutable state instance.
     */
    private static createFromProps(props: IReviewPipelineStateProps): ReviewPipelineState {
        this.ensureNonEmptyString(props.runId, "runId")
        this.ensureNonEmptyString(props.definitionVersion, "definitionVersion")
        this.ensureStageAttempts(props.stageAttempts)

        return new ReviewPipelineState(props)
    }

    /**
     * Normalizes create payload with defaults.
     *
     * @param props Create payload.
     * @returns Normalized props.
     */
    private static normalizeCreateProps(
        props: ICreateReviewPipelineStateProps,
    ): IReviewPipelineStateProps {
        return {
            runId: props.runId,
            definitionVersion: props.definitionVersion,
            mergeRequest: props.mergeRequest,
            config: props.config,
            files: this.resolveWithDefault(props.files, []),
            suggestions: this.resolveWithDefault(props.suggestions, []),
            discardedSuggestions: this.resolveWithDefault(props.discardedSuggestions, []),
            metrics: this.resolveWithDefault(props.metrics, null),
            checkId: this.resolveWithDefault(props.checkId, null),
            commentId: this.resolveWithDefault(props.commentId, null),
            externalContext: this.resolveWithDefault(props.externalContext, null),
            currentStageId: this.resolveWithDefault(props.currentStageId, null),
            lastCompletedStageId: this.resolveWithDefault(props.lastCompletedStageId, null),
            stageAttempts: this.resolveWithDefault(props.stageAttempts, {}),
        }
    }

    /**
     * Resolves optional value with fallback.
     *
     * @template TValue Value type.
     * @param value Optional value.
     * @param fallback Default value.
     * @returns Value when provided, otherwise fallback.
     */
    private static resolveWithDefault<TValue>(value: TValue | undefined, fallback: TValue): TValue {
        if (value === undefined) {
            return fallback
        }

        return value
    }

    /**
     * Clones and deep-freezes payload.
     *
     * @param payload Payload value.
     * @returns Frozen payload clone.
     */
    private static cloneAndFreezePayload(payload: PipelinePayload): PipelinePayload {
        return freezeDeepValue(cloneDeepValue(payload)) as PipelinePayload
    }

    /**
     * Clones and deep-freezes collection item.
     *
     * @param item Collection item.
     * @returns Frozen item clone.
     */
    private static cloneAndFreezeCollectionItem(item: PipelineCollectionItem): PipelineCollectionItem {
        return freezeDeepValue(cloneDeepValue(item)) as PipelineCollectionItem
    }

    /**
     * Clones payload.
     *
     * @param payload Payload value.
     * @returns Payload clone.
     */
    private static clonePayload(payload: PipelinePayload): PipelinePayload {
        return cloneDeepValue(payload) as PipelinePayload
    }

    /**
     * Clones collection item.
     *
     * @param item Collection item.
     * @returns Item clone.
     */
    private static cloneCollectionItem(item: PipelineCollectionItem): PipelineCollectionItem {
        return cloneDeepValue(item) as PipelineCollectionItem
    }

    /**
     * Clones optional payload.
     *
     * @param payload Optional payload.
     * @returns Payload clone or null.
     */
    private static cloneOptionalPayload(payload: PipelinePayload | null): PipelinePayload | null {
        if (payload === null) {
            return null
        }

        return this.clonePayload(payload)
    }

    /**
     * Clones and deep-freezes optional payload.
     *
     * @param payload Optional payload.
     * @returns Frozen payload clone or null.
     */
    private static cloneAndFreezeOptionalPayload(payload: PipelinePayload | null): PipelinePayload | null {
        if (payload === null) {
            return null
        }

        return this.cloneAndFreezePayload(payload)
    }

    /**
     * Validates non-empty string value.
     *
     * @param value Value to validate.
     * @param fieldName Field label.
     * @throws Error when value is empty.
     */
    private static ensureNonEmptyString(value: string, fieldName: string): void {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`${fieldName} must be a non-empty string`)
        }
    }

    /**
     * Validates stage attempts map.
     *
     * @param attempts Stage attempts map.
     * @throws Error when attempts map has invalid key or value.
     */
    private static ensureStageAttempts(attempts: Readonly<Record<string, number>>): void {
        for (const [stageId, attempt] of Object.entries(attempts)) {
            this.ensureStageId(stageId)

            if (!Number.isInteger(attempt)) {
                throw new Error("stage attempt must be an integer")
            }
            if (attempt < 0) {
                throw new Error("stage attempt must be greater than or equal to zero")
            }
        }
    }

    /**
     * Validates stage identifier.
     *
     * @param stageId Stage identifier.
     * @throws Error when stage id is empty.
     */
    private static ensureStageId(stageId: string): void {
        if (typeof stageId !== "string" || stageId.trim().length === 0) {
            throw new Error("stageId must be a non-empty string")
        }
    }
}

/**
 * Deeply clones unknown value.
 *
 * @param value Value to clone.
 * @returns Deep clone.
 */
function cloneDeepValue(value: unknown): unknown {
    if (value instanceof Date) {
        return new Date(value.getTime())
    }

    if (Array.isArray(value)) {
        return value.map((item): unknown => {
            return cloneDeepValue(item)
        })
    }

    if (typeof value !== "object" || value === null) {
        return value
    }

    const clonedRecord: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
        clonedRecord[key] = cloneDeepValue(item)
    }

    return clonedRecord
}

/**
 * Deeply freezes unknown value.
 *
 * @param value Value to freeze.
 * @returns Frozen value.
 */
function freezeDeepValue(value: unknown): unknown {
    if (typeof value !== "object" || value === null) {
        return value
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            freezeDeepValue(item)
        }
        return Object.freeze(value)
    }

    for (const item of Object.values(value)) {
        freezeDeepValue(item)
    }

    return Object.freeze(value)
}
