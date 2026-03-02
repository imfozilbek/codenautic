import {describe, expect, test} from "bun:test"

import {Result} from "../../src/shared/result"

class StubError extends Error {
    public constructor(message: string) {
        super(message)
        this.name = "StubError"
    }
}

describe("Result", () => {
    test("ok result exposes success flags and value", () => {
        const result = Result.ok<number, StubError>(42)

        expect(result.isOk).toBe(true)
        expect(result.isFail).toBe(false)
        expect(result.isSuccess).toBe(true)
        expect(result.isFailure).toBe(false)
        expect(result.value).toBe(42)
    })

    test("fail result exposes failure flags and error", () => {
        const error = new StubError("failure")
        const result = Result.fail<number, StubError>(error)

        expect(result.isOk).toBe(false)
        expect(result.isFail).toBe(true)
        expect(result.isSuccess).toBe(false)
        expect(result.isFailure).toBe(true)
        expect(result.error).toBe(error)
    })

    test("throws when value is accessed on failed result", () => {
        const result = Result.fail<number, StubError>(new StubError("failure"))

        expect(() => {
            void result.value
        }).toThrow("Cannot access value from failed result")
    })

    test("throws when error is accessed on successful result", () => {
        const result = Result.ok<number, StubError>(42)

        expect(() => {
            void result.error
        }).toThrow("Cannot access error from successful result")
    })

    test("map transforms successful value and keeps failed result unchanged", () => {
        const mapped = Result.ok<number, StubError>(2).map((value) => value * 3)
        const error = new StubError("failure")
        const failedMapped = Result.fail<number, StubError>(error).map((value) => value * 3)

        expect(mapped.isOk).toBe(true)
        expect(mapped.value).toBe(6)

        expect(failedMapped.isFail).toBe(true)
        expect(failedMapped.error).toBe(error)
    })

    test("flatMap chains successful results and skips failed branch", () => {
        const success = Result.ok<number, StubError>(5).flatMap((value) => {
            return Result.ok<string, StubError>(`value:${value}`)
        })
        const error = new StubError("failure")
        const failed = Result.fail<number, StubError>(error).flatMap((value) => {
            return Result.ok<string, StubError>(`value:${value}`)
        })

        expect(success.isOk).toBe(true)
        expect(success.value).toBe("value:5")
        expect(failed.isFail).toBe(true)
        expect(failed.error).toBe(error)
    })

    test("unwrapOr returns success value or fallback", () => {
        const success = Result.ok<number, StubError>(10)
        const failed = Result.fail<number, StubError>(new StubError("failure"))

        expect(success.unwrapOr(0)).toBe(10)
        expect(failed.unwrapOr(0)).toBe(0)
    })
})
