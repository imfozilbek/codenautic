import { describe, expect, it } from "vitest"

import { SETTINGS_NAV_GROUPS, SETTINGS_NAV_ITEMS } from "@/lib/navigation/settings-nav-items"

describe("settings-nav-items", (): void => {
    it("SETTINGS_NAV_GROUPS has 7 groups", (): void => {
        expect(SETTINGS_NAV_GROUPS).toHaveLength(7)
    })

    it("SETTINGS_NAV_ITEMS has 22 items via flatMap", (): void => {
        expect(SETTINGS_NAV_ITEMS).toHaveLength(22)
    })

    it("has no duplicate route paths", (): void => {
        const paths = SETTINGS_NAV_ITEMS.map((item) => item.to)
        const unique = new Set(paths)
        expect(unique.size).toBe(paths.length)
    })

    it("all paths start with /settings", (): void => {
        for (const item of SETTINGS_NAV_ITEMS) {
            expect(typeof item.to).toBe("string")
            expect(String(item.to).startsWith("/settings")).toBe(true)
        }
    })

    it("flatMap integrity — items match sum of group items", (): void => {
        const groupItemCount = SETTINGS_NAV_GROUPS.reduce(
            (sum, group) => sum + group.items.length,
            0,
        )
        expect(SETTINGS_NAV_ITEMS).toHaveLength(groupItemCount)
    })

    it("every group has a unique key", (): void => {
        const keys = SETTINGS_NAV_GROUPS.map((group) => group.key)
        const unique = new Set(keys)
        expect(unique.size).toBe(keys.length)
    })
})
