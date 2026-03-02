/**
 * Supported qualitative risk score levels.
 */
export const RISK_SCORE_LEVEL = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
} as const

/**
 * Literal type for risk score levels.
 */
export type RiskScoreLevel = (typeof RISK_SCORE_LEVEL)[keyof typeof RISK_SCORE_LEVEL]

/**
 * Input factors used to compute weighted risk score.
 */
export interface IRiskScoreFactors {
    readonly issues: number
    readonly size: number
    readonly complexity: number
    readonly hotspots: number
    readonly history: number
}

const FACTOR_WEIGHTS: Readonly<Record<keyof IRiskScoreFactors, number>> = {
    issues: 0.35,
    size: 0.15,
    complexity: 0.2,
    hotspots: 0.2,
    history: 0.1,
}

const LOW_TO_MEDIUM_THRESHOLD = 25
const MEDIUM_TO_HIGH_THRESHOLD = 50
const HIGH_TO_CRITICAL_THRESHOLD = 75
const MIN_SCORE = 0
const MAX_SCORE = 100
const ROUND_PRECISION = 100
const RISK_FACTOR_KEYS: ReadonlyArray<keyof IRiskScoreFactors> = [
    "issues",
    "size",
    "complexity",
    "hotspots",
    "history",
]

/**
 * Immutable range-constrained risk score value object.
 */
export class RiskScore {
    private readonly rawValue: number

    /**
     * Creates immutable risk score.
     *
     * @param rawValue Numeric risk score in range 0..100.
     */
    private constructor(rawValue: number) {
        this.rawValue = rawValue
        Object.freeze(this)
    }

    /**
     * Creates validated risk score.
     *
     * @param value Raw numeric risk score.
     * @returns Immutable risk score value object.
     * @throws Error When value is not finite.
     * @throws Error When value is outside inclusive range 0..100.
     */
    public static create(value: number): RiskScore {
        if (!Number.isFinite(value)) {
            throw new Error("RiskScore value must be a finite number")
        }

        if (value < MIN_SCORE || value > MAX_SCORE) {
            throw new Error("RiskScore value must be between 0 and 100")
        }

        return new RiskScore(roundToTwoDecimals(value))
    }

    /**
     * Calculates weighted risk score from normalized factors.
     *
     * @param factors Normalized factors where each value is in range 0..100.
     * @returns Immutable risk score value object.
     * @throws Error When any factor is not finite.
     * @throws Error When any factor is outside inclusive range 0..100.
     */
    public static calculate(factors: IRiskScoreFactors): RiskScore {
        let weightedScore = 0

        for (const factorKey of RISK_FACTOR_KEYS) {
            const factorValue = factors[factorKey]
            validateRiskFactor(factorKey, factorValue)
            weightedScore += factorValue * FACTOR_WEIGHTS[factorKey]
        }

        return RiskScore.create(weightedScore)
    }

    /**
     * Numeric risk score value.
     *
     * @returns Numeric value in range 0..100.
     */
    public get value(): number {
        return this.rawValue
    }

    /**
     * Qualitative level resolved from threshold bands.
     *
     * @returns Level in LOW, MEDIUM, HIGH, CRITICAL.
     */
    public get level(): RiskScoreLevel {
        if (this.rawValue >= HIGH_TO_CRITICAL_THRESHOLD) {
            return RISK_SCORE_LEVEL.CRITICAL
        }

        if (this.rawValue >= MEDIUM_TO_HIGH_THRESHOLD) {
            return RISK_SCORE_LEVEL.HIGH
        }

        if (this.rawValue >= LOW_TO_MEDIUM_THRESHOLD) {
            return RISK_SCORE_LEVEL.MEDIUM
        }

        return RISK_SCORE_LEVEL.LOW
    }
}

/**
 * Validates one risk factor value.
 *
 * @param factorName Factor name.
 * @param factorValue Factor numeric value.
 * @throws Error When factor is not finite.
 * @throws Error When factor is outside inclusive range 0..100.
 */
function validateRiskFactor(factorName: keyof IRiskScoreFactors, factorValue: number): void {
    if (!Number.isFinite(factorValue)) {
        throw new Error(`RiskScore factor ${factorName} must be a finite number`)
    }

    if (factorValue < MIN_SCORE || factorValue > MAX_SCORE) {
        throw new Error(`RiskScore factor ${factorName} must be between 0 and 100`)
    }
}

/**
 * Rounds numeric value to two decimal places.
 *
 * @param value Numeric value.
 * @returns Rounded number.
 */
function roundToTwoDecimals(value: number): number {
    return Math.round(value * ROUND_PRECISION) / ROUND_PRECISION
}
