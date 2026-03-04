import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
    RootCauseChainViewer,
    type IRootCauseIssueDescriptor,
} from "@/components/graphs/root-cause-chain-viewer"
import { renderWithProviders } from "../utils/render"

const TEST_ISSUES: ReadonlyArray<IRootCauseIssueDescriptor> = [
    {
        chain: [
            {
                description: "Queue retry threshold was increased beyond safe defaults.",
                fileId: "src/api/repository.ts",
                id: "retry-threshold",
                label: "Retry threshold mismatch",
                type: "event",
            },
            {
                description: "Worker throughput dropped and backlog stayed above baseline.",
                fileId: "src/worker/index.ts",
                id: "throughput-drop",
                label: "Throughput degradation",
                type: "metric",
            },
        ],
        id: "issue-queue",
        severity: "high",
        title: "Queue latency spike",
    },
    {
        chain: [
            {
                description: "Rate limiter was disabled in provider adapter.",
                fileId: "src/api/auth.ts",
                id: "limiter-disabled",
                label: "Rate limiter disabled",
                type: "module",
            },
            {
                description: "Burst requests triggered cascading provider retries.",
                fileId: "src/api/repository.ts",
                id: "burst-retries",
                label: "Burst retries",
                type: "event",
            },
        ],
        id: "issue-provider",
        severity: "critical",
        title: "Provider degradation cascade",
    },
]

describe("RootCauseChainViewer", (): void => {
    it("отображает issue list и causal chain выбранной проблемы", (): void => {
        renderWithProviders(<RootCauseChainViewer issues={TEST_ISSUES} />)

        expect(screen.getByText("Queue latency spike")).not.toBeNull()
        expect(screen.getByText("Provider degradation cascade")).not.toBeNull()
        expect(screen.getByText("Causal chain")).not.toBeNull()
        expect(
            screen.getByRole("button", {
                name: "Open chain node Retry threshold mismatch",
            }),
        ).not.toBeNull()
    })

    it("позволяет переключать issue и узлы causal chain", async (): Promise<void> => {
        const user = userEvent.setup()
        renderWithProviders(<RootCauseChainViewer issues={TEST_ISSUES} />)

        await user.click(
            screen.getByRole("button", {
                name: "Open causal issue Provider degradation cascade",
            }),
        )
        expect(
            screen.getByRole("button", {
                name: "Open chain node Rate limiter disabled",
            }),
        ).not.toBeNull()

        await user.click(
            screen.getByRole("button", {
                name: "Open chain node Burst retries",
            }),
        )
        expect(screen.getByText("Burst requests triggered cascading provider retries.")).not.toBeNull()
    })

    it("сообщает выбранную цепочку для 3D chain navigation", async (): Promise<void> => {
        const user = userEvent.setup()
        const onChainFocusChange = vi.fn()

        renderWithProviders(
            <RootCauseChainViewer issues={TEST_ISSUES} onChainFocusChange={onChainFocusChange} />,
        )

        expect(onChainFocusChange).toHaveBeenCalledWith(
            expect.objectContaining({
                activeFileId: "src/api/repository.ts",
                chainFileIds: ["src/api/repository.ts", "src/worker/index.ts"],
                issueId: "issue-queue",
            }),
        )

        await user.click(
            screen.getByRole("button", {
                name: "Open causal issue Provider degradation cascade",
            }),
        )

        expect(onChainFocusChange).toHaveBeenLastCalledWith(
            expect.objectContaining({
                activeFileId: "src/api/auth.ts",
                chainFileIds: ["src/api/auth.ts", "src/api/repository.ts"],
                issueId: "issue-provider",
            }),
        )
    })
})
