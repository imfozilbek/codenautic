import type {ValidatedConfig} from "../dto/review/review-config.dto"
import type {IUseCase} from "../ports/inbound/use-case.port"
import {Result} from "../../shared/result"

/**
 * Input for configuration layer merge.
 */
export interface IConfigurationMergerInput {
    readonly default: Readonly<Record<string, unknown>>
    readonly org?: Readonly<Record<string, unknown>> | null
    readonly repo?: Readonly<Record<string, unknown>> | null
}

/**
 * Deep merges configuration layers with explicit replacement behavior for arrays.
 */
export class ConfigurationMergerUseCase
    implements IUseCase<IConfigurationMergerInput, ValidatedConfig, Error> {
    /**
     * Creates merger use case instance.
     */
    public constructor() {
    }

    /**
     * Merges layered configuration into validated output.
     *
     * @param input Layered configuration inputs.
     * @returns Merged config or failure when payload is invalid.
     */
    public execute(input: IConfigurationMergerInput): Promise<Result<ValidatedConfig, Error>> {
        const mergeResult = this.mergeLayers([
            input.default,
            input.org,
            input.repo,
        ])

        return Promise.resolve(Result.ok<ValidatedConfig, Error>(mergeResult))
    }

    /**
     * Merges layers with default -> org -> repo precedence.
     *
     * @param layers Layers to merge.
     * @returns Merged config record.
     */
    private mergeLayers(layers: readonly (Record<string, unknown> | null | undefined)[]): ValidatedConfig {
        const merged: Record<string, unknown> = {}

        for (const layer of layers) {
            if (layer === null || layer === undefined) {
                continue
            }

            const layerEntries = layer as Readonly<Record<string, unknown>>
            for (const [key, value] of Object.entries(layerEntries)) {
                const currentValue = merged[key]
                merged[key] = this.mergeValue(currentValue, value)
            }
        }

        return this.freezePayload(merged)
    }

    /**
     * Merges scalar value using recursive object merge and array replacement.
     *
     * @param current Current merged value.
     * @param incoming Incoming layer value.
     * @returns merged result.
     */
    private mergeValue(current: unknown, incoming: unknown): unknown {
        if (incoming === undefined) {
            return current
        }

        if (Array.isArray(incoming)) {
            return this.cloneArray(incoming)
        }

        if (this.isPlainObject(current) && this.isPlainObject(incoming)) {
            return this.mergeObjects(current, incoming)
        }

        return this.cloneValue(incoming)
    }

    /**
     * Recursively merges plain objects (deep merge semantics).
     *
     * @param current Existing object value.
     * @param incoming Incoming object value.
     * @returns Merged object copy.
     */
    private mergeObjects(
        current: Record<string, unknown>,
        incoming: Record<string, unknown>,
    ): Record<string, unknown> {
        const result: Record<string, unknown> = this.cloneObject(current)

        for (const [key, value] of Object.entries(incoming)) {
            if (value === undefined) {
                continue
            }

            result[key] = this.mergeValue(result[key], value)
        }

        return result
    }

    /**
     * Clones array values recursively.
     *
     * @param value Raw array.
     * @returns Cloned array.
     */
    private cloneArray(value: unknown[]): unknown[] {
        return value.map((item): unknown => {
            return this.cloneValue(item)
        })
    }

    /**
     * Clones plain objects recursively.
     *
     * @param value Source object.
     * @returns Cloned object.
     */
    private cloneObject(value: Record<string, unknown>): Record<string, unknown> {
        const clone: Record<string, unknown> = {}
        for (const [key, item] of Object.entries(value)) {
            clone[key] = this.cloneValue(item)
        }

        return clone
    }

    /**
     * Clones generic payload for non-mutating semantics.
     *
     * @param value Source value.
     * @returns Cloned payload.
     */
    private cloneValue(value: unknown): unknown {
        if (Array.isArray(value)) {
            return this.cloneArray(value)
        }

        if (this.isPlainObject(value)) {
            return this.cloneObject(value)
        }

        return value
    }

    /**
     * Makes payload immutable before returning validated config.
     *
     * @param payload Raw merged payload.
     * @returns Readonly validated config shape.
     */
    private freezePayload(payload: Record<string, unknown>): ValidatedConfig {
        const frozenPayload: Record<string, unknown> = this.cloneObject(payload)

        Object.freeze(frozenPayload)

        return Object.freeze(frozenPayload) as ValidatedConfig
    }

    /**
     * Detects plain object values.
     *
     * @param value Any value.
     * @returns True when value is a plain object.
     */
    private isPlainObject(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null && !Array.isArray(value)
    }
}
