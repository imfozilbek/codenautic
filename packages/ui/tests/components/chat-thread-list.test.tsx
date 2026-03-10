import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { ChatThreadList, type IChatThread } from "@/components/chat/chat-thread-list"
import { renderWithProviders } from "../utils/render"

const threads: ReadonlyArray<IChatThread> = [
    {
        ccr: "1201",
        id: "thread-1",
        isArchived: false,
        repo: "repo-alpha",
        title: "Alpha review",
    },
    {
        ccr: "1202",
        id: "thread-2",
        isArchived: false,
        repo: "repo-beta",
        title: "Beta review",
    },
]

function ChatThreadListHarness(): ReactElement {
    return (
        <ChatThreadList
            activeThreadId="thread-2"
            onArchiveThread={(): void => {
                return undefined
            }}
            onCloseThread={(): void => {
                return undefined
            }}
            onNewThread={(): void => {
                return undefined
            }}
            onSelectThread={(): void => {
                return undefined
            }}
            threads={threads}
        />
    )
}

describe("chat thread list", (): void => {
    it("рендерит список тредов с выделением активного", (): void => {
        renderWithProviders(<ChatThreadListHarness />)

        expect(screen.getByRole("heading", { name: "Threads" })).not.toBeNull()
        expect(screen.getByText("Alpha review")).not.toBeNull()
        expect(screen.getByText("Beta review")).not.toBeNull()
        expect(
            screen.getByRole("button", { name: "Open thread Beta review (repo-beta, CCR 1202)" }),
        ).not.toBeNull()
        const betaButtons = screen.getAllByRole("button", { name: /Beta review/ })
        const activeButton = betaButtons.find(
            (button): boolean => button.getAttribute("aria-pressed") === "true",
        )
        expect(activeButton).not.toBeUndefined()
    })

    it("вызывает callback при создании нового треда", async (): Promise<void> => {
        const user = userEvent.setup()
        const onNewThread = vi.fn()
        renderWithProviders(
            <ChatThreadList
                activeThreadId="thread-2"
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={onNewThread}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const newThreadButton = screen.getByRole("button", { name: /New thread/ })
        await user.click(newThreadButton)
        expect(onNewThread).toHaveBeenCalledTimes(1)
    })

    it("фильтрует треды по repo и ccr", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<ChatThreadListHarness />)

        const repoFilter = screen.getByLabelText("Filter by repo")
        await user.type(repoFilter, "beta")
        expect(screen.getByText("Beta review")).not.toBeNull()
        expect(screen.queryByText("Alpha review")).toBeNull()

        const ccrFilter = screen.getByLabelText("Filter by CCR")
        await user.type(ccrFilter, "1202")
        expect(screen.getByText("Beta review")).not.toBeNull()
    })

    it("передает выбор и действия по треду", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSelectThread = vi.fn()
        const onCloseThread = vi.fn()
        const onArchiveThread = vi.fn()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={onArchiveThread}
                onCloseThread={onCloseThread}
                onNewThread={vi.fn()}
                onSelectThread={onSelectThread}
                threads={threads}
            />,
        )

        const threadButtons = screen.getAllByRole("button", { name: /Alpha review/ })
        const threadButton = threadButtons[0]
        if (threadButton === undefined) {
            throw new Error("Expected thread button to exist")
        }
        await user.click(threadButton)
        expect(onSelectThread).toHaveBeenCalledWith("thread-1")

        const closeButton = screen.getByRole("button", {
            name: "Close thread Alpha review",
        })
        await user.click(closeButton)
        expect(onCloseThread).toHaveBeenCalledWith("thread-1")

        const archiveButton = screen.getByRole("button", {
            name: "Archive thread Alpha review",
        })
        await user.click(archiveButton)
        expect(onArchiveThread).toHaveBeenCalledWith("thread-1")
    })

    it("показывает пустой список, если фильтры не нашли тредов", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const repoFilter = screen.getByLabelText("Filter by repo")
        await user.type(repoFilter, "not-existing")
        expect(screen.getByText("No threads found")).not.toBeNull()
    })

    it("показывает пустой список, когда threads пуст", (): void => {
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={[]}
            />,
        )

        expect(screen.getByText("No threads found")).not.toBeNull()
    })

    it("фильтрует треды только по ccr, оставляя repo незаполненным", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const ccrFilter = screen.getByLabelText("Filter by CCR")
        await user.type(ccrFilter, "1201")
        expect(screen.getByText("Alpha review")).not.toBeNull()
        expect(screen.queryByText("Beta review")).toBeNull()
    })

    it("очистка repo фильтра восстанавливает все треды", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const repoFilter = screen.getByLabelText("Filter by repo")
        await user.type(repoFilter, "alpha")
        expect(screen.queryByText("Beta review")).toBeNull()

        await user.clear(repoFilter)
        expect(screen.getByText("Alpha review")).not.toBeNull()
        expect(screen.getByText("Beta review")).not.toBeNull()
    })

    it("не подсвечивает треды, когда activeThreadId не задан", (): void => {
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const allPressedButtons = screen
            .getAllByRole("button", { name: /Open thread/ })
            .filter((button): boolean => button.getAttribute("aria-pressed") === "true")
        expect(allPressedButtons.length).toBe(0)
    })

    it("рендерит repo и ccr info в каждом thread item", (): void => {
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        expect(screen.getByText("repo-alpha")).not.toBeNull()
        expect(screen.getByText("CCR: 1201")).not.toBeNull()
        expect(screen.getByText("repo-beta")).not.toBeNull()
        expect(screen.getByText("CCR: 1202")).not.toBeNull()
    })

    it("вызывает close и archive для второго треда", async (): Promise<void> => {
        const user = userEvent.setup()
        const onCloseThread = vi.fn()
        const onArchiveThread = vi.fn()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={onArchiveThread}
                onCloseThread={onCloseThread}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const closeButton = screen.getByRole("button", {
            name: "Close thread Beta review",
        })
        await user.click(closeButton)
        expect(onCloseThread).toHaveBeenCalledWith("thread-2")

        const archiveButton = screen.getByRole("button", {
            name: "Archive thread Beta review",
        })
        await user.click(archiveButton)
        expect(onArchiveThread).toHaveBeenCalledWith("thread-2")
    })

    it("фильтрует case-insensitive по repo", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        const repoFilter = screen.getByLabelText("Filter by repo")
        await user.type(repoFilter, "ALPHA")
        expect(screen.getByText("Alpha review")).not.toBeNull()
        expect(screen.queryByText("Beta review")).toBeNull()
    })

    it("рендерит aria-label 'Conversation threads' для списка", (): void => {
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        expect(screen.getByRole("list", { name: "Conversation threads" })).not.toBeNull()
    })

    it("рендерит aside с aria-label 'Chat threads'", (): void => {
        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={threads}
            />,
        )

        expect(screen.getByRole("complementary", { name: "Chat threads" })).not.toBeNull()
    })

    it("комбинированный фильтр repo + ccr сужает результаты", async (): Promise<void> => {
        const user = userEvent.setup()
        const extendedThreads: ReadonlyArray<IChatThread> = [
            ...threads,
            {
                ccr: "1201",
                id: "thread-3",
                isArchived: false,
                repo: "repo-gamma",
                title: "Gamma review",
            },
        ]

        renderWithProviders(
            <ChatThreadList
                onArchiveThread={vi.fn()}
                onCloseThread={vi.fn()}
                onNewThread={vi.fn()}
                onSelectThread={vi.fn()}
                threads={extendedThreads}
            />,
        )

        const repoFilter = screen.getByLabelText("Filter by repo")
        await user.type(repoFilter, "alpha")
        expect(screen.getByText("Alpha review")).not.toBeNull()
        expect(screen.queryByText("Beta review")).toBeNull()
        expect(screen.queryByText("Gamma review")).toBeNull()

        const ccrFilter = screen.getByLabelText("Filter by CCR")
        await user.type(ccrFilter, "1201")
        expect(screen.getByText("Alpha review")).not.toBeNull()
    })
})
