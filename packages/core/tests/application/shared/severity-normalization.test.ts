import {describe, expect, test} from "bun:test"

import type {ILogger} from "../../../src/application/ports/outbound/common/logger.port"
import {normalizeSeverity} from "../../../src/application/shared/severity-normalization"
import {SEVERITY_LEVEL} from "../../../src/domain/value-objects/severity.value-object"

interface IWarnCall {
    readonly message: string
    readonly context?: Record<string, unknown>
}

function createLogger(): {readonly logger: ILogger; readonly warnings: IWarnCall[]} {
    const warnings: IWarnCall[] = []
    const logger: ILogger = {
        info: (): Promise<void> => Promise.resolve(),
        warn: (message, context): Promise<void> => {
            warnings.push({message, context})
            return Promise.resolve()
        },
        error: (): Promise<void> => Promise.resolve(),
        debug: (): Promise<void> => Promise.resolve(),
        child: () => logger,
    }

    return {logger, warnings}
}

describe("normalizeSeverity", () => {
    test("normalizes known severity values", () => {
        const {logger, warnings} = createLogger()

        const result = normalizeSeverity("  low ", {logger})

        expect(result).toBe(SEVERITY_LEVEL.LOW)
        expect(warnings).toHaveLength(0)
    })

    test("does not warn for valid severity values", () => {
        const {logger, warnings} = createLogger()

        normalizeSeverity("HIGH", {logger})

        expect(warnings).toHaveLength(0)
    })

    test("returns fallback and warns for invalid severity values", () => {
        const {logger, warnings} = createLogger()

        const result = normalizeSeverity("unknown", {
            logger,
            fallback: SEVERITY_LEVEL.MEDIUM,
        })

        expect(result).toBe(SEVERITY_LEVEL.MEDIUM)
        expect(warnings).toHaveLength(1)
    })

    test("returns undefined and warns when fallback is missing", () => {
        const {logger, warnings} = createLogger()

        const result = normalizeSeverity("invalid", {logger})

        expect(result).toBeUndefined()
        expect(warnings).toHaveLength(1)
    })

    test("includes normalized context in warning payload", () => {
        const {logger, warnings} = createLogger()

        normalizeSeverity("  weird ", {
            logger,
            context: {source: "test"},
        })

        expect(warnings).toHaveLength(1)
        expect(warnings[0]?.context).toMatchObject({
            rawSeverity: "  weird ",
            normalizedSeverity: "WEIRD",
            source: "test",
        })
    })

    test("treats blank severity as invalid", () => {
        const {logger, warnings} = createLogger()

        const result = normalizeSeverity("   ", {logger, fallback: SEVERITY_LEVEL.LOW})

        expect(result).toBe(SEVERITY_LEVEL.LOW)
        expect(warnings).toHaveLength(1)
    })
})
