import { describe, expect, it } from "vitest"

import { isMultiTabSyncMessage } from "@/lib/sync/multi-tab-consistency"

describe("multi-tab consistency payload", (): void => {
    it("валидирует tenant sync сообщение", (): void => {
        const isValid = isMultiTabSyncMessage({
            tenantId: "platform-team",
            type: "tenant",
        })

        expect(isValid).toBe(true)
    })

    it("валидирует permissions sync сообщение", (): void => {
        const isValid = isMultiTabSyncMessage({
            role: "lead",
            type: "permissions",
        })

        expect(isValid).toBe(true)
    })

    it("отклоняет некорректный payload", (): void => {
        const isValid = isMultiTabSyncMessage({
            role: "super-admin",
            type: "permissions",
        })

        expect(isValid).toBe(false)
    })
})
