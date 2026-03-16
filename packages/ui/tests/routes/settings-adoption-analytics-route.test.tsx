import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SettingsAdoptionAnalyticsPage } from "@/pages/settings-adoption-analytics.page"
import { renderWithProviders } from "../utils/render"

const { mockGetFunnel } = vi.hoisted(() => ({
    mockGetFunnel: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
    createApiContracts: (): {
        readonly adoptionAnalytics: { getFunnel: typeof mockGetFunnel }
    } => ({
        adoptionAnalytics: { getFunnel: mockGetFunnel },
    }),
}))

describe("adoption analytics route", (): void => {
    it("рендерит контент adoption analytics с funnel и workflow health", async (): Promise<void> => {
        mockGetFunnel.mockResolvedValue({
            funnelStages: [
                { id: "connect_provider", label: "Connect provider", count: 100 },
            ],
            workflowHealth: [
                {
                    stage: "Provider setup",
                    health: "healthy",
                    summary: "Most teams finish provider setup within one session.",
                },
            ],
            activeUsers: 72,
            timeToFirstValue: "1d 9h",
        })

        renderWithProviders(<SettingsAdoptionAnalyticsPage />)

        expect(screen.getByText("Usage & adoption analytics")).not.toBeNull()
        expect(await screen.findByText("Adoption funnel")).not.toBeNull()
        expect(screen.getByText("Workflow health")).not.toBeNull()
    })
})
