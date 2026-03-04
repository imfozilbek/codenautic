import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import {
    ChatThreadList,
    type IChatThread,
} from "@/components/chat/chat-thread-list"
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
})
