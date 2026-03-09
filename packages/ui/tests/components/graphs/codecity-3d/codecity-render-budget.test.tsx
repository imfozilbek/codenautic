import { describe, expect, it } from "vitest"

import { resolveCodeCityRenderBudget } from "@/components/graphs/codecity-3d/codecity-render-budget"
import {
    CRITICAL_FPS,
    HIGH_QUALITY_MAX_BUILDINGS,
    LOW_QUALITY_MAX_BUILDINGS,
    MEDIUM_QUALITY_MAX_BUILDINGS,
    WARNING_FPS,
} from "@/components/graphs/codecity-3d/codecity-scene-constants"

describe("resolveCodeCityRenderBudget", (): void => {
    describe("quality by building count", (): void => {
        it("when building count is within high quality threshold, then returns high quality", (): void => {
            const budget = resolveCodeCityRenderBudget(HIGH_QUALITY_MAX_BUILDINGS, undefined)
            expect(budget.quality).toBe("high")
            expect(budget.useInstancing).toBe(false)
        })

        it("when building count exceeds high threshold but within medium, then returns medium quality", (): void => {
            const budget = resolveCodeCityRenderBudget(HIGH_QUALITY_MAX_BUILDINGS + 1, undefined)
            expect(budget.quality).toBe("medium")
            expect(budget.useInstancing).toBe(true)
        })

        it("when building count equals medium threshold, then returns medium quality", (): void => {
            const budget = resolveCodeCityRenderBudget(MEDIUM_QUALITY_MAX_BUILDINGS, undefined)
            expect(budget.quality).toBe("medium")
        })

        it("when building count exceeds medium threshold, then returns low quality", (): void => {
            const budget = resolveCodeCityRenderBudget(MEDIUM_QUALITY_MAX_BUILDINGS + 1, undefined)
            expect(budget.quality).toBe("low")
            expect(budget.useInstancing).toBe(true)
        })

        it("when building count is 0, then returns high quality", (): void => {
            const budget = resolveCodeCityRenderBudget(0, undefined)
            expect(budget.quality).toBe("high")
        })
    })

    describe("quality adjustment by FPS", (): void => {
        it("when FPS is below critical threshold, then forces low quality regardless of building count", (): void => {
            const budget = resolveCodeCityRenderBudget(10, CRITICAL_FPS - 1)
            expect(budget.quality).toBe("low")
        })

        it("when FPS is below warning threshold and quality is high, then downgrades to medium", (): void => {
            const budget = resolveCodeCityRenderBudget(10, WARNING_FPS - 1)
            expect(budget.quality).toBe("medium")
        })

        it("when FPS is below warning threshold but quality already medium, then stays medium", (): void => {
            const budget = resolveCodeCityRenderBudget(
                HIGH_QUALITY_MAX_BUILDINGS + 1,
                WARNING_FPS - 1,
            )
            expect(budget.quality).toBe("medium")
        })

        it("when FPS is above warning threshold, then does not downgrade quality", (): void => {
            const budget = resolveCodeCityRenderBudget(10, WARNING_FPS + 5)
            expect(budget.quality).toBe("high")
        })

        it("when FPS is exactly at warning threshold, then does not downgrade", (): void => {
            const budget = resolveCodeCityRenderBudget(10, WARNING_FPS)
            expect(budget.quality).toBe("high")
        })

        it("when FPS is exactly at critical threshold, then does not force low but may downgrade to medium via warning check", (): void => {
            const budget = resolveCodeCityRenderBudget(10, CRITICAL_FPS)
            expect(budget.quality).toBe("medium")
        })
    })

    describe("budget profile properties", (): void => {
        it("when quality is high, then returns expected budget profile", (): void => {
            const budget = resolveCodeCityRenderBudget(10, 60)
            expect(budget.quality).toBe("high")
            expect(budget.cullingRadius).toBe(LOW_QUALITY_MAX_BUILDINGS)
            expect(budget.dpr).toEqual([1, 1.5])
            expect(budget.maxInteractiveBuildings).toBe(LOW_QUALITY_MAX_BUILDINGS)
            expect(budget.useInstancing).toBe(false)
        })

        it("when quality is medium, then returns expected budget profile", (): void => {
            const budget = resolveCodeCityRenderBudget(HIGH_QUALITY_MAX_BUILDINGS + 1, 60)
            expect(budget.quality).toBe("medium")
            expect(budget.cullingRadius).toBe(210)
            expect(budget.dpr).toEqual([0.95, 1.25])
            expect(budget.maxInteractiveBuildings).toBe(180)
            expect(budget.useInstancing).toBe(true)
        })

        it("when quality is low, then returns expected budget profile", (): void => {
            const budget = resolveCodeCityRenderBudget(MEDIUM_QUALITY_MAX_BUILDINGS + 1, 60)
            expect(budget.quality).toBe("low")
            expect(budget.cullingRadius).toBe(150)
            expect(budget.dpr).toEqual([0.75, 1])
            expect(budget.maxInteractiveBuildings).toBe(100)
            expect(budget.useInstancing).toBe(true)
        })
    })

    describe("combined building count and FPS", (): void => {
        it("when building count implies medium but FPS drops below critical, then forces low", (): void => {
            const budget = resolveCodeCityRenderBudget(
                HIGH_QUALITY_MAX_BUILDINGS + 1,
                CRITICAL_FPS - 5,
            )
            expect(budget.quality).toBe("low")
        })

        it("when building count implies low and FPS is good, then stays low", (): void => {
            const budget = resolveCodeCityRenderBudget(MEDIUM_QUALITY_MAX_BUILDINGS + 1, 60)
            expect(budget.quality).toBe("low")
        })

        it("when sampledFps is undefined, then quality is based only on building count", (): void => {
            const highBudget = resolveCodeCityRenderBudget(10, undefined)
            expect(highBudget.quality).toBe("high")

            const lowBudget = resolveCodeCityRenderBudget(
                MEDIUM_QUALITY_MAX_BUILDINGS + 1,
                undefined,
            )
            expect(lowBudget.quality).toBe("low")
        })
    })
})
