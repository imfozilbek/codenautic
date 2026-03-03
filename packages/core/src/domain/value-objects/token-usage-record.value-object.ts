import {UniqueId} from "./unique-id.value-object"

/**
 * Input contract for token usage record.
 */
export interface ITokenUsageRecordProps {
    /**
     * LLM model identifier.
     */
    readonly model: string

    /**
     * Provider identifier.
     */
    readonly provider: string

    /**
     * Input tokens.
     */
    readonly input: number

    /**
     * Output tokens.
     */
    readonly output: number

    /**
     * Reasoning output tokens.
     */
    readonly outputReasoning: number

    /**
     * Total tokens.
     */
    readonly total: number

    /**
     * Organization identifier.
     */
    readonly organizationId: string

    /**
     * Team identifier.
     */
    readonly teamId: string

    /**
     * Optional developer identifier.
     */
    readonly developerId?: string

    /**
     * Optional CCR number.
     */
    readonly ccrNumber?: string

    /**
     * BYOK flag.
     */
    readonly byok: boolean

    /**
     * Time the record was created.
     */
    readonly recordedAt: Date
}

/**
 * Immutable token usage value object.
 */
export class TokenUsageRecord {
    private readonly modelValue: string
    private readonly providerValue: string
    private readonly inputValue: number
    private readonly outputValue: number
    private readonly outputReasoningValue: number
    private readonly totalValue: number
    private readonly organizationIdValue: UniqueId
    private readonly teamIdValue: UniqueId
    private readonly developerIdValue: UniqueId | undefined
    private readonly ccrNumberValue: string | undefined
    private readonly byokValue: boolean
    private readonly recordedAtValue: Date

    /**
     * Creates validated token usage record.
     *
     * @param props Normalized props.
     */
    private constructor(props: ITokenUsageRecordProps) {
        this.modelValue = props.model
        this.providerValue = props.provider
        this.inputValue = props.input
        this.outputValue = props.output
        this.outputReasoningValue = props.outputReasoning
        this.totalValue = props.total
        this.organizationIdValue = UniqueId.create(props.organizationId)
        this.teamIdValue = UniqueId.create(props.teamId)
        this.developerIdValue = props.developerId === undefined
            ? undefined
            : UniqueId.create(props.developerId)
        this.ccrNumberValue = props.ccrNumber?.trim()
        this.byokValue = props.byok
        this.recordedAtValue = new Date(props.recordedAt)

        Object.freeze(this)
    }

    /**
     * Creates token usage record from validated input.
     *
     * @param props Record input.
     * @returns Immutable token usage record.
     */
    public static create(props: ITokenUsageRecordProps): TokenUsageRecord {
        validateTokenUsageRecordProps(props)

        return new TokenUsageRecord({
            ...props,
        })
    }

    /**
     * Model identifier.
     *
     * @returns Model name.
     */
    public get model(): string {
        return this.modelValue
    }

    /**
     * Provider identifier.
     *
     * @returns Provider name.
     */
    public get provider(): string {
        return this.providerValue
    }

    /**
     * Input token count.
     *
     * @returns Input token count.
     */
    public get input(): number {
        return this.inputValue
    }

    /**
     * Output token count.
     *
     * @returns Output token count.
     */
    public get output(): number {
        return this.outputValue
    }

    /**
     * Reasoning output token count.
     *
     * @returns Reasoning output token count.
     */
    public get outputReasoning(): number {
        return this.outputReasoningValue
    }

    /**
     * Total token count.
     *
     * @returns Total.
     */
    public get total(): number {
        return this.totalValue
    }

    /**
     * Organization id.
     *
     * @returns Organization identifier.
     */
    public get organizationId(): UniqueId {
        return this.organizationIdValue
    }

    /**
     * Team id.
     *
     * @returns Team identifier.
     */
    public get teamId(): UniqueId {
        return this.teamIdValue
    }

    /**
     * Developer id.
     *
     * @returns Developer identifier when present.
     */
    public get developerId(): UniqueId | undefined {
        return this.developerIdValue
    }

    /**
     * CCR number.
     *
     * @returns CCR number when present.
     */
    public get ccrNumber(): string | undefined {
        return this.ccrNumberValue
    }

    /**
     * Is BYOK enabled.
     *
     * @returns true if BYOK enabled.
     */
    public get byok(): boolean {
        return this.byokValue
    }

    /**
     * Recorded timestamp.
     *
     * @returns timestamp copy.
     */
    public get recordedAt(): Date {
        return new Date(this.recordedAtValue)
    }
}

/**
 * Validates token usage record props.
 *
 * @param props Record input.
 * @throws Error When invalid.
 */
function validateTokenUsageRecordProps(props: ITokenUsageRecordProps): void {
    validateText(props.model, "model")
    validateText(props.provider, "provider")
    validateTokenCount(props.input, "input")
    validateTokenCount(props.output, "output")
    validateTokenCount(props.outputReasoning, "outputReasoning")
    validateTokenCount(props.total, "total")
    validateExpectedTotal(props.input, props.output, props.outputReasoning, props.total)
    validateText(props.organizationId, "organizationId")
    validateText(props.teamId, "teamId")
    validateOptionalText(props.developerId, "developerId")
    validateOptionalText(props.ccrNumber, "ccrNumber")
    validateBoolean(props.byok, "byok")
    validateDate(props.recordedAt, "recordedAt")

    UniqueId.create(props.organizationId)
    UniqueId.create(props.teamId)
    if (props.developerId !== undefined) {
        UniqueId.create(props.developerId)
    }
}

/**
 * Validates token counts.
 *
 * @param value Count value.
 * @param field Field name.
 * @throws Error when invalid.
 */
function validateTokenCount(value: number, field: string): void {
    if (
        typeof value !== "number" ||
        Number.isNaN(value) ||
        !Number.isFinite(value) ||
        value < 0 ||
        !Number.isInteger(value)
    ) {
        throw new Error(`${field} must be a finite non-negative integer`)
    }
}

/**
 * Validates expected total sum.
 *
 * @param input Input tokens.
 * @param output Output tokens.
 * @param outputReasoning Reasoning tokens.
 * @param total Total tokens.
 */
function validateExpectedTotal(
    input: number,
    output: number,
    outputReasoning: number,
    total: number,
): void {
    if (input + output + outputReasoning !== total) {
        throw new Error("total must be equal input + output + outputReasoning")
    }
}

/**
 * Validates text fields.
 *
 * @param value Text value.
 * @param field Field name.
 * @throws Error when invalid.
 */
function validateText(value: string, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} cannot be empty`)
    }
}

/**
 * Validates optional text fields.
 *
 * @param value Optional value.
 * @param field Field name.
 */
function validateOptionalText(value: string | undefined, field: string): void {
    if (value === undefined) {
        return
    }

    validateText(value, field)
}

/**
 * Validates boolean fields.
 *
 * @param value Boolean candidate.
 * @param field Field name.
 */
function validateBoolean(value: boolean, field: string): void {
    if (typeof value !== "boolean") {
        throw new Error(`${field} must be boolean`)
    }
}

/**
 * Validates date.
 *
 * @param value Date candidate.
 * @param field Field name.
 */
function validateDate(value: Date, field: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new Error(`${field} must be valid date`)
    }
}
