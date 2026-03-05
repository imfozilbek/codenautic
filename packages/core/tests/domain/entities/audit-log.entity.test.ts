import {describe, expect, test} from "bun:test"

import {AuditLog} from "../../../src/domain/entities/audit-log.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("AuditLog", () => {
    test("creates valid audit log and trims text fields", () => {
        const auditLog = new AuditLog(UniqueId.create("audit-1"), {
            action: "  CREATE_RULE  ",
            actor: UniqueId.create("user-1"),
            target: {
                type: "  rule  ",
                id: "  rule-1  ",
            },
            changes: [
                {
                    field: "  severity  ",
                    oldValue: "MEDIUM",
                    newValue: "HIGH",
                },
            ],
            timestamp: new Date("2026-03-01T10:00:00.000Z"),
        })

        expect(auditLog.id.value).toBe("audit-1")
        expect(auditLog.action).toBe("CREATE_RULE")
        expect(auditLog.actor.value).toBe("user-1")
        expect(auditLog.target).toEqual({type: "rule", id: "rule-1"})
        expect(auditLog.changes).toEqual([
            {
                field: "severity",
                oldValue: "MEDIUM",
                newValue: "HIGH",
            },
        ])
        expect(auditLog.timestamp.toISOString()).toBe("2026-03-01T10:00:00.000Z")
    })

    test("throws when action is empty", () => {
        expect(() => {
            return new AuditLog(UniqueId.create("audit-2"), {
                action: "   ",
                actor: UniqueId.create("user-2"),
                target: {
                    type: "rule",
                    id: "rule-2",
                },
                changes: [],
                timestamp: new Date(),
            })
        }).toThrow("Audit log action cannot be empty")
    })

    test("throws when target has empty type or id", () => {
        expect(() => {
            return new AuditLog(UniqueId.create("audit-3"), {
                action: "update",
                actor: UniqueId.create("user-3"),
                target: {
                    type: "  ",
                    id: "rule-3",
                },
                changes: [],
                timestamp: new Date(),
            })
        }).toThrow("Audit log target must have non-empty type and id")

        expect(() => {
            return new AuditLog(UniqueId.create("audit-4"), {
                action: "update",
                actor: UniqueId.create("user-4"),
                target: {
                    type: "rule",
                    id: "",
                },
                changes: [],
                timestamp: new Date(),
            })
        }).toThrow("Audit log target must have non-empty type and id")
    })

    test("throws when change field is empty", () => {
        expect(() => {
            return new AuditLog(UniqueId.create("audit-5"), {
                action: "update",
                actor: UniqueId.create("user-5"),
                target: {
                    type: "rule",
                    id: "rule-5",
                },
                changes: [
                    {
                        field: "   ",
                        oldValue: null,
                        newValue: "x",
                    },
                ],
                timestamp: new Date(),
            })
        }).toThrow("Audit log change field cannot be empty")
    })

    test("throws when timestamp is invalid", () => {
        expect(() => {
            return new AuditLog(UniqueId.create("audit-6"), {
                action: "update",
                actor: UniqueId.create("user-6"),
                target: {
                    type: "rule",
                    id: "rule-6",
                },
                changes: [],
                timestamp: new Date("invalid"),
            })
        }).toThrow("Audit log timestamp must be valid date")
    })
})
