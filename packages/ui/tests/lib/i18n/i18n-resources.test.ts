import { describe, expect, it } from "vitest"

import { I18N_NAMESPACES, I18N_RESOURCES } from "@/lib/i18n/i18n-resources"

describe("I18N_RESOURCES", (): void => {
    it("when accessed, then contains both en and ru locales", (): void => {
        expect(Object.keys(I18N_RESOURCES)).toEqual(["en", "ru"])
    })

    it("when accessed, then en locale contains all namespaces", (): void => {
        const enNamespaces = Object.keys(I18N_RESOURCES.en).sort()
        const expectedNamespaces = [...I18N_NAMESPACES].sort()

        expect(enNamespaces).toEqual(expectedNamespaces)
    })

    it("when accessed, then ru locale contains all namespaces", (): void => {
        const ruNamespaces = Object.keys(I18N_RESOURCES.ru).sort()
        const expectedNamespaces = [...I18N_NAMESPACES].sort()

        expect(ruNamespaces).toEqual(expectedNamespaces)
    })

    it("when accessed, then en.common has appTitle key", (): void => {
        expect(I18N_RESOURCES.en.common).toHaveProperty("appTitle")
    })

    it("when accessed, then ru.common has appTitle key", (): void => {
        expect(I18N_RESOURCES.ru.common).toHaveProperty("appTitle")
    })

    it("when accessed, then en and ru have same keys for auth namespace", (): void => {
        const enKeys = Object.keys(I18N_RESOURCES.en.auth).sort()
        const ruKeys = Object.keys(I18N_RESOURCES.ru.auth).sort()

        expect(enKeys).toEqual(ruKeys)
    })

    it("when accessed, then en and ru have same keys for system namespace", (): void => {
        const enKeys = Object.keys(I18N_RESOURCES.en.system).sort()
        const ruKeys = Object.keys(I18N_RESOURCES.ru.system).sort()

        expect(enKeys).toEqual(ruKeys)
    })

    it("when accessed, then en and ru have same keys for common namespace", (): void => {
        const enKeys = Object.keys(I18N_RESOURCES.en.common).sort()
        const ruKeys = Object.keys(I18N_RESOURCES.ru.common).sort()

        expect(enKeys).toEqual(ruKeys)
    })
})

describe("I18N_NAMESPACES", (): void => {
    it("when accessed, then contains exactly 10 namespaces", (): void => {
        expect(I18N_NAMESPACES).toHaveLength(10)
    })

    it("when accessed, then includes common as first namespace", (): void => {
        expect(I18N_NAMESPACES[0]).toBe("common")
    })

    it("when accessed, then includes all expected domain namespaces", (): void => {
        const expected = [
            "common",
            "navigation",
            "auth",
            "system",
            "dashboard",
            "reviews",
            "reports",
            "settings",
            "code-city",
            "onboarding",
        ]

        expect([...I18N_NAMESPACES]).toEqual(expected)
    })
})
