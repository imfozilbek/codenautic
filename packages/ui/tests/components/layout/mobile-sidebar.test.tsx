import { describe, expect, it, vi } from "vitest"

import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { renderWithProviders } from "../../utils/render"

describe("MobileSidebar", (): void => {
    it("when rendered with isOpen true, then mounts without error", (): void => {
        const { container } = renderWithProviders(
            <MobileSidebar isOpen={true} onOpenChange={vi.fn()} />,
        )

        expect(container).toBeDefined()
    })

    it("when rendered with custom title, then mounts without error", (): void => {
        const { container } = renderWithProviders(
            <MobileSidebar isOpen={true} onOpenChange={vi.fn()} title="Menu" />,
        )

        expect(container).toBeDefined()
    })

    it("when rendered with footer slot, then mounts without error", (): void => {
        const { container } = renderWithProviders(
            <MobileSidebar footerSlot={<div>Footer</div>} isOpen={true} onOpenChange={vi.fn()} />,
        )

        expect(container).toBeDefined()
    })

    it("when rendered with isOpen false, then mounts without error", (): void => {
        const { container } = renderWithProviders(
            <MobileSidebar isOpen={false} onOpenChange={vi.fn()} />,
        )

        expect(container).toBeDefined()
    })
})
