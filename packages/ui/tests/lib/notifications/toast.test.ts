import { describe, expect, it, vi } from "vitest"

const mockSuccess = vi.fn()
const mockInfo = vi.fn()
const mockWarning = vi.fn()
const mockDanger = vi.fn()
const mockError = vi.fn()

vi.mock("@heroui/react", () => ({
    toast: {
        success: mockSuccess,
        info: mockInfo,
        warning: mockWarning,
        danger: mockDanger,
        error: mockError,
    },
}))

describe("toast helpers", (): void => {
    it("when showToastSuccess is called, then delegates to toast.success", async (): Promise<void> => {
        const { showToastSuccess } = await import("@/lib/notifications/toast")

        showToastSuccess("Operation complete")

        expect(mockSuccess).toHaveBeenCalledTimes(1)
        expect(mockSuccess).toHaveBeenCalledWith("Operation complete")
    })

    it("when showToastInfo is called, then delegates to toast.info", async (): Promise<void> => {
        const { showToastInfo } = await import("@/lib/notifications/toast")

        showToastInfo("FYI message")

        expect(mockInfo).toHaveBeenCalledTimes(1)
        expect(mockInfo).toHaveBeenCalledWith("FYI message")
    })

    it("when showToastWarning is called, then delegates to toast.warning", async (): Promise<void> => {
        const { showToastWarning } = await import("@/lib/notifications/toast")

        showToastWarning("Be careful")

        expect(mockWarning).toHaveBeenCalledTimes(1)
        expect(mockWarning).toHaveBeenCalledWith("Be careful")
    })

    it("when showToastError is called and danger exists, then delegates to toast.danger", async (): Promise<void> => {
        const { showToastError } = await import("@/lib/notifications/toast")

        showToastError("Something broke")

        expect(mockDanger).toHaveBeenCalledTimes(1)
        expect(mockDanger).toHaveBeenCalledWith("Something broke")
        expect(mockError).toHaveBeenCalledTimes(0)
    })
})

describe("toast error fallback", (): void => {
    it("when showToastError is called and danger is undefined, then falls back to toast.error", async (): Promise<void> => {
        vi.resetModules()
        vi.doMock("@heroui/react", () => {
            const errorFn = vi.fn()
            return {
                toast: {
                    success: vi.fn(),
                    info: vi.fn(),
                    warning: vi.fn(),
                    danger: undefined,
                    error: errorFn,
                    __errorFn: errorFn,
                },
            }
        })

        const heroui = await import("@heroui/react")
        const toastRef = heroui.toast as unknown as Record<string, unknown>
        const errorFn = toastRef.__errorFn as ReturnType<typeof vi.fn>

        const { showToastError } = await import("@/lib/notifications/toast")

        showToastError("Fallback error")

        expect(errorFn).toHaveBeenCalledTimes(1)
        expect(errorFn).toHaveBeenCalledWith("Fallback error")
    })

    it("when showToastError is called and both danger and error are undefined, then does nothing", async (): Promise<void> => {
        vi.resetModules()
        vi.doMock("@heroui/react", () => ({
            toast: {
                success: vi.fn(),
                info: vi.fn(),
                warning: vi.fn(),
                danger: undefined,
                error: undefined,
            },
        }))

        const { showToastError } = await import("@/lib/notifications/toast")

        expect((): void => {
            showToastError("Silent failure")
        }).not.toThrow()
    })
})
