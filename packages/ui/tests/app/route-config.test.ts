import {describe, expect, it} from "vitest"

import {Route as RootRoute} from "@/routes/__root"
import {Route as IndexRoute} from "@/routes/index"

describe("route configuration", (): void => {
    it("настраивает глобальные fallback components в root route", (): void => {
        expect(typeof RootRoute.options.errorComponent).toBe("function")
        expect(typeof RootRoute.options.notFoundComponent).toBe("function")
    })

    it("настраивает route-level error fallback для главной страницы", (): void => {
        expect(typeof IndexRoute.options.errorComponent).toBe("function")
    })
})
