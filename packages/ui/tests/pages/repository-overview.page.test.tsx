import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RepositoryOverviewPage } from "@/pages/repository-overview"
import { renderWithProviders } from "../utils/render"
import { server } from "../mocks/server"

const API_BASE = "http://localhost:7120/api/v1"

/**
 * QueryClient без retry для тестов, ожидающих быструю ошибку (404).
 *
 * @returns QueryClient с отключёнными повторами.
 */
function createNoRetryQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    })
}

const {
    mockCodeCityTreemap,
    mockFileDependencyGraph,
    mockFunctionClassCallGraph,
    mockPackageDependencyGraph,
} = vi.hoisted(() => ({
    mockFileDependencyGraph: vi.fn(
        (props: {
            readonly dependencies: ReadonlyArray<unknown>
            readonly files: ReadonlyArray<unknown>
            readonly title?: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{String(props.files.length)}</p>
                    <p>{String(props.dependencies.length)}</p>
                </div>
            )
        },
    ),
    mockFunctionClassCallGraph: vi.fn(
        (props: {
            readonly callRelations: ReadonlyArray<unknown>
            readonly nodes: ReadonlyArray<unknown>
            readonly title?: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{String(props.nodes.length)}</p>
                    <p>{String(props.callRelations.length)}</p>
                </div>
            )
        },
    ),
    mockPackageDependencyGraph: vi.fn(
        (props: {
            readonly nodes: ReadonlyArray<unknown>
            readonly packageRelations?: ReadonlyArray<unknown>
            readonly relations?: ReadonlyArray<unknown>
            readonly title?: string
        }): React.JSX.Element => {
            const relationRows = props.relations ?? props.packageRelations ?? []
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{String(props.nodes.length)}</p>
                    <p>{String(relationRows.length)}</p>
                </div>
            )
        },
    ),
    mockCodeCityTreemap: vi.fn(
        (props: {
            readonly files: ReadonlyArray<unknown>
            readonly title?: string
        }): React.JSX.Element => {
            return (
                <div>
                    <p>{props.title}</p>
                    <p>{String(props.files.length)}</p>
                </div>
            )
        },
    ),
}))

vi.mock("@/components/dependency-graphs/file-dependency-graph", () => ({
    FileDependencyGraph: mockFileDependencyGraph,
}))
vi.mock("@/components/dependency-graphs/function-class-call-graph", () => ({
    FunctionClassCallGraph: mockFunctionClassCallGraph,
}))
vi.mock("@/components/dependency-graphs/package-dependency-graph", () => ({
    PackageDependencyGraph: mockPackageDependencyGraph,
}))
vi.mock("@/components/codecity/codecity-treemap", () => ({
    CodeCityTreemap: mockCodeCityTreemap,
}))

/**
 * Регистрирует MSW handler для overview известного репозитория.
 *
 * Возвращает данные, соответствующие IRepositoryOverviewResponse.
 */
function registerOverviewHandler(): void {
    server.use(
        http.get(`${API_BASE}/repositories/:repositoryId/overview`, ({ params }) => {
            const repositoryId = decodeURIComponent(String(params.repositoryId))

            if (repositoryId === "frontend-team/ui-dashboard") {
                return HttpResponse.json({
                    overview: {
                        repository: {
                            id: "frontend-team/ui-dashboard",
                            name: "ui-dashboard",
                            owner: "frontend-team",
                            defaultBranch: "main",
                            lastScanAt: "2026-03-01T10:00:00.000Z",
                            status: "ready",
                            issueCount: 5,
                            healthScore: 85,
                        },
                        architectureSummary: [
                            {
                                area: "Component layer",
                                risk: "low",
                                summary: "Clean separation of concerns.",
                            },
                            {
                                area: "State management",
                                risk: "high",
                                summary: "Prop drilling in several pages.",
                            },
                        ],
                        keyMetrics: [
                            {
                                id: "coverage",
                                label: "Test coverage",
                                value: "88%",
                                caption: "Target 90%",
                                trendDirection: "up",
                                trendLabel: "+3%",
                            },
                        ],
                        techStack: [
                            {
                                name: "React",
                                version: "19.0",
                                note: "UI framework",
                            },
                        ],
                        healthScore: 85,
                    },
                })
            }

            return HttpResponse.json(
                { message: "Not found" },
                { status: 404 },
            )
        }),
    )
}

beforeEach((): void => {
    mockFileDependencyGraph.mockClear()
    mockFunctionClassCallGraph.mockClear()
    mockPackageDependencyGraph.mockClear()
    mockCodeCityTreemap.mockClear()
    registerOverviewHandler()
})

describe("repository overview page", (): void => {
    it("рендерит ключевые метрики и архитектурный summary для известного репозитория", async (): Promise<void> => {
        renderWithProviders(<RepositoryOverviewPage repositoryId="frontend-team/ui-dashboard" />)

        expect(await screen.findByText("frontend-team/ui-dashboard")).not.toBeNull()
        expect(screen.getByText("File dependency graph")).not.toBeNull()

        await waitFor((): void => {
            const firstRenderCall = mockFileDependencyGraph.mock.calls[0]?.[0]
            expect(firstRenderCall).not.toBeUndefined()
            expect(firstRenderCall?.title).toBe("File dependency graph")
            expect(firstRenderCall?.files.length).toBeGreaterThan(0)
        })

        const secondRenderCall = mockFunctionClassCallGraph.mock.calls[0]?.[0]
        expect(secondRenderCall).not.toBeUndefined()
        expect(secondRenderCall?.title).toBe("Function/Class call graph")
        expect(secondRenderCall?.nodes.length).toBeGreaterThan(0)

        const thirdRenderCall = mockPackageDependencyGraph.mock.calls[0]?.[0]
        expect(thirdRenderCall).not.toBeUndefined()
        expect(thirdRenderCall?.title).toBe("Package dependency graph")
        expect(thirdRenderCall?.nodes.length).toBeGreaterThan(0)
        const fourthRenderCall = mockCodeCityTreemap.mock.calls[0]?.[0]
        expect(fourthRenderCall).not.toBeUndefined()
        expect(fourthRenderCall?.title).toBe("CodeCity treemap")
        expect(fourthRenderCall?.files.length).toBeGreaterThan(0)
        expect(screen.getByText("Tech stack")).not.toBeNull()
        expect(screen.getByText("Architecture summary")).not.toBeNull()
        expect(screen.getByLabelText("Repository health score")).not.toBeNull()
    })

    it("показывает fallback для неизвестного репозитория", async (): Promise<void> => {
        renderWithProviders(
            <RepositoryOverviewPage repositoryId="unknown/repo" />,
            { queryClient: createNoRetryQueryClient() },
        )

        expect(await screen.findByText("Скан-результат репозитория не найден")).not.toBeNull()
        expect(screen.getByText("unknown/repo")).not.toBeNull()
        expect(screen.getByRole("link", { name: "К списку репозиториев" })).not.toBeNull()
    })

    it("открывает диалог расписания и сохраняет cron", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "daily",
        )
        await user.selectOptions(screen.getByRole("combobox", { name: "Минута" }), "30")
        await user.selectOptions(screen.getByRole("combobox", { name: "Час" }), "3")
        await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

        expect(onRescanScheduleChange).toHaveBeenCalledWith({
            cronExpression: "30 3 * * *",
            mode: "daily",
            repositoryId: "frontend-team/ui-dashboard",
        })
    })

    it("закрывает диалог расписания без сохранения", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        expect(screen.getByRole("dialog")).not.toBeNull()

        await user.click(screen.getByRole("button", { name: "Закрыть" }))
        expect(screen.queryByRole("dialog")).toBeNull()
        expect(onRescanScheduleChange).not.toHaveBeenCalled()
    })

    it("сохраняет weekly расписание с днём недели", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "weekly",
        )
        await user.selectOptions(screen.getByRole("combobox", { name: "Минута" }), "15")
        await user.selectOptions(screen.getByRole("combobox", { name: "Час" }), "9")
        await user.selectOptions(screen.getByRole("combobox", { name: "День недели" }), "1")
        await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

        expect(onRescanScheduleChange).toHaveBeenCalledWith({
            cronExpression: "15 9 * * 1",
            mode: "weekly",
            repositoryId: "frontend-team/ui-dashboard",
        })
    })

    it("настраивает hourly расписание (без поля час)", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "hourly",
        )
        expect(screen.queryByRole("combobox", { name: "Час" })).toBeNull()
        await user.selectOptions(screen.getByRole("combobox", { name: "Минута" }), "45")
        await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

        expect(onRescanScheduleChange).toHaveBeenCalledWith({
            cronExpression: "45 * * * *",
            mode: "hourly",
            repositoryId: "frontend-team/ui-dashboard",
        })
    })

    it("настраивает manual режим (без временных полей)", async (): Promise<void> => {
        const onRescanScheduleChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <RepositoryOverviewPage
                onRescanScheduleChange={onRescanScheduleChange}
                repositoryId="frontend-team/ui-dashboard"
            />,
        )

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "manual",
        )
        expect(screen.queryByRole("combobox", { name: "Минута" })).toBeNull()
        expect(screen.queryByRole("combobox", { name: "Час" })).toBeNull()
        await user.click(screen.getByRole("button", { name: "Сохранить расписание" }))

        expect(onRescanScheduleChange).toHaveBeenCalledWith(
            expect.objectContaining({ mode: "manual" }),
        )
    })

    it("настраивает custom cron и блокирует кнопку при пустом вводе", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(<RepositoryOverviewPage repositoryId="frontend-team/ui-dashboard" />)

        await screen.findByText("frontend-team/ui-dashboard")

        await user.click(screen.getByRole("button", { name: "Настроить расписание рескана" }))
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Режим расписания рескана" }),
            "custom",
        )

        const cronInput = screen.getByRole("textbox", { name: "Кастомное cron-выражение" })
        expect(cronInput).not.toBeNull()

        const saveButtonBefore: HTMLButtonElement = screen.getByRole("button", {
            name: "Сохранить расписание",
        })
        expect(saveButtonBefore.disabled).toBe(true)

        await user.type(cronInput, "*/5 * * * *")
        const saveButtonAfter: HTMLButtonElement = screen.getByRole("button", {
            name: "Сохранить расписание",
        })
        expect(saveButtonAfter.disabled).toBe(false)
    })

    it("рендерит health score meter для репозитория", async (): Promise<void> => {
        renderWithProviders(<RepositoryOverviewPage repositoryId="frontend-team/ui-dashboard" />)

        await screen.findByText("frontend-team/ui-dashboard")

        const meter = screen.getByRole("meter")
        expect(meter).not.toBeNull()
        expect(meter.getAttribute("aria-valuemin")).toBe("0")
        expect(meter.getAttribute("aria-valuemax")).toBe("100")
    })
})
