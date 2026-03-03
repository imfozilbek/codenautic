/**
 * Input contract for CCR metrics.
 */
export interface ICCRMetricsProps {
    /**
     * Time from open to merge in hours.
     */
    readonly cycleTime: number

    /**
     * Review processing time in hours.
     */
    readonly reviewTime: number

    /**
     * Total changed lines.
     */
    readonly size: number

    /**
     * Count of comments in the review.
     */
    readonly commentsCount: number

    /**
     * Iteration count for review rounds.
     */
    readonly iterationsCount: number

    /**
     * Time from first response to resolution in hours.
     */
    readonly firstResponseTime: number
}

/**
 * Immutable CCR metrics value object.
 */
export class CCRMetrics {
    private readonly cycleTimeValue: number
    private readonly reviewTimeValue: number
    private readonly sizeValue: number
    private readonly commentsCountValue: number
    private readonly iterationsCountValue: number
    private readonly firstResponseTimeValue: number

    /**
     * Creates validated CCR metrics object.
     *
     * @param props Normalized props.
     */
    private constructor(props: ICCRMetricsProps) {
        this.cycleTimeValue = props.cycleTime
        this.reviewTimeValue = props.reviewTime
        this.sizeValue = props.size
        this.commentsCountValue = props.commentsCount
        this.iterationsCountValue = props.iterationsCount
        this.firstResponseTimeValue = props.firstResponseTime

        Object.freeze(this)
    }

    /**
     * Creates CCR metrics from validated input.
     *
     * @param props Metrics input.
     * @returns Immutable CCR metrics.
     */
    public static create(props: ICCRMetricsProps): CCRMetrics {
        validateCcrMetricsProps(props)

        return new CCRMetrics({
            cycleTime: props.cycleTime,
            reviewTime: props.reviewTime,
            size: props.size,
            commentsCount: props.commentsCount,
            iterationsCount: props.iterationsCount,
            firstResponseTime: props.firstResponseTime,
        })
    }

    /**
     * Cycle time in hours.
     *
     * @returns Cycle time.
     */
    public get cycleTime(): number {
        return this.cycleTimeValue
    }

    /**
     * Review time in hours.
     *
     * @returns Review time.
     */
    public get reviewTime(): number {
        return this.reviewTimeValue
    }

    /**
     * Changed lines size.
     *
     * @returns Size.
     */
    public get size(): number {
        return this.sizeValue
    }

    /**
     * Number of comments.
     *
     * @returns Comments count.
     */
    public get commentsCount(): number {
        return this.commentsCountValue
    }

    /**
     * Number of iterations.
     *
 * @returns Iterations count.
     */
    public get iterationsCount(): number {
        return this.iterationsCountValue
    }

    /**
     * First response time in hours.
     *
     * @returns First response time.
     */
    public get firstResponseTime(): number {
        return this.firstResponseTimeValue
    }
}

/**
 * Validates CCR metric fields.
 *
 * @param props Metrics input.
 * @throws Error When any field is invalid.
 */
function validateCcrMetricsProps(props: ICCRMetricsProps): void {
    validateHours(props.cycleTime, "cycleTime")
    validateHours(props.reviewTime, "reviewTime")
    validateNonNegativeInteger(props.size, "size")
    validateNonNegativeInteger(props.commentsCount, "commentsCount")
    validateNonNegativeInteger(props.iterationsCount, "iterationsCount")
    validateHours(props.firstResponseTime, "firstResponseTime")
}

/**
 * Validates non-negative numeric counters.
 *
 * @param value Checked value.
 * @param name Field name.
 * @throws Error When value invalid.
 */
function validateNonNegativeInteger(value: number, name: string): void {
    validateNonNegativeNumber(value, name)

    if (!Number.isInteger(value)) {
        throw new Error(`${name} must be an integer`)
    }
}

/**
 * Validates non-negative numeric values.
 *
 * @param value Checked value.
 * @param name Field name.
 * @throws Error When invalid.
 */
function validateNonNegativeNumber(value: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name} must be a finite non-negative number`)
    }
}

/**
 * Validates hour-based durations.
 *
 * @param value Checked value.
 * @param name Field name.
 * @throws Error When value invalid.
 */
function validateHours(value: number, name: string): void {
    validateNonNegativeNumber(value, name)
}
