import {describe, expect, test} from "bun:test"

import {CCRMetrics} from "../../../src/domain/value-objects/ccr-metrics.value-object"

describe("CCRMetrics", () => {
    test("creates valid CCR metrics", () => {
        const metrics = CCRMetrics.create({
            cycleTime: 2.5,
            reviewTime: 0.5,
            size: 120,
            commentsCount: 8,
            iterationsCount: 3,
            firstResponseTime: 0.75,
        })

        expect(metrics.cycleTime).toBe(2.5)
        expect(metrics.reviewTime).toBe(0.5)
        expect(metrics.size).toBe(120)
        expect(metrics.commentsCount).toBe(8)
        expect(metrics.iterationsCount).toBe(3)
        expect(metrics.firstResponseTime).toBe(0.75)
    })

    test("throws for non-integer counters", () => {
        expect(() => {
            CCRMetrics.create({
                cycleTime: 2,
                reviewTime: 1,
                size: 12.2,
                commentsCount: 3,
                iterationsCount: 1,
                firstResponseTime: 1,
            })
        }).toThrow("size must be an integer")
    })

    test("throws for negative counters", () => {
        expect(() => {
            CCRMetrics.create({
                cycleTime: 2,
                reviewTime: 1,
                size: 12,
                commentsCount: -1,
                iterationsCount: 1,
                firstResponseTime: 1,
            })
        }).toThrow("commentsCount must be a finite non-negative number")
    })
})
