import i18next from "i18next"
import { describe, expect, it } from "vitest"

import {
    createSettingsNavGroups,
    createSettingsNavItems,
    type ISettingsNavGroup,
    type ISettingsNavItem,
} from "@/lib/navigation/settings-nav-items"

describe("settings-nav-items", (): void => {
    it("createSettingsNavGroups returns 7 groups", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const groups = createSettingsNavGroups(t)
        expect(groups).toHaveLength(7)
    })

    it("createSettingsNavItems returns 22 items via flatMap", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const items = createSettingsNavItems(t)
        expect(items).toHaveLength(22)
    })

    it("has no duplicate route paths", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const items = createSettingsNavItems(t)
        const paths = items.map(
            (item: ISettingsNavItem): string | undefined => item.to as string | undefined,
        )
        const unique = new Set(paths)
        expect(unique.size).toBe(paths.length)
    })

    it("all paths start with /settings", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const items = createSettingsNavItems(t)
        for (const item of items) {
            expect(typeof item.to).toBe("string")
            expect(String(item.to).startsWith("/settings")).toBe(true)
        }
    })

    it("flatMap integrity — items match sum of group items", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const groups = createSettingsNavGroups(t)
        const items = createSettingsNavItems(t)
        const groupItemCount = groups.reduce(
            (sum: number, group: ISettingsNavGroup): number => sum + group.items.length,
            0,
        )
        expect(items).toHaveLength(groupItemCount)
    })

    it("every group has a unique key", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const groups = createSettingsNavGroups(t)
        const keys = groups.map((group: ISettingsNavGroup): string => group.key)
        const unique = new Set(keys)
        expect(unique.size).toBe(keys.length)
    })

    it("group labels are translated (not raw keys)", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const groups = createSettingsNavGroups(t)
        for (const group of groups) {
            expect(group.label.length).toBeGreaterThan(0)
            expect(group.label).not.toContain("settingsGroup.")
        }
    })

    it("item labels are translated (not raw keys)", (): void => {
        const t = i18next.getFixedT("ru", ["navigation"])
        const items = createSettingsNavItems(t)
        for (const item of items) {
            expect(item.label.length).toBeGreaterThan(0)
            expect(item.label).not.toContain("settingsItem.")
        }
    })
})
