import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AnimatedAlert, AnimatedMount } from "@/lib/motion/animated-presence"
import { renderWithProviders } from "../../utils/render"

describe("AnimatedAlert", (): void => {
    it("when visible, then renders children", (): void => {
        renderWithProviders(
            <AnimatedAlert isVisible={true}>
                <span>Alert content</span>
            </AnimatedAlert>,
        )

        expect(screen.getByText("Alert content")).toBeDefined()
    })

    it("when not visible, then does not render children", (): void => {
        renderWithProviders(
            <AnimatedAlert isVisible={false}>
                <span>Hidden content</span>
            </AnimatedAlert>,
        )

        expect(screen.queryByText("Hidden content")).toBeNull()
    })

    it("when visible with className, then applies className", (): void => {
        renderWithProviders(
            <AnimatedAlert className="custom-class" isVisible={true}>
                <span>Styled</span>
            </AnimatedAlert>,
        )

        expect(screen.getByText("Styled")).toBeDefined()
    })
})

describe("AnimatedMount", (): void => {
    it("when rendered, then shows children", (): void => {
        renderWithProviders(
            <AnimatedMount motionKey="test-key">
                <span>Mount content</span>
            </AnimatedMount>,
        )

        expect(screen.getByText("Mount content")).toBeDefined()
    })

    it("when className provided, then applies it", (): void => {
        renderWithProviders(
            <AnimatedMount className="mount-class" motionKey="key">
                <span>Styled mount</span>
            </AnimatedMount>,
        )

        expect(screen.getByText("Styled mount")).toBeDefined()
    })

    it("when mode is sync, then renders with sync mode", (): void => {
        renderWithProviders(
            <AnimatedMount mode="sync" motionKey="sync-key">
                <span>Sync mode</span>
            </AnimatedMount>,
        )

        expect(screen.getByText("Sync mode")).toBeDefined()
    })
})
