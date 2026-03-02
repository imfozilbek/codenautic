import {describe, expect, test} from "bun:test"

import {ConflictError} from "../../../src/domain/errors/conflict.error"
import {DomainError} from "../../../src/domain/errors/domain.error"
import {InvalidUniqueIdError} from "../../../src/domain/errors/invalid-unique-id.error"
import {NotFoundError} from "../../../src/domain/errors/not-found.error"
import {UnauthorizedError} from "../../../src/domain/errors/unauthorized.error"
import {ValidationError} from "../../../src/domain/errors/validation.error"

class StubDomainError extends DomainError {
    public readonly code = "STUB_DOMAIN_ERROR"

    public constructor(message: string, cause?: Error) {
        super(message, cause)
    }
}

describe("DomainError", () => {
    test("inherits Error and sets name to subclass name", () => {
        const error = new StubDomainError("Domain failure")

        expect(error instanceof Error).toBe(true)
        expect(error.name).toBe("StubDomainError")
        expect(error.code).toBe("STUB_DOMAIN_ERROR")
    })

    test("sets timestamp automatically and keeps optional cause", () => {
        const cause = new Error("root-cause")
        const error = new StubDomainError("Domain failure", cause)

        expect(error.timestamp instanceof Date).toBe(true)
        expect(error.cause).toBe(cause)
    })

    test("serializes to stable payload shape", () => {
        const cause = new Error("root-cause")
        const error = new StubDomainError("Domain failure", cause)
        const serialized = error.serialize()

        expect(serialized.code).toBe("STUB_DOMAIN_ERROR")
        expect(serialized.message).toBe("Domain failure")
        expect(serialized.timestamp instanceof Date).toBe(true)
        expect(serialized.cause).toBe("root-cause")
    })
})

describe("InvalidUniqueIdError", () => {
    test("uses stable error code and non-empty message", () => {
        const error = new InvalidUniqueIdError()

        expect(error.code).toBe("INVALID_UNIQUE_ID")
        expect(error.message.length).toBeGreaterThan(0)
    })
})

describe("ValidationError", () => {
    test("keeps code and field details in serialize output", () => {
        const error = new ValidationError("Validation failed", [
            {field: "email", message: "invalid email"},
        ])
        const serialized = error.serialize()

        expect(error.code).toBe("VALIDATION_ERROR")
        expect(serialized.fields).toHaveLength(1)
        expect(serialized.fields[0]?.field).toBe("email")
    })
})

describe("NotFoundError", () => {
    test("builds message from entity type and id", () => {
        const error = new NotFoundError("Repository", "repo-1")

        expect(error.code).toBe("NOT_FOUND")
        expect(error.entityType).toBe("Repository")
        expect(error.entityId).toBe("repo-1")
        expect(error.message).toBe("Repository with id repo-1 not found")
    })
})

describe("ConflictError", () => {
    test("stores conflict reason and code", () => {
        const error = new ConflictError("rule already exists")

        expect(error.code).toBe("CONFLICT")
        expect(error.conflictReason).toBe("rule already exists")
        expect(error.message).toContain("rule already exists")
    })
})

describe("UnauthorizedError", () => {
    test("supports optional required permission", () => {
        const withPermission = new UnauthorizedError("admin:write")
        const withoutPermission = new UnauthorizedError()

        expect(withPermission.code).toBe("UNAUTHORIZED")
        expect(withPermission.requiredPermission).toBe("admin:write")
        expect(withPermission.message).toContain("admin:write")

        expect(withoutPermission.requiredPermission).toBeUndefined()
        expect(withoutPermission.message).toBe("Operation is not authorized")
    })
})
