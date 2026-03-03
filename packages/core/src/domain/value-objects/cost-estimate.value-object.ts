import {
    TokenUsageRecord,
} from "./token-usage-record.value-object"

/**
 * Aggregated cost split for one model.
 */
export interface ICostByModel {
    readonly model: string
    readonly tokens: number
    readonly cost: number
}

/**
 * Pricing rules for one model.
 */
export interface IModelTokenPricing {
    /**
     * Model identifier.
     */
    readonly model: string

    /**
     * Input token price per 1000.
     */
    readonly inputPerThousand: number

    /**
     * Output token price per 1000.
     */
    readonly outputPerThousand: number

    /**
     * Reasoning output token price per 1000.
     */
    readonly outputReasoningPerThousand: number
}

/**
 * Pricing policy for cost estimation.
 */
export interface ICostEstimatePricing {
    /**
     * Currency code.
     */
    readonly currency: string

    /**
     * Default input token price per 1000.
     */
    readonly defaultInputPerThousand: number

    /**
     * Default output token price per 1000.
     */
    readonly defaultOutputPerThousand: number

    /**
     * Default reasoning token price per 1000.
     */
    readonly defaultOutputReasoningPerThousand: number

    /**
     * Optional per-model overrides.
     */
    readonly byModel?: readonly IModelTokenPricing[]
}

/**
 * Immutable calculated cost estimate.
 */
export class CostEstimate {
    private readonly totalCostValue: number
    private readonly currencyValue: string
    private readonly byModelValue: readonly ICostByModel[]

    /**
     * Creates immutable cost estimate.
     *
     * @param props Calculated cost props.
     */
    private constructor(props: Readonly<{totalCost: number; currency: string; byModel: readonly ICostByModel[]}>) {
        this.totalCostValue = props.totalCost
        this.currencyValue = props.currency
        this.byModelValue = props.byModel.map((entry): ICostByModel => ({
            ...entry,
        }))
        Object.freeze(this.byModelValue)
        Object.freeze(this)
    }

    /**
     * Calculates cost estimate by usage and pricing.
     *
     * @param usageRecords Token usage records.
     * @param pricing Pricing policy.
     * @returns Cost estimate object.
     */
    public static calculate(
        usageRecords: readonly TokenUsageRecord[],
        pricing: ICostEstimatePricing,
    ): CostEstimate {
        validatePricing(pricing)

        if (usageRecords.length === 0) {
            return new CostEstimate({
                totalCost: 0,
                currency: pricing.currency,
                byModel: [],
            })
        }

        const byModelMap = new Map<string, {tokens: number; cost: number}>()

        for (const record of usageRecords) {
            const normalized = {
                model: record.model,
                inputPerThousand: findPricing(record.model, "inputPerThousand", pricing),
                outputPerThousand: findPricing(record.model, "outputPerThousand", pricing),
                outputReasoningPerThousand: findPricing(record.model, "outputReasoningPerThousand", pricing),
            }
            const cost = calculateRecordCost(record, normalized)

            const previous = byModelMap.get(record.model)
            if (previous === undefined) {
                byModelMap.set(record.model, {
                    tokens: record.total,
                    cost,
                })
                continue
            }

            byModelMap.set(record.model, {
                tokens: previous.tokens + record.total,
                cost: previous.cost + cost,
            })
        }

        const byModel = [...byModelMap.entries()].map(([model, metrics]): ICostByModel => {
            return {
                model,
                tokens: metrics.tokens,
                cost: roundToPrecision(metrics.cost),
            }
        })

        return new CostEstimate({
            totalCost: roundToPrecision(
                byModel.reduce((accumulator, modelMetrics): number => accumulator + modelMetrics.cost, 0),
            ),
            currency: pricing.currency,
            byModel,
        })
    }

    /**
     * Total cost.
     *
     * @returns Total sum.
     */
    public get totalCost(): number {
        return this.totalCostValue
    }

    /**
     * Currency.
     *
     * @returns Currency code.
     */
    public get currency(): string {
        return this.currencyValue
    }

    /**
     * Per-model cost list.
     *
     * @returns Immutable by-model entries.
     */
    public get byModel(): readonly ICostByModel[] {
        return [...this.byModelValue]
    }
}

/**
 * Resolves per-model pricing.
 *
 * @param model Model name.
 * @param field Price field.
 * @param pricing Pricing policy.
 * @returns Requested price.
 */
function findPricing(
    model: string,
    field: "inputPerThousand" | "outputPerThousand" | "outputReasoningPerThousand",
    pricing: ICostEstimatePricing,
): number {
    const override = pricing.byModel?.find((candidate): boolean => candidate.model === model)
    if (override === undefined) {
        if (field === "inputPerThousand") {
            return pricing.defaultInputPerThousand
        }
        if (field === "outputPerThousand") {
            return pricing.defaultOutputPerThousand
        }

        return pricing.defaultOutputReasoningPerThousand
    }

    return override[field]
}

/**
 * Calculates cost for one record by model pricing.
 *
 * @param record Token usage record.
 * @param pricing Model pricing.
 * @returns Cost value.
 */
function calculateRecordCost(
    record: TokenUsageRecord,
    pricing: {
        readonly inputPerThousand: number
        readonly outputPerThousand: number
        readonly outputReasoningPerThousand: number
    },
): number {
    const inputCost = (record.input / 1000) * pricing.inputPerThousand
    const outputCost = (record.output / 1000) * pricing.outputPerThousand
    const reasoningCost = (record.outputReasoning / 1000) * pricing.outputReasoningPerThousand

    return roundToPrecision(inputCost + outputCost + reasoningCost)
}

/**
 * Validates pricing policy.
 *
 * @param pricing Pricing policy.
 */
function validatePricing(pricing: ICostEstimatePricing): void {
    validateNonEmptyString(pricing.currency, "pricing.currency")
    validateNonNegativeRate(
        pricing.defaultInputPerThousand,
        "pricing.defaultInputPerThousand",
    )
    validateNonNegativeRate(
        pricing.defaultOutputPerThousand,
        "pricing.defaultOutputPerThousand",
    )
    validateNonNegativeRate(
        pricing.defaultOutputReasoningPerThousand,
        "pricing.defaultOutputReasoningPerThousand",
    )
    validateModelPricings(pricing.byModel)
}

function validateNonEmptyString(value: string, field: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${field} cannot be empty`)
    }
}

function validateNonNegativeRate(value: number, field: string): void {
    if (Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
        throw new Error(`${field} must be a finite non-negative number`)
    }
}

function validateModelPricings(pricings: readonly IModelTokenPricing[] | undefined): void {
    for (const modelPricing of pricings ?? []) {
        validateNonEmptyString(modelPricing.model, "pricing.byModel.model")
        validateNonNegativeRate(
            modelPricing.inputPerThousand,
            "pricing.byModel.inputPerThousand",
        )
        validateNonNegativeRate(
            modelPricing.outputPerThousand,
            "pricing.byModel.outputPerThousand",
        )
        validateNonNegativeRate(
            modelPricing.outputReasoningPerThousand,
            "pricing.byModel.outputReasoningPerThousand",
        )
    }
}

/**
 * Rounds value to six decimal places.
 *
 * @param value Numeric value.
 * @returns Rounded number.
 */
function roundToPrecision(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000
}
