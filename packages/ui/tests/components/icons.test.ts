import { describe, expect, it } from "vitest"

import * as AppIcons from "@/components/icons/app-icons"

const EXPECTED_ICON_NAMES: ReadonlyArray<string> = [
    "Activity",
    "AlertTriangle",
    "Archive",
    "ArrowDownRight",
    "ArrowUpRight",
    "Bell",
    "BellRing",
    "Bug",
    "Bot",
    "Building2",
    "ChartNoAxesColumn",
    "ChartPie",
    "ChevronDown",
    "ChevronLeft",
    "ChevronRight",
    "Coins",
    "Copy",
    "CreditCard",
    "Eye",
    "EyeOff",
    "FileClock",
    "FolderKanban",
    "GitBranch",
    "GitPullRequest",
    "House",
    "Inbox",
    "KeyRound",
    "Laptop",
    "LibraryBig",
    "LifeBuoy",
    "Link2",
    "Menu",
    "Minus",
    "Moon",
    "Paintbrush",
    "RefreshCcw",
    "Rocket",
    "Search",
    "Settings",
    "Shield",
    "ShieldCheck",
    "SlidersHorizontal",
    "Sun",
    "Users",
    "Webhook",
    "X",
]

describe("app-icons", (): void => {
    it("when imported, then exports all expected icon components", (): void => {
        const exportedNames = Object.keys(AppIcons)

        for (const name of EXPECTED_ICON_NAMES) {
            expect(exportedNames).toContain(name)
        }
    })

    it("when imported, then each export is a valid React component function", (): void => {
        const exports = AppIcons as Record<string, unknown>

        for (const name of EXPECTED_ICON_NAMES) {
            const icon = exports[name]
            expect(typeof icon).toBe("object")
        }
    })

    it("when imported, then exports exactly the expected number of icons", (): void => {
        const exportedNames = Object.keys(AppIcons)
        expect(exportedNames.length).toBe(EXPECTED_ICON_NAMES.length)
    })
})
