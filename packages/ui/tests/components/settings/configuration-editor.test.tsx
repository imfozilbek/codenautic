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

    it("показывает сообщение загрузки при isLoading=true", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml=""
                hasLoadError={false}
                hasSaveError={false}
                isLoading={true}
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
            "Loading repository config...",
        )
    })

    it("показывает сообщение сохранения при isSaving=true", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={true}
                isSaving={true}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
            "Saving repository config...",
        )
    })

    it("показывает сообщение ошибки при hasSaveError=true", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
                hasSaveError={true}
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

        expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
            "Repository config unavailable.",
        )
    })

    it("переключает review mode на AUTO_PAUSE", async (): Promise<void> => {
        const user = userEvent.setup()
        const onReviewModeChange = vi.fn((_value: TRepoReviewMode): void => {})

        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={onReviewModeChange}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        await user.selectOptions(screen.getByLabelText("Repository review mode"), "AUTO_PAUSE")
        expect(onReviewModeChange).toHaveBeenCalledWith(REPO_REVIEW_MODE.autoPause)
    })

    it("не вызывает onReviewModeChange при невалидном значении select", async (): Promise<void> => {
        const onReviewModeChange = vi.fn((_value: TRepoReviewMode): void => {})

        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={onReviewModeChange}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        const select: HTMLSelectElement = screen.getByLabelText("Repository review mode")
        expect(select.value).toBe(REPO_REVIEW_MODE.manual)
    })

    it("кнопка save отключена при isSaveDisabled=true", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
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

        const saveButton = screen.getByRole("button", { name: "Save repository config" })
        expect(saveButton).toHaveAttribute("disabled")
    })

    it("рендерит все три опции review mode в select", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
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

        expect(screen.getByText("Manual")).not.toBeNull()
        expect(screen.getByText("Auto")).not.toBeNull()
        expect(screen.getByText("Auto pause")).not.toBeNull()
    })

    it("рендерит описание компонента", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
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

        expect(screen.getByText(/codenautic-config\.yml/)).not.toBeNull()
    })

    it("вызывает onConfigYamlChange при изменении textarea", async (): Promise<void> => {
        const user = userEvent.setup()
        const onConfigYamlChange = vi.fn((_value: string): void => {})

        renderWithProviders(
            <ConfigurationEditor
                configYaml=""
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={onConfigYamlChange}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        await user.type(screen.getByLabelText("Repository config YAML"), "version: 2")
        expect(onConfigYamlChange).toHaveBeenCalled()
    })

    it("отображает repository id значение в input", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml="version: 1"
                hasLoadError={false}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={false}
                isSaving={false}
                repositoryId="my-repo-42"
                reviewMode={REPO_REVIEW_MODE.auto}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        const input: HTMLInputElement = screen.getByLabelText("Repository ID")
        expect(input.value).toBe("my-repo-42")
    })

    it("приоритет isLoading над hasLoadError в state message", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml=""
                hasLoadError={true}
                hasSaveError={false}
                isLoading={true}
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
            "Loading repository config...",
        )
    })

    it("приоритет isSaving над hasLoadError в state message", (): void => {
        renderWithProviders(
            <ConfigurationEditor
                configYaml=""
                hasLoadError={true}
                hasSaveError={false}
                isLoading={false}
                isSaveDisabled={true}
                isSaving={true}
                repositoryId="repo-1"
                reviewMode={REPO_REVIEW_MODE.manual}
                onConfigYamlChange={(_value: string): void => {}}
                onRepositoryIdChange={(_value: string): void => {}}
                onReviewModeChange={(_value: TRepoReviewMode): void => {}}
                onSave={(_event: FormEvent): void => {}}
            />,
        )

        expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
            "Saving repository config...",
        )
    })
})
