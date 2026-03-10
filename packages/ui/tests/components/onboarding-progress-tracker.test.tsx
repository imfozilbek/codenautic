import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
    OnboardingProgressTracker,
    type IOnboardingProgressModuleDescriptor,
} from "@/components/graphs/onboarding-progress-tracker"
import { renderWithProviders } from "../utils/render"

const TEST_MODULES: ReadonlyArray<IOnboardingProgressModuleDescriptor> = [
    {
        description: "Repository, metric and overlay filters were configured.",
        id: "controls",
        isComplete: true,
        title: "Dashboard controls",
    },
    {
        description: "Exploration paths were opened from sidebar.",
        id: "explore",
        isComplete: false,
        title: "Explore mode paths",
    },
    {
        description: "Root-cause chain was analyzed in context.",
        id: "root-cause",
        isComplete: true,
        title: "Root cause analysis",
    },
]

describe("OnboardingProgressTracker", (): void => {
    it("рендерит прогресс и completion badges по модулям", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        expect(screen.getByText("Onboarding progress tracker")).not.toBeNull()
        expect(screen.getByText("Explored areas: 2 / 3")).not.toBeNull()
        expect(screen.getByRole("progressbar", { name: "Onboarding progress" })).not.toBeNull()
        expect(screen.getAllByText("Complete").length).toBe(2)
        expect(screen.getByText("Pending")).not.toBeNull()
    })

    it("when all modules are complete, then progress is 100%", (): void => {
        const allComplete: ReadonlyArray<IOnboardingProgressModuleDescriptor> = [
            {
                description: "First module done.",
                id: "m1",
                isComplete: true,
                title: "Module One",
            },
            {
                description: "Second module done.",
                id: "m2",
                isComplete: true,
                title: "Module Two",
            },
        ]

        renderWithProviders(<OnboardingProgressTracker modules={allComplete} />)

        const progressBar = screen.getByRole("progressbar", { name: "Onboarding progress" })
        expect(progressBar.getAttribute("aria-valuenow")).toBe("100")
        expect(screen.getByText("Explored areas: 2 / 2")).not.toBeNull()
        expect(screen.getAllByText("Complete").length).toBe(2)
        expect(screen.queryByText("Pending")).toBeNull()
    })

    it("when no modules are complete, then progress is 0%", (): void => {
        const noneComplete: ReadonlyArray<IOnboardingProgressModuleDescriptor> = [
            {
                description: "Still pending.",
                id: "p1",
                isComplete: false,
                title: "Pending Module",
            },
        ]

        renderWithProviders(<OnboardingProgressTracker modules={noneComplete} />)

        const progressBar = screen.getByRole("progressbar", { name: "Onboarding progress" })
        expect(progressBar.getAttribute("aria-valuenow")).toBe("0")
        expect(screen.getByText("Explored areas: 0 / 1")).not.toBeNull()
        expect(screen.queryByText("Complete")).toBeNull()
        expect(screen.getByText("Pending")).not.toBeNull()
    })

    it("when modules array is empty, then progress is 0% and no items rendered", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={[]} />)

        const progressBar = screen.getByRole("progressbar", { name: "Onboarding progress" })
        expect(progressBar.getAttribute("aria-valuenow")).toBe("0")
        expect(screen.getByText("Explored areas: 0 / 0")).not.toBeNull()
        expect(screen.queryByText("Complete")).toBeNull()
        expect(screen.queryByText("Pending")).toBeNull()
    })

    it("when modules are rendered, then each shows title and description", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        expect(screen.getByText("Dashboard controls")).not.toBeNull()
        expect(
            screen.getByText("Repository, metric and overlay filters were configured."),
        ).not.toBeNull()

        expect(screen.getByText("Explore mode paths")).not.toBeNull()
        expect(screen.getByText("Exploration paths were opened from sidebar.")).not.toBeNull()

        expect(screen.getByText("Root cause analysis")).not.toBeNull()
        expect(screen.getByText("Root-cause chain was analyzed in context.")).not.toBeNull()
    })

    it("when module is complete, then badge has success styling", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        const completeBadges = screen.getAllByText("Complete")
        for (const badge of completeBadges) {
            expect(badge.className).toContain("text-success")
        }
    })

    it("when module is pending, then badge has default styling", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        const pendingBadge = screen.getByText("Pending")
        expect(pendingBadge.className).toContain("text-foreground")
    })

    it("when progress is calculated, then progressbar width matches percentage", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        const progressBar = screen.getByRole("progressbar", { name: "Onboarding progress" })
        expect(progressBar.getAttribute("aria-valuenow")).toBe("67")
        expect(progressBar.getAttribute("aria-valuemin")).toBe("0")
        expect(progressBar.getAttribute("aria-valuemax")).toBe("100")
        expect(progressBar.style.width).toBe("67%")
    })

    it("when rendered, then shows module list items equal to modules count", (): void => {
        renderWithProviders(<OnboardingProgressTracker modules={TEST_MODULES} />)

        const listItems = screen.getAllByRole("listitem")
        expect(listItems.length).toBe(3)
    })
})
