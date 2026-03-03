/**
 * Time interval used by metrics domains.
 */
export interface IDoraTimeRange {
    readonly from: Date
    readonly to: Date
}

/**
 * Input contract for DORA metrics creation.
 */
export interface IDoraMetricsProps {
    /**
     * Deploy frequency in deploys per day.
     */
    readonly deployFrequency: number

    /**
     * Lead time in hours.
     */
    readonly leadTime: number

    /**
     * Change fail rate in percent (0..100).
     */
    readonly changeFailRate: number

    /**
     * Mean time to restore in hours.
     */
    readonly meanTimeToRestore: number

    /**
     * Time interval that metrics were calculated for.
     */
    readonly timeRange: IDoraTimeRange
}

/**
 * Immutable Domain-agnostic DORA metrics value object.
 */
export class DoraMetrics {
    private readonly deployFrequencyValue: number
    private readonly leadTimeValue: number
    private readonly changeFailRateValue: number
    private readonly meanTimeToRestoreValue: number
    private readonly timeRangeValue: IDoraTimeRange

    /**
     * Creates validated DORA metrics object.
     *
     * @param props Normalized props.
     */
    private constructor(props: IDoraMetricsProps) {
        this.deployFrequencyValue = props.deployFrequency
        this.leadTimeValue = props.leadTime
        this.changeFailRateValue = props.changeFailRate
        this.meanTimeToRestoreValue = props.meanTimeToRestore
        this.timeRangeValue = {
            from: new Date(props.timeRange.from),
            to: new Date(props.timeRange.to),
        }

        Object.freeze(this.timeRangeValue)
        Object.freeze(this)
    }

    /**
     * Creates DORA metrics from raw validated shape.
     *
     * @param props Metrics input.
     * @returns Immutable DORA metrics.
     */
    public static create(props: IDoraMetricsProps): DoraMetrics {
        validateDoraMetricsProps(props)

        return new DoraMetrics({
            deployFrequency: props.deployFrequency,
            leadTime: props.leadTime,
            changeFailRate: props.changeFailRate,
            meanTimeToRestore: props.meanTimeToRestore,
            timeRange: {
                from: props.timeRange.from,
                to: props.timeRange.to,
            },
        })
    }

    /**
     * Deploy frequency in deploys/day.
     *
     * @returns deploy frequency value.
     */
    public get deployFrequency(): number {
        return this.deployFrequencyValue
    }

    /**
     * Lead time in hours.
     *
     * @returns lead time.
     */
    public get leadTime(): number {
        return this.leadTimeValue
    }

    /**
     * Change fail rate (percentage).
     *
     * @returns fail rate.
     */
    public get changeFailRate(): number {
        return this.changeFailRateValue
    }

    /**
     * Mean time to restore in hours.
     *
 * @returns mean time to restore.
     */
    public get meanTimeToRestore(): number {
        return this.meanTimeToRestoreValue
    }

    /**
     * Metrics time range.
     *
     * @returns time range.
     */
    public get timeRange(): IDoraTimeRange {
        return {
            from: new Date(this.timeRangeValue.from),
            to: new Date(this.timeRangeValue.to),
        }
    }
}

/**
 * Validates all DORA metric fields.
 *
 * @param props Metrics input.
 * @throws Error When any value is invalid.
 */
function validateDoraMetricsProps(props: IDoraMetricsProps): void {
    validateNonNegativeNumber(props.deployFrequency, "deployFrequency")
    validateNonNegativeNumber(props.leadTime, "leadTime")
    validatePercentage(props.changeFailRate, "changeFailRate")
    validateNonNegativeNumber(props.meanTimeToRestore, "meanTimeToRestore")
    validateTimeRange(props.timeRange)
}

/**
 * Validates non-negative numeric values.
 *
 * @param value Checked value.
 * @param name Field name.
 * @throws Error When value is not finite or negative.
 */
function validateNonNegativeNumber(value: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name} must be a finite non-negative number`)
    }
}

/**
 * Validates percentage values.
 *
 * @param value Checked value.
 * @param name Field name.
 * @throws Error When value is out of [0;100] range.
 */
function validatePercentage(value: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
        throw new Error(`${name} must be a finite number`)
    }

    if (value < 0 || value > 100) {
        throw new Error(`${name} must be between 0 and 100`)
    }
}

/**
 * Validates time range boundaries.
 *
 * @param timeRange Candidate range.
 * @throws Error When range is invalid.
 */
function validateTimeRange(timeRange: IDoraTimeRange): void {
    if (timeRange.from === null || timeRange.to === null) {
        throw new Error("timeRange.from and timeRange.to are required")
    }

    if (timeRange.from > timeRange.to) {
        throw new Error("timeRange.from must be before or equal to timeRange.to")
    }
}
