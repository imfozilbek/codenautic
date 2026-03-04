import { fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChatStreamingResponse } from "@/components/chat/chat-streaming-response"
import { renderWithProviders } from "../utils/render"

function getMessageListElement(): HTMLUListElement {
    const messages = document.createElement("ul")
    Object.defineProperty(messages, "scrollHeight", { configurable: true, value: 99 })
    return messages
}

describe("chat streaming response", (): void => {
    beforeEach((): void => {
        vi.useFakeTimers()
    })

    afterEach((): void => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("показывает typing индикатор до появления токенов", (): void => {
        const messages = getMessageListElement()
        renderWithProviders(
            <ChatStreamingResponse
                isStreaming
                streamTokens={[]}
                scrollContainerRef={{ current: messages }}
            />,
        )

        expect(screen.getByText("AI пишет…")).not.toBeNull()
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    })

    it("рендерит содержимое по токенам с заданной задержкой", async (): Promise<void> => {
        const messages = getMessageListElement()
        renderWithProviders(
            <ChatStreamingResponse
                isStreaming
                streamTokens={["hello", " ", "world"]}
                tokenDelayMs={10}
                scrollContainerRef={{ current: messages }}
            />,
        )

        expect(screen.queryByText("hello world")).toBeNull()
        await vi.advanceTimersByTimeAsync(60)
        expect(
            screen.getByText((content): boolean => {
                return content.includes("hello")
            }),
        ).not.toBeNull()
    })

    it("показывает кнопку Cancel и вызывает callback", (): void => {
        const messages = getMessageListElement()
        const onCancel = vi.fn()
        renderWithProviders(
            <ChatStreamingResponse
                isStreaming
                onCancel={onCancel}
                streamTokens={["a"]}
                scrollContainerRef={{ current: messages }}
            />,
        )

        const button = screen.getByRole("button", { name: "Cancel" })
        expect(button).not.toBeDisabled()
        fireEvent.click(button)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("скроллит контейнер до конца во время стрима", async (): Promise<void> => {
        const messages = getMessageListElement()
        const scrollSpy = vi.fn()
        Object.defineProperty(messages, "scrollTo", {
            configurable: true,
            value: scrollSpy,
        })

        renderWithProviders(
            <ChatStreamingResponse
                isStreaming
                streamTokens={["a", "b"]}
                tokenDelayMs={10}
                scrollContainerRef={{ current: messages }}
            />,
        )

        await vi.advanceTimersByTimeAsync(10)
        expect(scrollSpy.mock.calls.length).toBeGreaterThan(0)
    })
})
