import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    TeamLeaderboard,
    type ITeamLeaderboardEntry,
} from "@/components/graphs/team-leaderboard"
import { renderWithProviders } from "../utils/render"

const TEST_ENTRIES: ReadonlyArray<ITeamLeaderboardEntry> = [
    {
        fileIds: ["src/api/auth.ts"],
        ownerId: "alice",
        ownerName: "Alice",
        ownership: { month: 64, quarter: 61, sprint: 67 },
        primaryFileId: "src/api/auth.ts",
        quality: { month: 88, quarter: 84, sprint: 92 },
        velocity: { month: 72, quarter: 68, sprint: 74 },
    },
    {
        fileIds: ["src/worker/retry.ts"],
        ownerId: "bob",
        ownerName: "Bob",
        ownership: { month: 73, quarter: 70, sprint: 79 },
        primaryFileId: "src/worker/retry.ts",
        quality: { month: 76, quarter: 74, sprint: 78 },
        velocity: { month: 94, quarter: 90, sprint: 98 },
    },
    {
        fileIds: ["src/ui/list.tsx"],
        ownerId: "charlie",
        ownerName: "Charlie",
        ownership: { month: 86, quarter: 91, sprint: 82 },
        primaryFileId: "src/ui/list.tsx",
        quality: { month: 71, quarter: 69, sprint: 74 },
        velocity: { month: 65, quarter: 63, sprint: 68 },
    },
]

describe("TeamLeaderboard", (): void => {
    it("рендерит leaderboard и переключает сортировку по метрике/периоду", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<TeamLeaderboard entries={TEST_ENTRIES} />)

        expect(screen.getByText("Team leaderboard")).not.toBeNull()
        expect(screen.getByLabelText("Team leaderboard ranking")).not.toBeNull()
        let rankButtons = screen.getAllByRole("button", {
            name: /Inspect leaderboard contributor /,
        })
        expect(rankButtons[0]?.getAttribute("aria-label")).toContain("Alice")

        await user.click(screen.getByRole("button", { name: "Metric velocity" }))
        rankButtons = screen.getAllByRole("button", {
            name: /Inspect leaderboard contributor /,
        })
        expect(rankButtons[0]?.getAttribute("aria-label")).toContain("Bob")

        await user.click(screen.getByRole("button", { name: "Metric ownership" }))
        await user.click(screen.getByRole("button", { name: "Quarter" }))
        rankButtons = screen.getAllByRole("button", {
            name: /Inspect leaderboard contributor /,
        })
        expect(rankButtons[0]?.getAttribute("aria-label")).toContain("Charlie")
    })

    it("вызывает onSelectEntry при выборе участника", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectEntry = vi.fn()
        renderWithProviders(<TeamLeaderboard entries={TEST_ENTRIES} onSelectEntry={onSelectEntry} />)

        await user.click(
            screen.getByRole("button", { name: "Inspect leaderboard contributor Alice" }),
        )

        expect(onSelectEntry).toHaveBeenCalledTimes(1)
        expect(onSelectEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerId: "alice",
                primaryFileId: "src/api/auth.ts",
            }),
        )
    })
})
