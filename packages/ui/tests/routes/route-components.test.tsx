import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { afterEach, describe, expect, it } from "vitest"

import { App } from "@/app/app"
import { validateRepositoriesSearch } from "@/routes/repositories"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

/**
 * Рендерит приложение на целевом route и возвращает container.
 *
 * @param path Начальный URL route.
 * @returns HTMLElement container из render result.
 */
function renderAppAtRoute(path: string): HTMLElement {
    window.history.replaceState({}, "", path)
    const result = renderWithProviders(<App />)
    return result.container
}

/**
 * Устанавливает MSW-обработчики для CCR workspace API,
 * необходимые для routes, использующих useCcrWorkspace.
 */
function installCcrWorkspaceHandlers(): void {
    server.use(
        http.get("http://localhost:7120/api/v1/reviews/workspace", () => {
            return HttpResponse.json({
                total: 0,
                ccrs: [],
            })
        }),
        http.get("http://localhost:7120/api/v1/reviews/:reviewId/workspace", ({ params }) => {
            return HttpResponse.json({
                ccr: {
                    id: String(params.reviewId),
                    title: `CCR ${String(params.reviewId)}`,
                    status: "completed",
                    severity: "medium",
                    repository: "test/repo",
                    team: "Test Team",
                    assignee: "Test User",
                    comments: 0,
                    attachedFiles: [],
                    updatedAt: "2026-03-01T00:00:00.000Z",
                },
            })
        }),
    )
}

describe("Route: index (dashboard)", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: code city dashboard", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/dashboard/code-city")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: help diagnostics", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/help-diagnostics")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: issues tracking", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/issues")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: my work", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/my-work")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: reports list", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/reports")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: report generator", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/reports/generate")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: report viewer", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/reports/viewer")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: repositories list", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/repositories")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: repositories validateSearch", (): void => {
    it("renders without error", (): void => {
        const result = validateRepositoriesSearch({
            q: "gateway",
            status: "ready",
            sort: "name",
        })

        expect(result).toEqual({
            q: "gateway",
            status: "ready",
            sort: "name",
        })
    })

    it("when no params provided, then returns all undefined", (): void => {
        const result = validateRepositoriesSearch({})

        expect(result).toEqual({
            q: undefined,
            status: undefined,
            sort: undefined,
        })
    })

    it("when status is invalid, then returns undefined", (): void => {
        const result = validateRepositoriesSearch({ status: "invalid" })

        expect(result.status).toBeUndefined()
    })

    it("when sort is invalid, then returns undefined", (): void => {
        const result = validateRepositoriesSearch({ sort: "invalid" })

        expect(result.sort).toBeUndefined()
    })

    it("when q is non-string, then returns undefined", (): void => {
        const result = validateRepositoriesSearch({ q: 42 })

        expect(result.q).toBeUndefined()
    })

    it("when q has whitespace, then trims it", (): void => {
        const result = validateRepositoriesSearch({ q: "  api  " })

        expect(result.q).toBe("api")
    })

    it("when status is 'scanning', then returns it", (): void => {
        const result = validateRepositoriesSearch({ status: "scanning" })

        expect(result.status).toBe("scanning")
    })

    it("when status is 'error', then returns it", (): void => {
        const result = validateRepositoriesSearch({ status: "error" })

        expect(result.status).toBe("error")
    })

    it("when sort is 'status', then returns it", (): void => {
        const result = validateRepositoriesSearch({ sort: "status" })

        expect(result.sort).toBe("status")
    })

    it("when sort is 'lastScanAt', then returns it", (): void => {
        const result = validateRepositoriesSearch({ sort: "lastScanAt" })

        expect(result.sort).toBe("lastScanAt")
    })
})

describe("Route: repository overview", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/repositories/test-org%2Ftest-repo")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: review detail", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        installCcrWorkspaceHandlers()
        const container = renderAppAtRoute("/reviews/review-123")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: reviews with search params", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/reviews?q=test&status=open")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: scan error recovery", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/scan-error-recovery")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: scan progress with search params", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/scan-progress?jobId=scan-123&repositoryId=org/repo")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: session recovery", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/session-recovery")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: system health", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/system-health")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings overview", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings billing", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings-billing")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings code review", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings-code-review")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings contract validation", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings-contract-validation")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings integrations", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings-integrations")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

describe("Route: settings organization", (): void => {
    afterEach((): void => {
        window.history.replaceState({}, "", "/")
    })

    it("renders without error", async (): Promise<void> => {
        const container = renderAppAtRoute("/settings-organization")

        expect(container).toBeDefined()
        const navElements = await screen.findAllByRole("navigation", {
            name: "Main navigation",
        })
        expect(navElements.length).toBeGreaterThan(0)
    })
})

