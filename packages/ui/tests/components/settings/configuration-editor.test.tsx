import type { FormEvent } from "react"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ConfigurationEditor } from "@/components/settings/configuration-editor"
import { REPO_REVIEW_MODE, type TRepoReviewMode } from "@/lib/api/endpoints/repo-config.endpoint"
import { renderWithProviders } from "../../utils/render"

describe("ConfigurationEditor", (): void => {
    it("рендерит поля и статус готовности", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml={"version: 1\nreview:\n  mode: MANUAL\n"}
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        expect(screen.getByRole("heading", { name: "Repository config" })).not.toBeNull()
        expect(screen.getByLabelText("Repository ID")).not.toBeNull()
        expect(screen.getByLabelText("Repository config YAML")).not.toBeNull()
        expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
            "Repository config is ready.",
        )
    })

    it("вызывает handlers при изменении полей и submit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onRepositoryIdChange = vi.fn((_value: string): void => {})
        const onConfigYamlChange = vi.fn((_value: string): void => {})
        const onReviewModeChange = vi.fn((_value: TRepoReviewMode): void => {})
        const onSave = vi.fn((_event: FormEvent): void => {})

        renderWithProviders(
            <ConfigurationEditor
                configYaml={"version: 1\nreview:\n  mode: MANUAL\n"}
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={onConfigYamlChange}
                onRepositoryIdChange={onRepositoryIdChange}
                onReviewModeChange={onReviewModeChange}
                onSave={onSave}
            />,
        )

        await user.type(screen.getByLabelText("Repository ID"), "-next")
        await user.selectOptions(screen.getByLabelText("Repository review mode"), "AUTO")
        await user.type(screen.getByLabelText("Repository config YAML"), "\n# note")
        await user.click(screen.getByRole("button", { name: "Save repository config" }))

        expect(onRepositoryIdChange).toHaveBeenCalled()
        expect(onReviewModeChange).toHaveBeenCalled()
        expect(onConfigYamlChange).toHaveBeenCalled()
        expect(onSave).toHaveBeenCalled()
    })

    it("показывает сообщение ошибки при недоступном конфиге", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml={"version: 1\nreview:\n  mode: MANUAL\n"}
                hasLoadError={true}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={true}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
            "Repository config unavailable.",
        )
    })
})
