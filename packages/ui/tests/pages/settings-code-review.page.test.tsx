import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { SettingsCodeReviewPage } from "@/pages/settings-code-review.page"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

describe("settings code review page", (): void => {
    it("рендерит новый rule editor", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:3000/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
        )

        const user = userEvent.setup()
        renderWithProviders(<SettingsCodeReviewPage />)

        const heading = screen.getByRole("heading", { name: "Code Review Configuration" })
        expect(heading).not.toBeNull()

        const ruleEditorInput = screen.getByRole<HTMLTextAreaElement>("textbox", {
            name: "Review rules",
        })
        expect(ruleEditorInput).not.toBeNull()

        await user.type(ruleEditorInput, " additional rule")
        expect(ruleEditorInput.value).toContain("additional rule")
    })

    it("загружает и сохраняет repository config yaml", async (): Promise<void> => {
        const user = userEvent.setup()
        let repositoryConfig: {
            repositoryId: string
            configYaml: string
            ignorePatterns: ReadonlyArray<string>
            reviewMode: "MANUAL" | "AUTO" | "AUTO_PAUSE"
        } = {
            repositoryId: "repo-1",
            configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
            ignorePatterns: ["/dist", "/node_modules"],
            reviewMode: "MANUAL",
        }

        server.use(
            http.get("http://localhost:3000/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put("http://localhost:3000/api/v1/repositories/repo-1/config", async ({ request }) => {
                const payload = (await request.json()) as {
                    readonly configYaml?: string
                    readonly ignorePatterns?: ReadonlyArray<string>
                    readonly reviewMode?: "MANUAL" | "AUTO" | "AUTO_PAUSE"
                }

                repositoryConfig = {
                    ...repositoryConfig,
                    configYaml: payload.configYaml ?? repositoryConfig.configYaml,
                    ignorePatterns: payload.ignorePatterns ?? repositoryConfig.ignorePatterns,
                    reviewMode: payload.reviewMode ?? repositoryConfig.reviewMode,
                }

                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        const yamlInput = await screen.findByLabelText<HTMLTextAreaElement>("Repository config YAML")
        expect(yamlInput.value).toContain("mode: MANUAL")

        await user.clear(yamlInput)
        await user.type(yamlInput, "version: 2\nreview:\n  mode: AUTO\n")
        await user.selectOptions(screen.getByLabelText("Repository review mode"), "AUTO")
        await user.click(screen.getByRole("button", { name: "Save repository config" }))

        await waitFor((): void => {
            expect(repositoryConfig.reviewMode).toBe("AUTO")
        })
        await waitFor((): void => {
            expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
                "Repository config is ready.",
            )
        })
        expect(repositoryConfig.configYaml).toContain("version: 2")
    })

    it("сохраняет ignore patterns в repository config", async (): Promise<void> => {
        const user = userEvent.setup()
        let repositoryConfig: {
            repositoryId: string
            configYaml: string
            ignorePatterns: ReadonlyArray<string>
            reviewMode: "MANUAL" | "AUTO" | "AUTO_PAUSE"
        } = {
            repositoryId: "repo-1",
            configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
            ignorePatterns: ["/dist", "/node_modules"],
            reviewMode: "MANUAL",
        }

        server.use(
            http.get("http://localhost:3000/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put("http://localhost:3000/api/v1/repositories/repo-1/config", async ({ request }) => {
                const payload = (await request.json()) as {
                    readonly configYaml?: string
                    readonly ignorePatterns?: ReadonlyArray<string>
                    readonly reviewMode?: "MANUAL" | "AUTO" | "AUTO_PAUSE"
                }

                repositoryConfig = {
                    ...repositoryConfig,
                    configYaml: payload.configYaml ?? repositoryConfig.configYaml,
                    ignorePatterns: payload.ignorePatterns ?? repositoryConfig.ignorePatterns,
                    reviewMode: payload.reviewMode ?? repositoryConfig.reviewMode,
                }

                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)

        const ignorePathsInput = await screen.findByLabelText<HTMLTextAreaElement>(
            "Ignore patterns",
        )
        expect(ignorePathsInput.value).toContain("/node_modules")

        await user.click(ignorePathsInput)
        await user.keyboard("{Control>}a{/Control}{Backspace}")
        await user.type(ignorePathsInput, "/vendor\n**/*.snap\n")
        await user.click(screen.getByRole("button", { name: "Save ignore patterns" }))

        await waitFor((): void => {
            expect(repositoryConfig.ignorePatterns).toEqual(["/vendor", "**/*.snap"])
        })
    })

    it("показывает dry-run results после запуска", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:3000/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await user.click(screen.getByRole("button", { name: "Run dry-run" }))

        expect(screen.getByTestId("dry-run-summary")).toHaveTextContent("Mode: MANUAL")
        expect(screen.getAllByTestId("dry-run-issue-row").length > 0).toBe(true)
    })

    it("сохраняет режим review cadence auto-pause", async (): Promise<void> => {
        const user = userEvent.setup()
        let repositoryConfig: {
            repositoryId: string
            configYaml: string
            ignorePatterns: ReadonlyArray<string>
            reviewMode: "MANUAL" | "AUTO" | "AUTO_PAUSE"
        } = {
            repositoryId: "repo-1",
            configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
            ignorePatterns: ["/dist", "/node_modules"],
            reviewMode: "MANUAL",
        }

        server.use(
            http.get("http://localhost:3000/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put("http://localhost:3000/api/v1/repositories/repo-1/config", async ({ request }) => {
                const payload = (await request.json()) as {
                    readonly configYaml?: string
                    readonly ignorePatterns?: ReadonlyArray<string>
                    readonly reviewMode?: "MANUAL" | "AUTO" | "AUTO_PAUSE"
                }

                repositoryConfig = {
                    ...repositoryConfig,
                    configYaml: payload.configYaml ?? repositoryConfig.configYaml,
                    ignorePatterns: payload.ignorePatterns ?? repositoryConfig.ignorePatterns,
                    reviewMode: payload.reviewMode ?? repositoryConfig.reviewMode,
                }

                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)

        await user.click(screen.getByRole("radio", { name: /auto-pause/i }))
        await user.click(screen.getByRole("button", { name: "Apply cadence mode" }))

        await waitFor((): void => {
            expect(repositoryConfig.reviewMode).toBe("AUTO_PAUSE")
        })
        expect(screen.getByTestId("review-cadence-current")).toHaveTextContent("AUTO_PAUSE")
    })
})
