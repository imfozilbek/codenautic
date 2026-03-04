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
})
