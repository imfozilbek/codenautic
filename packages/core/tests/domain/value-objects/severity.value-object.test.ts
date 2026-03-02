import {describe, expect, test} from "bun:test"

import {Severity} from "../../../src/domain/value-objects/severity.value-object"

describe("Severity", () => {
    test("maps severity levels to expected weights", () => {
        expect(Severity.create("INFO").weight).toBe(0)
        expect(Severity.create("LOW").weight).toBe(10)
        expect(Severity.create("MEDIUM").weight).toBe(20)
        expect(Severity.create("HIGH").weight).toBe(30)
        expect(Severity.create("CRITICAL").weight).toBe(50)
    })

    test("normalizes level and returns toString value", () => {
        const severity = Severity.create("  high  ")

        expect(severity.toString()).toBe("HIGH")
    })

    test("compares severity levels", () => {
        const low = Severity.create("LOW")
        const high = Severity.create("HIGH")

        expect(high.compareTo(low)).toBeGreaterThan(0)
        expect(low.compareTo(high)).toBeLessThan(0)
        expect(low.compareTo(Severity.create("LOW"))).toBe(0)
    })

    test("checks isHigherThan and isAtLeast", () => {
        const medium = Severity.create("MEDIUM")
        const low = Severity.create("LOW")
        const high = Severity.create("HIGH")

        expect(medium.isHigherThan(low)).toBe(true)
        expect(low.isHigherThan(high)).toBe(false)
        expect(high.isAtLeast(medium)).toBe(true)
        expect(medium.isAtLeast(Severity.create("MEDIUM"))).toBe(true)
    })

    test("throws for unknown severity level", () => {
        expect(() => {
            Severity.create("urgent")
        }).toThrow("Unknown severity level")
    })
})
