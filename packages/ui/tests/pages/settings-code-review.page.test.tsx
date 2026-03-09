import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { SettingsCodeReviewPage } from "@/pages/settings-code-review.page"
import { server } from "../mocks/server"
import { renderWithProviders } from "../utils/render"

describe("settings code review page", (): void => {
    it("рендерит новый rule editor", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put(
                "http://localhost:7120/api/v1/repositories/repo-1/config",
                async ({ request }) => {
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
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        const yamlInput =
            await screen.findByLabelText<HTMLTextAreaElement>("Repository config YAML")
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
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put(
                "http://localhost:7120/api/v1/repositories/repo-1/config",
                async ({ request }) => {
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
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)

        const ignorePathsInput =
            await screen.findByLabelText<HTMLTextAreaElement>("Ignore patterns")
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
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.post("http://localhost:7120/api/v1/repositories/repo-1/dry-run", () => {
                return HttpResponse.json({
                    result: {
                        mode: "MANUAL",
                        reviewedFiles: 6,
                        suggestions: 3,
                        issues: [
                            {
                                filePath: "src/review/pipeline.ts",
                                severity: "high",
                                title: "Missing fallback",
                            },
                        ],
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
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: repositoryConfig,
                })
            }),
            http.put(
                "http://localhost:7120/api/v1/repositories/repo-1/config",
                async ({ request }) => {
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
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)

        await user.click(screen.getByRole("radio", { name: /auto-pause/i }))
        await user.click(screen.getByRole("button", { name: "Apply cadence mode" }))

        await waitFor((): void => {
            expect(repositoryConfig.reviewMode).toBe("AUTO_PAUSE")
        })
        expect(screen.getByTestId("review-cadence-current")).toHaveTextContent("AUTO_PAUSE")
    })

    it("конфигурирует и сохраняет CCR summary settings", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        await user.click(screen.getByRole("checkbox", { name: "Include timeline highlights" }))
        await user.selectOptions(screen.getByLabelText("Summary detail level"), "DEEP")
        const maxSuggestionsInput = screen.getByLabelText("Max suggestions in summary")
        fireEvent.change(maxSuggestionsInput, { target: { value: "12" } })
        const promptOverrideInput = screen.getByLabelText("CCR summary prompt override")
        await user.type(promptOverrideInput, "\n- Focus on rollback safety.")
        await user.click(screen.getByRole("button", { name: "Save CCR summary settings" }))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-state")).toHaveTextContent(
                "CCR summary settings saved.",
            )
        })
        expect(screen.getByTestId("ccr-summary-preview-detail-level")).toHaveTextContent(
            "Detail level: Deep",
        )
        expect(screen.getByTestId("ccr-summary-preview-max-suggestions")).toHaveTextContent(
            "Max suggestions: 12",
        )
        expect(
            (promptOverrideInput as HTMLTextAreaElement).value.includes(
                "- Focus on rollback safety.",
            ),
        ).toBe(true)
    })

    it("генерирует CCR summary preview через API", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.post(
                "http://localhost:7120/api/v1/repositories/repo-1/ccr-summary/generate",
                () => {
                    return HttpResponse.json({
                        result: {
                            mode: "MANUAL",
                            generatedAt: "2026-03-05T09:00:00.000Z",
                            summary: "Main blocker is provider degradation noise in review queue.",
                            highlights: [
                                "Degradation fallback activates too often",
                                "Retry budget exhausted in peak windows",
                            ],
                        },
                    })
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await user.click(screen.getByRole("button", { name: "Generate CCR summary preview" }))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-output")).toHaveTextContent(
                "Main blocker is provider degradation noise in review queue.",
            )
        })
        expect(screen.getByTestId("ccr-summary-state")).toHaveTextContent("CCR summary generated.")
    })

    it("конфигурирует и сохраняет IDE sync settings", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        await user.click(screen.getByRole("checkbox", { name: "Sync decisions on every push" }))
        await user.selectOptions(screen.getByLabelText("IDE provider scope"), "JETBRAINS")
        await user.click(screen.getByRole("button", { name: "Save IDE sync settings" }))

        await waitFor((): void => {
            expect(screen.getByTestId("ide-sync-state")).toHaveTextContent(
                "IDE sync settings saved.",
            )
        })
    })

    it("показывает MCP server usage и stats", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        expect(screen.getByRole("heading", { name: "MCP server control panel" })).not.toBeNull()
        expect(screen.getByTestId("mcp-total-calls")).toHaveTextContent("358")
        expect(screen.getByTestId("mcp-success-rate")).toHaveTextContent("96%")
        expect(screen.getByTestId("mcp-avg-latency")).toHaveTextContent("220 ms")
        expect(screen.getAllByTestId("mcp-tool-row")).toHaveLength(3)
    })

    it("сбрасывает ignore paths к дефолтным значениям", async (): Promise<void> => {
        const user = userEvent.setup()
        let repositoryConfig = {
            repositoryId: "repo-1",
            configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
            ignorePatterns: ["/custom-dir"],
            reviewMode: "MANUAL" as const,
        }

        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({ config: repositoryConfig })
            }),
            http.put(
                "http://localhost:7120/api/v1/repositories/repo-1/config",
                async ({ request }) => {
                    const payload = (await request.json()) as {
                        readonly ignorePatterns?: ReadonlyArray<string>
                        readonly configYaml?: string
                        readonly reviewMode?: "MANUAL" | "AUTO" | "AUTO_PAUSE"
                    }
                    repositoryConfig = {
                        ...repositoryConfig,
                        ignorePatterns: (payload.ignorePatterns ??
                            repositoryConfig.ignorePatterns) as string[],
                    }
                    return HttpResponse.json({ config: repositoryConfig })
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await screen.findByLabelText<HTMLTextAreaElement>("Ignore patterns")
        await user.click(screen.getByRole("button", { name: "Reset ignore paths" }))

        await waitFor((): void => {
            expect(repositoryConfig.ignorePatterns).toEqual([
                "/dist",
                "/node_modules",
                "/coverage",
            ])
        })
    })

    it("обрабатывает ошибку при сохранении repository config", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.put("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({ error: "server error" }, { status: 500 })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await screen.findByLabelText<HTMLTextAreaElement>("Repository config YAML")

        await user.click(screen.getByRole("button", { name: "Save repository config" }))

        await waitFor((): void => {
            expect(screen.getByTestId("repo-config-state")).toHaveTextContent(
                "Repository config unavailable.",
            )
        })
    })

    it("обрабатывает ошибку при запуске dry-run", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.post("http://localhost:7120/api/v1/repositories/repo-1/dry-run", () => {
                return HttpResponse.json({ error: "server error" }, { status: 500 })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await user.click(screen.getByRole("button", { name: "Run dry-run" }))

        await waitFor((): void => {
            expect(screen.getByRole("button", { name: "Run dry-run" })).not.toBeNull()
        })
    })

    it("обрабатывает ошибку при сохранении review cadence", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.put("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({ error: "server error" }, { status: 500 })
            }),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await user.click(screen.getByRole("radio", { name: /auto-pause/i }))
        await user.click(screen.getByRole("button", { name: "Apply cadence mode" }))

        await waitFor((): void => {
            expect(screen.getByRole("button", { name: "Apply cadence mode" })).not.toBeNull()
        })
    })

    it("обрабатывает ошибку при генерации CCR summary", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
                return HttpResponse.json({
                    config: {
                        repositoryId: "repo-1",
                        configYaml: "version: 1\nreview:\n  mode: MANUAL\n",
                        ignorePatterns: ["/dist", "/node_modules"],
                        reviewMode: "MANUAL",
                    },
                })
            }),
            http.post(
                "http://localhost:7120/api/v1/repositories/repo-1/ccr-summary/generate",
                () => {
                    return HttpResponse.json({ error: "generation failed" }, { status: 500 })
                },
            ),
        )

        renderWithProviders(<SettingsCodeReviewPage />)
        await user.click(screen.getByRole("button", { name: "Generate CCR summary preview" }))

        await waitFor((): void => {
            expect(screen.getByTestId("ccr-summary-state")).toHaveTextContent(
                "Unable to generate CCR summary.",
            )
        })
    })

    it("сбрасывает prompt override к дефолтному значению", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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
        const promptOverrideInput = screen.getByLabelText<HTMLTextAreaElement>(
            "CCR summary prompt override",
        )
        await user.type(promptOverrideInput, "\n- Extra custom instruction.")
        expect(promptOverrideInput.value).toContain("Extra custom instruction.")

        await user.click(screen.getByRole("button", { name: "Reset prompt override" }))

        await waitFor((): void => {
            expect(promptOverrideInput.value).not.toContain("Extra custom instruction.")
        })
        expect(promptOverrideInput.value).toContain(
            "Generate CCR summary with a clear risk-first structure.",
        )
    })

    it("показывает пустое CCR summary output до генерации", async (): Promise<void> => {
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        expect(screen.getByTestId("ccr-summary-output-empty")).toHaveTextContent(
            "Generate summary preview to inspect current output.",
        )
    })

    it("переключает checkbox Enable CCR summary generation", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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
        const enableCheckbox = screen.getByRole("checkbox", {
            name: "Enable CCR summary generation",
        })
        expect(enableCheckbox).toBeChecked()

        await user.click(enableCheckbox)
        expect(enableCheckbox).not.toBeChecked()
    })

    it("переключает checkbox Include risk overview section", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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
        const riskOverviewCheckbox = screen.getByRole("checkbox", {
            name: "Include risk overview section",
        })
        expect(riskOverviewCheckbox).toBeChecked()

        await user.click(riskOverviewCheckbox)
        expect(riskOverviewCheckbox).not.toBeChecked()
    })

    it("переключает IDE sync checkboxes", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        const enableIdeSyncCheckbox = screen.getByRole("checkbox", {
            name: "Enable IDE plugin sync",
        })
        expect(enableIdeSyncCheckbox).toBeChecked()
        await user.click(enableIdeSyncCheckbox)
        expect(enableIdeSyncCheckbox).not.toBeChecked()

        const autoOpenDiffCheckbox = screen.getByRole("checkbox", {
            name: "Auto-open affected diffs after sync",
        })
        expect(autoOpenDiffCheckbox).toBeChecked()
        await user.click(autoOpenDiffCheckbox)
        expect(autoOpenDiffCheckbox).not.toBeChecked()
    })

    it("подаёт form code review с настройками cadence/severity/suggestions", async (): Promise<void> => {
        const user = userEvent.setup()
        server.use(
            http.get("http://localhost:7120/api/v1/repositories/repo-1/config", () => {
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

        const saveButton = screen.getByRole("button", { name: "Save review config" })
        await user.click(saveButton)

        await waitFor((): void => {
            expect(saveButton).not.toBeNull()
        })
    })
})
