import { describe, expect, it } from "vitest"

import {
    DEFAULT_ONBOARDING_VALUES,
    ONBOARDING_FORM_SCHEMA,
} from "@/pages/onboarding-wizard/onboarding-wizard-schema"

describe("ONBOARDING_FORM_SCHEMA", (): void => {
    it("when given valid single-mode values, then passes validation", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(true)
    })

    it("when single-mode repositoryUrl is empty, then fails with custom message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const urlIssue = result.error.issues.find(
                (issue): boolean => issue.path.includes("repositoryUrl"),
            )
            expect(urlIssue?.message).toBe("Введите URL репозитория")
        }
    })

    it("when single-mode repositoryUrl is invalid URL, then fails with url message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "not-a-url",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const urlIssue = result.error.issues.find(
                (issue): boolean => issue.path.includes("repositoryUrl"),
            )
            expect(urlIssue?.message).toBe("Введите корректный URL репозитория")
        }
    })

    it("when bulk-mode has no valid repositories, then fails with minimum message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            onboardingMode: "bulk" as const,
            repositoryUrlList: "",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const bulkIssue = result.error.issues.find(
                (issue): boolean => issue.path.includes("repositoryUrlList"),
            )
            expect(bulkIssue?.message).toBe("Добавьте минимум один корректный URL репозитория")
        }
    })

    it("when bulk-mode has invalid lines, then fails with preview of invalid entries", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            onboardingMode: "bulk" as const,
            repositoryUrlList: "https://github.com/org/repo\nnot-valid\nalso-bad",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const bulkIssue = result.error.issues.find(
                (issue): boolean =>
                    issue.path.includes("repositoryUrlList") &&
                    issue.message.startsWith("Некорректные ссылки"),
            )
            expect(bulkIssue).toBeDefined()
            expect(bulkIssue?.message).toContain("2: not-valid")
            expect(bulkIssue?.message).toContain("3: also-bad")
        }
    })

    it("when bulk-mode has only invalid lines without any valid URLs, then returns both errors", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            onboardingMode: "bulk" as const,
            repositoryUrlList: "bad-url-1\nbad-url-2",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const bulkIssues = result.error.issues.filter(
                (issue): boolean => issue.path.includes("repositoryUrlList"),
            )
            expect(bulkIssues.length).toBe(2)
            expect(bulkIssues.some((i): boolean => i.message.includes("минимум один"))).toBe(true)
            expect(bulkIssues.some((i): boolean => i.message.includes("Некорректные ссылки"))).toBe(
                true,
            )
        }
    })

    it("when bulk-mode has valid lines only, then passes validation", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            onboardingMode: "bulk" as const,
            repositoryUrlList: "https://github.com/org/repo-a\nhttps://github.com/org/repo-b",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(true)
    })

    it("when scanThreads is 0, then fails with minimum message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            scanThreads: 0,
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
    })

    it("when scanThreads is 33, then fails with maximum message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            scanThreads: 33,
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
    })

    it("when notifyEmail is invalid, then fails with email message", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            notifyEmail: "not-an-email",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
    })

    it("when notifyEmail is empty, then passes validation", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            notifyEmail: "",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(true)
    })

    it("when notifyEmail is valid, then passes validation", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            notifyEmail: "dev@example.com",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(true)
    })

    it("when tags exceed 256 characters, then fails", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            tags: "a".repeat(257),
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
    })

    it("when email exceeds 256 characters, then fails", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            repositoryUrl: "https://github.com/org/repo",
            notifyEmail: "a".repeat(252) + "@b.com",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
    })

    it("when bulk-mode invalid lines exceed preview limit, then truncates to 3", (): void => {
        const values = {
            ...DEFAULT_ONBOARDING_VALUES,
            onboardingMode: "bulk" as const,
            repositoryUrlList:
                "https://github.com/org/repo\nbad1\nbad2\nbad3\nbad4\nbad5",
        }
        const result = ONBOARDING_FORM_SCHEMA.safeParse(values)

        expect(result.success).toBe(false)
        if (result.success === false) {
            const invalidIssue = result.error.issues.find(
                (issue): boolean => issue.message.startsWith("Некорректные ссылки"),
            )
            expect(invalidIssue).toBeDefined()
            expect(invalidIssue?.message).toContain("bad1")
            expect(invalidIssue?.message).toContain("bad2")
            expect(invalidIssue?.message).toContain("bad3")
            expect(invalidIssue?.message).not.toContain("bad4")
        }
    })
})

describe("DEFAULT_ONBOARDING_VALUES", (): void => {
    it("when accessed, then has expected defaults", (): void => {
        expect(DEFAULT_ONBOARDING_VALUES.provider).toBe("github")
        expect(DEFAULT_ONBOARDING_VALUES.onboardingTemplateId).toBe("custom")
        expect(DEFAULT_ONBOARDING_VALUES.onboardingMode).toBe("single")
        expect(DEFAULT_ONBOARDING_VALUES.scanMode).toBe("incremental")
        expect(DEFAULT_ONBOARDING_VALUES.scanSchedule).toBe("manual")
        expect(DEFAULT_ONBOARDING_VALUES.scanThreads).toBe(4)
        expect(DEFAULT_ONBOARDING_VALUES.includeSubmodules).toBe(true)
        expect(DEFAULT_ONBOARDING_VALUES.includeHistory).toBe(false)
        expect(DEFAULT_ONBOARDING_VALUES.tags).toBe("")
        expect(DEFAULT_ONBOARDING_VALUES.notifyEmail).toBe("")
    })
})
