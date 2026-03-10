import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
    NotificationAlerts,
    type INotificationAlertsProps,
} from "@/components/layout/notification-alerts"
import { renderWithProviders } from "../../utils/render"

/**
 * Создаёт базовые props без уведомлений.
 */
function createEmptyProps(): INotificationAlertsProps {
    return {
        shortcutConflicts: [],
        multiTabNotice: undefined,
        providerDegradation: undefined,
        policyDriftNotice: undefined,
        restoredDraftMessage: undefined,
    }
}

describe("NotificationAlerts", (): void => {
    it("when no alerts active, then renders without visible alerts", (): void => {
        renderWithProviders(<NotificationAlerts {...createEmptyProps()} />)

        expect(screen.queryByText("Keyboard shortcut conflicts detected")).toBeNull()
        expect(screen.queryByText("Multi-tab sync applied")).toBeNull()
        expect(screen.queryByText("Provider degradation mode")).toBeNull()
    })

    it("when shortcut conflicts present, then renders conflict signatures", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                shortcutConflicts={[{ signature: "Ctrl+K", ids: ["search", "palette"] }]}
            />,
        )

        expect(screen.getByText("Ctrl+K: search, palette")).toBeDefined()
    })

    it("when multiple shortcut conflicts, then joins them with pipe", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                shortcutConflicts={[
                    { signature: "Ctrl+K", ids: ["search", "palette"] },
                    { signature: "Ctrl+S", ids: ["save", "submit"] },
                ]}
            />,
        )

        expect(screen.getByText("Ctrl+K: search, palette | Ctrl+S: save, submit")).toBeDefined()
    })

    it("when multiTabNotice set, then renders sync notice", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                multiTabNotice="Theme synced from another tab"
            />,
        )

        expect(screen.getByText("Theme synced from another tab")).toBeDefined()
    })

    it("when providerDegradation set, then renders degradation alert with details", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                providerDegradation={{
                    provider: "llm",
                    level: "degraded",
                    affectedFeatures: ["review", "summary"],
                    eta: "15 min",
                    runbookUrl: "https://example.com/runbook",
                }}
            />,
        )

        expect(screen.getByText(/llm degraded/)).toBeDefined()
        expect(screen.getByText(/review, summary/)).toBeDefined()
        expect(screen.getByText(/15 min/)).toBeDefined()
        expect(screen.getByText("Open runbook")).toBeDefined()
    })

    it("when policyDriftNotice set, then renders drift warning", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                policyDriftNotice="3 policies drifted since last scan"
            />,
        )

        expect(screen.getByText("3 policies drifted since last scan")).toBeDefined()
    })

    it("when restoredDraftMessage set, then renders session recovered alert", (): void => {
        renderWithProviders(
            <NotificationAlerts
                {...createEmptyProps()}
                restoredDraftMessage="Draft review restored"
            />,
        )

        expect(screen.getByText("Draft review restored")).toBeDefined()
    })
})
