import {describe, expect, test} from "bun:test"

import {
    CHECK_RUN_CONCLUSION,
    CHECK_RUN_STATUS,
    type ICheckRunDTO,
} from "../../../../src/application/dto/git/check-run.dto"

describe("ICheckRunDTO", () => {
    test("supports check run payload", () => {
        const checkRun: ICheckRunDTO = {
            id: "check-1",
            name: "CodeNautic Review",
            status: CHECK_RUN_STATUS.COMPLETED,
            conclusion: CHECK_RUN_CONCLUSION.SUCCESS,
            summary: "No blocking issues found",
            detailsUrl: "https://example.com/check/1",
        }

        expect(checkRun.status).toBe("completed")
        expect(checkRun.conclusion).toBe("success")
        expect(checkRun.summary).toContain("No blocking")
    })
})
