import {describe, expect, test} from "bun:test"

import {DomainError} from "../../../src/domain/errors/domain.error"
import {InvalidUniqueIdError} from "../../../src/domain/errors/invalid-unique-id.error"

class StubDomainError extends DomainError {
    public readonly code = "STUB_DOMAIN_ERROR"

    public constructor(message: string) {
        super(message)
    }
}

describe("DomainError", () => {
    test("inherits Error and sets name to subclass name", () => {
        const error = new StubDomainError("Domain failure")

        expect(error instanceof Error).toBe(true)
        expect(error.name).toBe("StubDomainError")
        expect(error.code).toBe("STUB_DOMAIN_ERROR")
    })
})

describe("InvalidUniqueIdError", () => {
    test("uses stable error code and non-empty message", () => {
        const error = new InvalidUniqueIdError()

        expect(error.code).toBe("INVALID_UNIQUE_ID")
        expect(error.message.length).toBeGreaterThan(0)
    })
})
