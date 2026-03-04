import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    ChatContextIndicator,
    type IChatPanelContextInfo,
} from "@/components/chat/chat-context-indicator"
import { renderWithProviders } from "../utils/render"

const contextList: ReadonlyArray<IChatPanelContextInfo> = [
    {
        attachedFiles: ["src/index.ts", "src/api.ts", "src/utils.ts", "src/types.ts"],
        ccrNumber: "1201",
        id: "context-alpha",
        repoName: "repo-alpha",
    },
    {
        attachedFiles: ["README.md"],
        ccrNumber: "1202",
        id: "context-beta",
        repoName: "repo-beta",
    },
]

describe("chat context indicator", (): void => {
    it("рендерит текущий контекст с repo и CCR и списком файлов", (): void => {
        renderWithProviders(
            <ChatContextIndicator
                activeContextId="context-alpha"
                contexts={contextList}
                onContextChange={vi.fn()}
            />,
        )

        expect(screen.getByText("Conversation context")).not.toBeNull()
        expect(screen.getByText("repo-alpha — CCR #1201")).not.toBeNull()
        expect(screen.getByText("src/index.ts, src/api.ts, src/utils.ts +1 more")).not.toBeNull()
    })

    it("вызывает onContextChange при смене контекста", async (): Promise<void> => {
        const user = userEvent.setup()
        const onContextChange = vi.fn()

        renderWithProviders(
            <ChatContextIndicator
                activeContextId="context-alpha"
                contexts={contextList}
                onContextChange={onContextChange}
            />,
        )

        const changeButton = screen.getByRole("button", { name: "Change context" })
        await user.click(changeButton)

        const second = screen.getByRole("option", { name: "Change context to repo-beta — CCR #1202" })
        await user.click(second)

        expect(onContextChange).toHaveBeenCalledTimes(1)
        expect(onContextChange).toHaveBeenCalledWith("context-beta")
    })
})
