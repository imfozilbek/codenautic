import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { ChatInput, type IChatInputProps } from "@/components/chat/chat-input"
import { renderWithProviders } from "../utils/render"

function ChatInputHarness(props: Omit<IChatInputProps, "draft" | "onDraftChange">): ReactElement {
    const [draft, setDraft] = useState("")

    const handleSubmit = (message: string): void => {
        props.onSubmit(message)
        setDraft("")
    }

    return (
        <ChatInput
            {...props}
            draft={draft}
            onDraftChange={(value): void => {
                setDraft(value)
            }}
            onSubmit={handleSubmit}
        />
    )
}

describe("chat input", (): void => {
    it("отправляет сообщение по Enter и очищает поле", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        renderWithProviders(
            <ChatInputHarness onSubmit={onSubmit} placeholder="Type a message and press Enter" />,
        )

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.type(textarea, "hello")
        await user.keyboard("{Enter}")

        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith("hello")
    })

    it("не отправляет сообщение на Shift+Enter", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.type(textarea, "line1{shift>}{Enter}{/shift}line2")
        await user.keyboard("{Escape}")

        expect(onSubmit).toHaveBeenCalledTimes(0)
        expect(textarea).toHaveValue("line1\nline2")
    })

    it("показывает счетчик символов", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} maxLength={10} />)

        const counter = screen.getByLabelText("Message character count")
        const textarea = screen.getByRole("textbox", { name: "Message input" })
        expect(counter).toHaveTextContent("0/10")

        await user.type(textarea, "abc")
        expect(counter).toHaveTextContent("3/10")
    })

    it("не отправляет сообщение во время IME composition на Enter", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.type(textarea, "こんにちは")
        fireEvent.keyDown(textarea, {
            key: "Enter",
            shiftKey: false,
            isComposing: true,
        })

        expect(onSubmit).toHaveBeenCalledTimes(0)
    })

    it("рендерит селектор файла и рендерит submit блокировку во время loading", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        renderWithProviders(
            <ChatInputHarness
                contextOptions={[
                    {
                        id: "file-a",
                        label: "file-a.ts",
                    },
                    {
                        id: "file-b",
                        label: "file-b.ts",
                    },
                ]}
                isLoading
                onSubmit={onSubmit}
            />,
        )

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.type(textarea, "hello")

        const submitButton = screen.getByRole("button", { name: "Отправить" })
        expect(submitButton).toBeDisabled()
    })

    it("рендерит и запускает quick actions", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        const onQuickAction = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                onQuickAction={onQuickAction}
                onSubmit={onSubmit}
                quickActions={[
                    {
                        id: "qa-explain",
                        label: "explain this file",
                        message: "explain file diff",
                    },
                    {
                        id: "qa-summary",
                        label: "summarize changes",
                        message: "summary",
                    },
                ]}
            />,
        )

        const explainButton = screen.getByRole("button", { name: "explain this file" })
        await user.click(explainButton)
        expect(onQuickAction).toHaveBeenCalledTimes(1)
        expect(onQuickAction).toHaveBeenCalledWith("explain file diff")
    })

    it("when quick action is pressed while loading, then does not call onQuickAction", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        const onQuickAction = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                isLoading={true}
                onQuickAction={onQuickAction}
                onSubmit={onSubmit}
                quickActions={[
                    {
                        id: "qa-explain",
                        label: "explain this file",
                        message: "explain file diff",
                    },
                ]}
            />,
        )

        const explainButton = screen.getByRole("button", { name: "explain this file" })
        await user.click(explainButton)
        expect(onQuickAction).toHaveBeenCalledTimes(0)
    })

    it("when form is submitted via button click, then calls onSubmit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.type(textarea, "test message")

        const submitButton = screen.getByRole("button", { name: "Отправить" })
        await user.click(submitButton)

        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith("test message")
    })

    it("when draft is empty, then submit button is disabled", (): void => {
        const onSubmit = vi.fn()
        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        const submitButton = screen.getByRole("button", { name: "Отправить" })
        expect(submitButton).toBeDisabled()
    })

    it("when draft exceeds maxLength, then submit button is disabled", (): void => {
        const onSubmit = vi.fn()
        const onDraftChange = vi.fn()

        renderWithProviders(
            <ChatInput
                draft="this text is too long"
                maxLength={5}
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
            />,
        )

        const submitButton = screen.getByRole("button", { name: "Отправить" })
        expect(submitButton).toBeDisabled()
    })

    it("when Enter is pressed on empty draft, then does not call onSubmit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.keyboard("{Enter}")

        expect(onSubmit).toHaveBeenCalledTimes(0)
    })

    it("when contextOptions are provided, then renders context selector", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                contextOptions={[
                    { id: "file-a", label: "file-a.ts" },
                    { id: "file-b", label: "file-b.ts" },
                ]}
                onSubmit={onSubmit}
            />,
        )

        expect(screen.getByLabelText("File context")).not.toBeNull()
    })

    it("when contextOptions are empty, then does not render context selector", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(<ChatInputHarness contextOptions={[]} onSubmit={onSubmit} />)

        expect(screen.queryByLabelText("File context")).toBeNull()
    })

    it("when custom placeholder is provided, then textarea shows it", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness onSubmit={onSubmit} placeholder="Введите сообщение" />,
        )

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        expect(textarea).toHaveAttribute("placeholder", "Введите сообщение")
    })

    it("when custom inputAriaLabel is provided, then textarea uses it", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness onSubmit={onSubmit} inputAriaLabel="Поле ввода сообщения" />,
        )

        expect(screen.getByRole("textbox", { name: "Поле ввода сообщения" })).not.toBeNull()
    })

    it("when custom counterAriaLabel is provided, then counter uses it", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness onSubmit={onSubmit} counterAriaLabel="Счётчик символов" />,
        )

        expect(screen.getByLabelText("Счётчик символов")).not.toBeNull()
    })

    it("when custom contextAriaLabel is provided, then context selector uses it", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                contextOptions={[{ id: "f1", label: "f1.ts" }]}
                contextAriaLabel="Выбор контекста"
                onSubmit={onSubmit}
            />,
        )

        expect(screen.getByLabelText("Выбор контекста")).not.toBeNull()
    })

    it("when no quickActions are provided, then does not render quick action buttons", (): void => {
        const onSubmit = vi.fn()

        renderWithProviders(<ChatInputHarness onSubmit={onSubmit} />)

        expect(screen.queryByRole("button", { name: "explain this file" })).toBeNull()
    })

    it("when selectedContextId is provided externally, then uses it as initial context", (): void => {
        const onSubmit = vi.fn()
        const onContextChange = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                contextOptions={[
                    { id: "file-a", label: "file-a.ts" },
                    { id: "file-b", label: "file-b.ts" },
                ]}
                selectedContextId="file-b"
                onContextChange={onContextChange}
                onSubmit={onSubmit}
            />,
        )

        expect(screen.getByLabelText("File context")).not.toBeNull()
    })

    it("when selectedContextId does not match any option, then resets to empty", (): void => {
        const onSubmit = vi.fn()
        const onContextChange = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                contextOptions={[{ id: "file-a", label: "file-a.ts" }]}
                selectedContextId="non-existent"
                onContextChange={onContextChange}
                onSubmit={onSubmit}
            />,
        )

        expect(screen.getByLabelText("File context")).not.toBeNull()
    })

    it("when draft is whitespace only, then submit button is disabled", (): void => {
        const onSubmit = vi.fn()
        const onDraftChange = vi.fn()

        renderWithProviders(
            <ChatInput
                draft="   "
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
            />,
        )

        const submitButton = screen.getByRole("button", { name: "Отправить" })
        expect(submitButton).toBeDisabled()
    })

    it("when no maxLength is provided, then defaults to 4000", (): void => {
        const onSubmit = vi.fn()
        const onDraftChange = vi.fn()

        renderWithProviders(
            <ChatInput
                draft="abc"
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
            />,
        )

        const counter = screen.getByLabelText("Message character count")
        expect(counter).toHaveTextContent("3/4000")
    })

    it("when contextOptions change to empty, then hides context selector", (): void => {
        const onSubmit = vi.fn()
        const onContextChange = vi.fn()

        const { rerender } = renderWithProviders(
            <ChatInput
                contextOptions={[{ id: "file-a", label: "file-a.ts" }]}
                draft=""
                onContextChange={onContextChange}
                onDraftChange={vi.fn()}
                onSubmit={onSubmit}
            />,
        )

        expect(screen.getByLabelText("File context")).not.toBeNull()

        rerender(
            <ChatInput
                contextOptions={[]}
                draft=""
                onContextChange={onContextChange}
                onDraftChange={vi.fn()}
                onSubmit={onSubmit}
            />,
        )

        expect(screen.queryByLabelText("File context")).toBeNull()
    })

    it("when onQuickAction is not provided, then quick action button does not throw", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                onSubmit={onSubmit}
                quickActions={[
                    {
                        id: "qa-test",
                        label: "test action",
                        message: "test message",
                    },
                ]}
            />,
        )

        const actionButton = screen.getByRole("button", { name: "test action" })
        await user.click(actionButton)

        expect(onSubmit).toHaveBeenCalledTimes(0)
    })

    it("when contextOptions provided without selectedContextId, then auto-selects first option", (): void => {
        const onSubmit = vi.fn()
        const onContextChange = vi.fn()

        renderWithProviders(
            <ChatInputHarness
                contextOptions={[
                    { id: "file-x", label: "file-x.ts" },
                    { id: "file-y", label: "file-y.ts" },
                ]}
                onContextChange={onContextChange}
                onSubmit={onSubmit}
            />,
        )

        expect(onContextChange).toHaveBeenCalledWith("file-x")
    })

    it("when onContextChange is not provided, then context auto-selection does not throw", (): void => {
        const onSubmit = vi.fn()

        expect((): void => {
            renderWithProviders(
                <ChatInputHarness
                    contextOptions={[{ id: "file-a", label: "file-a.ts" }]}
                    onSubmit={onSubmit}
                />,
            )
        }).not.toThrow()
    })

    it("when Enter is pressed while loading, then does not call onSubmit", async (): Promise<void> => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        const onDraftChange = vi.fn()

        renderWithProviders(
            <ChatInput
                draft="hello"
                isLoading={true}
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
            />,
        )

        const textarea = screen.getByRole("textbox", { name: "Message input" })
        await user.click(textarea)
        await user.keyboard("{Enter}")

        expect(onSubmit).toHaveBeenCalledTimes(0)
    })
})
