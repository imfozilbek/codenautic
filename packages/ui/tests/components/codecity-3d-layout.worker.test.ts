import { describe, expect, it } from "vitest"

import { computeCodeCityLayout } from "@/components/graphs/codecity-3d-layout.worker"
import type { ICodeCity3DSceneFileDescriptor } from "@/components/graphs/codecity-3d-scene"

describe("codecity-3d-layout worker", (): void => {
    it("вычисляет districts и buildings для snapshot без блокировки UI-потока", (): void => {
        const files: ReadonlyArray<ICodeCity3DSceneFileDescriptor> = [
            {
                complexity: 18,
                coverage: 84,
                id: "src/api/router.ts",
                loc: 140,
                path: "src/api/router.ts",
            },
            {
                complexity: 10,
                coverage: 70,
                id: "src/worker/job.ts",
                loc: 94,
                path: "src/worker/job.ts",
            },
        ]

        const layout = computeCodeCityLayout(files)
        expect(layout.districts.length).toBeGreaterThan(0)
        expect(layout.buildings.length).toBe(2)
        expect(layout.buildings[0]?.width).toBeGreaterThan(0)
        expect(layout.buildings[0]?.height).toBeGreaterThan(0)
    })
})
