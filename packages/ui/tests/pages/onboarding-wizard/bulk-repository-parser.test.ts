import { describe, expect, it } from "vitest"

import { parseBulkRepositoryList } from "@/pages/onboarding-wizard/bulk-repository-parser"

describe("parseBulkRepositoryList", (): void => {
    it("when given valid URLs, then returns all as repositories", (): void => {
        const input = "https://github.com/org/repo1\nhttps://github.com/org/repo2"
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toEqual([
            "https://github.com/org/repo1",
            "https://github.com/org/repo2",
        ])
        expect(result.invalidLines).toHaveLength(0)
    })

    it("when given empty lines, then skips them", (): void => {
        const input = "https://github.com/org/repo1\n\n\nhttps://github.com/org/repo2\n"
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toHaveLength(2)
    })

    it("when given invalid URLs, then collects them as invalid lines", (): void => {
        const input = "https://github.com/org/repo1\nnot-a-url\nftp://invalid.com/repo"
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toHaveLength(1)
        expect(result.invalidLines).toHaveLength(2)
        expect(result.invalidLines[0]?.line).toBe(2)
        expect(result.invalidLines[0]?.value).toBe("not-a-url")
    })

    it("when given duplicate URLs (case-insensitive), then deduplicates", (): void => {
        const input =
            "https://github.com/Org/Repo\nhttps://github.com/org/repo\nhttps://GITHUB.COM/ORG/REPO"
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toHaveLength(1)
    })

    it("when given empty string, then returns empty results", (): void => {
        const result = parseBulkRepositoryList("")

        expect(result.repositories).toHaveLength(0)
        expect(result.invalidLines).toHaveLength(0)
    })

    it("when given Windows-style line endings, then handles them", (): void => {
        const input = "https://github.com/org/repo1\r\nhttps://github.com/org/repo2"
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toHaveLength(2)
    })

    it("when given lines with whitespace, then trims them", (): void => {
        const input = "  https://github.com/org/repo1  \n  https://github.com/org/repo2  "
        const result = parseBulkRepositoryList(input)

        expect(result.repositories).toHaveLength(2)
    })
})
