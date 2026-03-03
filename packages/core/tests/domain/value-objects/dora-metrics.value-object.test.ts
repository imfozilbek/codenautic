import {describe, expect, test} from "bun:test"

import {DoraMetrics} from "../../../src/domain/value-objects/dora-metrics.value-object"

describe("DoraMetrics", () => {
    test("creates valid metrics with copied range dates", () => {
        const timeFrom = new Date("2026-01-01T00:00:00.000Z")
        const timeTo = new Date("2026-01-31T23:59:59.000Z")
        const metrics = DoraMetrics.create({
            deployFrequency: 4.5,
            leadTime: 12.3,
            changeFailRate: 2,
            meanTimeToRestore: 0.8,
            timeRange: {
                from: timeFrom,
                to: timeTo,
            },
        })

        expect(metrics.deployFrequency).toBe(4.5)
        expect(metrics.leadTime).toBe(12.3)
        expect(metrics.changeFailRate).toBe(2)
        expect(metrics.meanTimeToRestore).toBe(0.8)
        expect(metrics.timeRange.from.getTime()).toBe(timeFrom.getTime())
        expect(metrics.timeRange.to.getTime()).toBe(timeTo.getTime())
        expect(metrics.timeRange.from).not.toBe(timeFrom)
    })

    test("throws for negative metrics", () => {
        expect(() => {
            DoraMetrics.create({
                deployFrequency: -1,
                leadTime: 1,
                changeFailRate: 1,
                meanTimeToRestore: 1,
                timeRange: {
                    from: new Date("2026-01-01T00:00:00.000Z"),
                    to: new Date("2026-01-02T00:00:00.000Z"),
                },
            })
        }).toThrow("deployFrequency must be a finite non-negative number")
    })

    test("throws when fail rate is out of bounds", () => {
        expect(() => {
            DoraMetrics.create({
                deployFrequency: 1,
                leadTime: 1,
                changeFailRate: 120,
                meanTimeToRestore: 1,
                timeRange: {
                    from: new Date("2026-01-01T00:00:00.000Z"),
                    to: new Date("2026-01-02T00:00:00.000Z"),
                },
            })
        }).toThrow("changeFailRate must be between 0 and 100")
    })

    test("throws when time range is reversed", () => {
        expect(() => {
            DoraMetrics.create({
                deployFrequency: 1,
                leadTime: 1,
                changeFailRate: 1,
                meanTimeToRestore: 1,
                timeRange: {
                    from: new Date("2026-01-02T00:00:00.000Z"),
                    to: new Date("2026-01-01T00:00:00.000Z"),
                },
            })
        }).toThrow("timeRange.from must be before or equal to timeRange.to")
    })
})
