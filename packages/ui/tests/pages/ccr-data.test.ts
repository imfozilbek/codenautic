import { describe, expect, it } from "vitest"

import {
    ccrToContextItem,
    getCcrById,
    getCcrDiffById,
    getCcrReviewThreadsById,
    MOCK_CCR_ROWS,
} from "@/pages/ccr-data"

describe("getCcrById", (): void => {
    it("when given known id, then returns matching CCR row", (): void => {
        const firstRow = MOCK_CCR_ROWS[0]
        if (firstRow === undefined) {
            throw new Error("MOCK_CCR_ROWS is empty")
        }

        const result = getCcrById(firstRow.id)

        expect(result).not.toBeUndefined()
        expect(result?.id).toBe(firstRow.id)
    })

    it("when given unknown id, then returns undefined", (): void => {
        expect(getCcrById("ccr-nonexistent-9999")).toBeUndefined()
    })
})

describe("ccrToContextItem", (): void => {
    it("when given CCR row, then maps to chat context with stripped prefix", (): void => {
        const firstRow = MOCK_CCR_ROWS[0]
        if (firstRow === undefined) {
            throw new Error("MOCK_CCR_ROWS is empty")
        }

        const result = ccrToContextItem(firstRow)

        expect(result.id).toBe(firstRow.id)
        expect(result.repoName).toBe(firstRow.repository)
        expect(result.ccrNumber).toBe(firstRow.id.replace("ccr-", ""))
        expect(result.attachedFiles).toBe(firstRow.attachedFiles)
    })
})

describe("getCcrDiffById", (): void => {
    it("when given known ccr id with diffs, then returns non-empty array", (): void => {
        const result = getCcrDiffById("ccr-9001")

        expect(result.length).toBeGreaterThan(0)
        expect(result[0]).toHaveProperty("filePath")
    })

    it("when given unknown ccr id, then returns empty array", (): void => {
        expect(getCcrDiffById("ccr-unknown")).toEqual([])
    })
})

describe("getCcrReviewThreadsById", (): void => {
    it("when given known ccr id with threads, then returns non-empty array", (): void => {
        const result = getCcrReviewThreadsById("ccr-9001")

        expect(result.length).toBeGreaterThan(0)
        expect(result[0]).toHaveProperty("id")
        expect(result[0]).toHaveProperty("author")
        expect(result[0]).toHaveProperty("message")
    })

    it("when given known ccr id without threads, then returns empty array for unknown", (): void => {
        expect(getCcrReviewThreadsById("ccr-nonexistent")).toEqual([])
    })

    it("when threads have replies, then reply structure is preserved", (): void => {
        const result = getCcrReviewThreadsById("ccr-9001")
        const firstThread = result[0]

        expect(firstThread).not.toBeUndefined()
        expect(firstThread?.replies.length).toBeGreaterThan(0)
    })
})
