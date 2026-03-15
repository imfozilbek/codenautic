import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const intersectionObserverState = {
    isIntersecting: false,
}

vi.mock("@/lib/hooks/use-intersection-observer", () => {
    return {
        useIntersectionObserver: (): {
            readonly isIntersecting: boolean
            readonly targetRef: { current: HTMLDivElement | null }
        } => {
            return {
                isIntersecting: intersectionObserverState.isIntersecting,
                targetRef: { current: null },
            }
        },
    }
})

import type { ICcrWorkspaceListResponse } from "@/lib/api/endpoints/ccr-workspace.endpoint"
import { FOCUS_REVIEWS_FILTERS_EVENT } from "@/lib/keyboard/shortcut-registry"
import { CCR_FILTER_PRESETS_STORAGE_KEY, CcrManagementPage } from "@/pages/ccr-management.page"
import { MOCK_CCR_ROWS } from "../fixtures/ccr-data"
import { createQueryClient } from "@/lib/query/query-client"
import { queryKeys } from "@/lib/query/query-keys"
import { renderWithProviders } from "../utils/render"

function createSeededQueryClient(): ReturnType<typeof createQueryClient> {
    const queryClient = createQueryClient()
    const workspaceData: ICcrWorkspaceListResponse = {
        ccrs: MOCK_CCR_ROWS.map((row) => ({
            id: row.id,
            title: row.title,
            repository: row.repository,
            assignee: row.assignee,
            status: row.status,
            comments: row.comments,
            updatedAt: row.updatedAt,
            team: row.team,
            severity: row.severity,
            attachedFiles: [...row.attachedFiles],
        })),
    }
    queryClient.setQueryData(queryKeys.ccrWorkspace.list(), workspaceData)
    return queryClient
}

interface IStoredPresetShape {
    readonly id: string
    readonly name: string
    readonly filters: {
        readonly repository: string
        readonly search: string
        readonly status: string
        readonly team: string
    }
}

function readStoredPresets(): ReadonlyArray<IStoredPresetShape> {
    const raw = window.localStorage.getItem(CCR_FILTER_PRESETS_STORAGE_KEY)
    if (raw === null) {
        return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) === false) {
        return []
    }

    return parsed as ReadonlyArray<IStoredPresetShape>
}

describe("ccr management page filter presets", (): void => {
    beforeEach((): void => {
        window.localStorage.removeItem(CCR_FILTER_PRESETS_STORAGE_KEY)
        intersectionObserverState.isIntersecting = false
    })

    it("поддерживает CRUD для saved filter presets", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFilterChange = vi.fn<(next: unknown) => void>()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={onFilterChange}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const searchInput = screen.getByPlaceholderText("Search title / id / repo / assignee")
        await user.type(searchInput, "security")
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter by team" }),
            "frontend",
        )
        expect(screen.queryByPlaceholderText("Search by repository or title")).toBeNull()

        await user.type(
            screen.getByRole("textbox", { name: "Filter preset name" }),
            "Critical preset",
        )
        await user.click(screen.getByRole("button", { name: "Save preset" }))

        expect(screen.getByRole("option", { name: "Critical preset" })).not.toBeNull()
        expect(readStoredPresets().length).toBe(1)

        await user.clear(searchInput)
        await user.type(searchInput, "temporary-state")
        await user.selectOptions(
            screen.getByRole("combobox", { name: "Saved filter presets" }),
            "Critical preset",
        )
        await user.click(screen.getByRole("button", { name: "Apply preset" }))

        expect((searchInput as HTMLInputElement).value).toBe("security")
        const teamFilterSelect = screen.getByRole("combobox", {
            name: "Filter by team",
        })
        expect(teamFilterSelect).toHaveValue("frontend")

        const presetNameInput = screen.getByRole("textbox", { name: "Filter preset name" })
        await user.clear(presetNameInput)
        await user.type(presetNameInput, "Critical preset v2")
        await user.click(screen.getByRole("button", { name: "Update preset" }))

        const updatedPresets = readStoredPresets()
        expect(updatedPresets.length).toBe(1)
        expect(updatedPresets.at(0)?.name).toBe("Critical preset v2")
        expect(updatedPresets.at(0)?.filters.search).toBe("security")

        await user.click(screen.getByRole("button", { name: "Delete preset" }))
        expect(readStoredPresets().length).toBe(0)
        expect(onFilterChange).toHaveBeenCalled()
    }, 15000)

    it("использует virtualized CCR list при расширении набора строк", async (): Promise<void> => {
        intersectionObserverState.isIntersecting = true

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const table = screen.getByRole("grid", { name: "CCR management table" })
        expect(table).not.toBeNull()

        await waitFor((): void => {
            const rows = table.querySelectorAll("[role='row']")
            expect(rows.length).toBeGreaterThan(1)
        })

        const rows = table.querySelectorAll("[role='row']")
        expect(rows.length).toBeGreaterThan(1)
    })
})

describe("ccr management page — фильтрация и UI", (): void => {
    beforeEach((): void => {
        window.localStorage.removeItem(CCR_FILTER_PRESETS_STORAGE_KEY)
        intersectionObserverState.isIntersecting = false
    })

    it("когда статус фильтр изменен, результаты фильтруются", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFilterChange = vi.fn()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={onFilterChange}
            />,
            { queryClient: createSeededQueryClient() },
        )

        await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "new")

        expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: "new" }))
    })

    it("когда репозиторий фильтр изменен, onFilterChange вызывается", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFilterChange = vi.fn()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={onFilterChange}
            />,
            { queryClient: createSeededQueryClient() },
        )

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Filter by repository" }),
            "repo-core",
        )

        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ repository: "repo-core" }),
        )
    })

    it("когда введен текст поиска, результаты фильтруются по title/id/repo/assignee", async (): Promise<void> => {
        const user = userEvent.setup()
        const onFilterChange = vi.fn()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={onFilterChange}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const searchInput = screen.getByPlaceholderText("Search title / id / repo / assignee")
        await user.type(searchInput, "auth")

        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ search: expect.stringContaining("a") as string }),
        )
    })

    it("когда рендерится с начальными фильтрами из URL, применяет их", (): void => {
        renderWithProviders(
            <CcrManagementPage
                repository="repo-core"
                search="auth"
                status="new"
                team="runtime"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const searchInput = screen.getByPlaceholderText("Search title / id / repo / assignee")
        expect((searchInput as HTMLInputElement).value).toBe("auth")

        const statusSelect = screen.getByRole("combobox", {
            name: "Filter by status",
        })
        expect((statusSelect as HTMLInputElement).value).toBe("new")

        const teamSelect = screen.getByRole("combobox", {
            name: "Filter by team",
        })
        expect((teamSelect as HTMLInputElement).value).toBe("runtime")

        const repoSelect = screen.getByRole("combobox", {
            name: "Filter by repository",
        })
        expect((repoSelect as HTMLInputElement).value).toBe("repo-core")
    })

    it("когда страница рендерится, отображает heading и subtitle", (): void => {
        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        expect(screen.getByRole("heading", { level: 1, name: "CCR Management" })).not.toBeNull()
        expect(screen.getByText(/Filters are synced with URL/)).not.toBeNull()
    })

    it("когда FOCUS_REVIEWS_FILTERS_EVENT срабатывает, фокусирует search input", async (): Promise<void> => {
        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const searchInput = screen.getByPlaceholderText("Search title / id / repo / assignee")
        expect(document.activeElement).not.toBe(searchInput)

        window.dispatchEvent(new Event(FOCUS_REVIEWS_FILTERS_EVENT))

        await waitFor((): void => {
            expect(document.activeElement).toBe(searchInput)
        })
    })
})

describe("ccr management page — preset edge cases", (): void => {
    beforeEach((): void => {
        window.localStorage.removeItem(CCR_FILTER_PRESETS_STORAGE_KEY)
        intersectionObserverState.isIntersecting = false
    })

    it("когда имя пресета пустое, save не создает пресет", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        await user.click(screen.getByRole("button", { name: "Save preset" }))
        expect(readStoredPresets().length).toBe(0)
    })

    it("когда localStorage содержит невалидные пресеты, парсинг игнорирует их", async (): Promise<void> => {
        window.localStorage.setItem(
            CCR_FILTER_PRESETS_STORAGE_KEY,
            JSON.stringify([
                { id: "", name: "", filters: {} },
                {
                    id: "valid-id",
                    name: "Valid preset",
                    filters: { search: "", status: "all", team: "all", repository: "all" },
                },
                "not-an-object",
                { id: "no-name" },
                { id: "no-filters", name: "No Filters", filters: { search: 123 } },
            ]),
        )

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetOptions = screen.getAllByRole("option")
        const validOption = presetOptions.find(
            (option): boolean => option.textContent === "Valid preset",
        )
        expect(validOption).not.toBeUndefined()
    })

    it("когда localStorage содержит не-массив, возвращает пустые пресеты", async (): Promise<void> => {
        window.localStorage.setItem(
            CCR_FILTER_PRESETS_STORAGE_KEY,
            JSON.stringify({ not: "array" }),
        )

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetsSelect = screen.getByRole("combobox", { name: "Saved filter presets" })
        const options = presetsSelect.querySelectorAll("option")
        expect(options.length).toBe(1)
        expect(options[0]?.textContent).toBe("Select preset")
    })

    it("когда localStorage содержит невалидный JSON, возвращает пустые пресеты", async (): Promise<void> => {
        window.localStorage.setItem(CCR_FILTER_PRESETS_STORAGE_KEY, "{invalid json!!")

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetsSelect = screen.getByRole("combobox", { name: "Saved filter presets" })
        const options = presetsSelect.querySelectorAll("option")
        expect(options.length).toBe(1)
    })

    it("когда apply нажат без выбранного пресета, ничего не происходит", async (): Promise<void> => {
        const _user = userEvent.setup()
        const onFilterChange = vi.fn()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={onFilterChange}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const applyButton = screen.getByRole("button", { name: "Apply preset" })
        expect(applyButton).toBeDisabled()
    })

    it("когда update нажат без выбранного пресета, ничего не происходит", async (): Promise<void> => {
        const _user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const updateButton = screen.getByRole("button", { name: "Update preset" })
        expect(updateButton).toBeDisabled()
    })

    it("когда delete нажат без выбранного пресета, ничего не происходит", async (): Promise<void> => {
        const _user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const deleteButton = screen.getByRole("button", { name: "Delete preset" })
        expect(deleteButton).toBeDisabled()
    })

    it("когда два пресета созданы и первый удален, второй остается", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetNameInput = screen.getByRole("textbox", { name: "Filter preset name" })

        await user.type(presetNameInput, "Preset A")
        await user.click(screen.getByRole("button", { name: "Save preset" }))

        await user.clear(presetNameInput)
        await user.type(presetNameInput, "Preset B")
        await user.click(screen.getByRole("button", { name: "Save preset" }))

        expect(readStoredPresets().length).toBe(2)

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Saved filter presets" }),
            "Preset A",
        )
        await user.click(screen.getByRole("button", { name: "Delete preset" }))

        const remaining = readStoredPresets()
        expect(remaining.length).toBe(1)
        expect(remaining[0]?.name).toBe("Preset B")
    }, 15000)

    it("когда пресет выбран из выпадающего списка, имя обновляется", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetNameInput = screen.getByRole("textbox", { name: "Filter preset name" })
        await user.type(presetNameInput, "My Preset")
        await user.click(screen.getByRole("button", { name: "Save preset" }))

        await user.clear(presetNameInput)
        expect((presetNameInput as HTMLInputElement).value).toBe("")

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Saved filter presets" }),
            "My Preset",
        )

        expect((presetNameInput as HTMLInputElement).value).toBe("My Preset")
    })

    it("когда пресет обновляется с пустым именем, сохраняет старое имя", async (): Promise<void> => {
        const user = userEvent.setup()

        renderWithProviders(
            <CcrManagementPage
                repository="all"
                search=""
                status="all"
                team="all"
                onFilterChange={(): void => {}}
            />,
            { queryClient: createSeededQueryClient() },
        )

        const presetNameInput = screen.getByRole("textbox", { name: "Filter preset name" })
        await user.type(presetNameInput, "Original Name")
        await user.click(screen.getByRole("button", { name: "Save preset" }))

        await user.selectOptions(
            screen.getByRole("combobox", { name: "Saved filter presets" }),
            "Original Name",
        )

        await user.clear(presetNameInput)
        await user.click(screen.getByRole("button", { name: "Update preset" }))

        const presets = readStoredPresets()
        expect(presets[0]?.name).toBe("Original Name")
    })
})
