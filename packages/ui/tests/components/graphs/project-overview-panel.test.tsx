import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
    ProjectOverviewPanel,
    type IProjectOverviewFileDescriptor,
} from "@/components/codecity/project-overview-panel"
import { renderWithProviders } from "../../utils/render"

const MOCK_FILES: ReadonlyArray<IProjectOverviewFileDescriptor> = [
    { path: "src/api/routes.ts" },
    { path: "src/api/middleware.ts" },
    { path: "src/api/index.ts" },
    { path: "src/cache/store.ts" },
    { path: "src/cache/invalidation.ts" },
    { path: "src/utils/format.ts" },
    { path: "config/app.json" },
    { path: "src/main.ts" },
]

describe("ProjectOverviewPanel", (): void => {
    it("when rendered with files, then displays title and repository label", (): void => {
        renderWithProviders(
            <ProjectOverviewPanel
                repositoryId="repo-123"
                repositoryLabel="CodeNautic"
                files={MOCK_FILES}
            />,
        )

        expect(screen.getByText("Project overview")).not.toBeNull()
        expect(screen.getByText(/CodeNautic/)).not.toBeNull()
        expect(screen.getByText(/repo-123/)).not.toBeNull()
    })

    it("when files contain TypeScript files, then shows TypeScript in tech stack", (): void => {
        renderWithProviders(
            <ProjectOverviewPanel
                repositoryId="repo-1"
                repositoryLabel="Test Repo"
                files={MOCK_FILES}
            />,
        )

        expect(screen.getByText("TypeScript")).not.toBeNull()
    })

    it("when files contain entry points, then lists them", (): void => {
        renderWithProviders(
            <ProjectOverviewPanel
                repositoryId="repo-1"
                repositoryLabel="Test Repo"
                files={MOCK_FILES}
            />,
        )

        expect(screen.getByText("src/api/index.ts")).not.toBeNull()
        expect(screen.getByText("src/main.ts")).not.toBeNull()
    })

    it("when no entry points exist, then shows no-entry-points message", (): void => {
        renderWithProviders(
            <ProjectOverviewPanel
                repositoryId="repo-1"
                repositoryLabel="Test Repo"
                files={[{ path: "src/utils/helper.ts" }]}
            />,
        )

        expect(screen.getByText("No entry points detected in current scan.")).not.toBeNull()
    })

    it("when files are in different directories, then shows architecture summary", (): void => {
        renderWithProviders(
            <ProjectOverviewPanel
                repositoryId="repo-1"
                repositoryLabel="Test Repo"
                files={MOCK_FILES}
            />,
        )

        expect(screen.getByText("Architecture summary")).not.toBeNull()
        expect(screen.getByText("src")).not.toBeNull()
    })
})
