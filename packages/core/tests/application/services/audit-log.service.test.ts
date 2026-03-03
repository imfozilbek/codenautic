import {describe, expect, test} from "bun:test"

import type {IAuditLogRepository} from "../../../src/application/ports/outbound/audit-log-repository.port"
import {AuditLog} from "../../../src/domain/entities/audit-log.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"
import {AuditLogService} from "../../../src/application/services/audit-log.service"

class InMemoryAuditLogRepository implements IAuditLogRepository {
    public items: readonly AuditLog[] = []

    public async append(log: AuditLog): Promise<void> {
        this.items = [...this.items, log]
        await Promise.resolve()
    }

    public async findByActor(): Promise<readonly AuditLog[]> {
        await Promise.resolve()
        return []
    }

    public async findByDateRange(): Promise<readonly AuditLog[]> {
        await Promise.resolve()
        return []
    }

    public async findByTarget(): Promise<readonly AuditLog[]> {
        await Promise.resolve()
        return []
    }
}

describe("AuditLogService", () => {
    test("creates and persists audit log", async () => {
        const repository = new InMemoryAuditLogRepository()
        const service = new AuditLogService({
            auditLogRepository: repository,
        })
        const actor = UniqueId.create("actor-1")

        const result = await service.log({
            action: "  create_rule ",
            actor,
            target: {
                type: "rule",
                id: "rule-1",
            },
            changes: [
                {
                    field: "severity",
                    oldValue: "MEDIUM",
                    newValue: "HIGH",
                },
            ],
        })

        if (result.isFail) {
            throw new Error("expected successful audit log creation")
        }

        expect(result.value.actor.value).toBe("actor-1")
        expect(result.value.action).toBe("create_rule")
        expect(repository.items).toHaveLength(1)
    })

    test("fails when action is empty", async () => {
        const repository = new InMemoryAuditLogRepository()
        const service = new AuditLogService({
            auditLogRepository: repository,
        })

        const result = await service.log({
            action: "   ",
            actor: UniqueId.create("actor-2"),
            target: {
                type: "rule",
                id: "rule-2",
            },
            changes: [],
        })

        if (result.isOk) {
            throw new Error("expected failed audit log creation")
        }

        const failedResult = result as {readonly error: {readonly fields: readonly {readonly field: string}[]}}
        const firstField = failedResult.error.fields[0]
        if (firstField === undefined) {
            throw new Error("expected validation error field")
        }

        expect(failedResult.error.fields).toHaveLength(1)
        expect(firstField.field).toBe("action")
        expect(repository.items).toHaveLength(0)
    })

    test("fails when target is invalid", async () => {
        const repository = new InMemoryAuditLogRepository()
        const service = new AuditLogService({
            auditLogRepository: repository,
        })

        const result = await service.log({
            action: "update",
            actor: UniqueId.create("actor-3"),
            target: {
                type: "",
                id: "rule-3",
            },
            changes: [],
        })

        if (result.isOk) {
            throw new Error("expected failed audit log creation")
        }

        const failedResult = result as {readonly error: {readonly fields: readonly {readonly field: string}[]}}
        const firstField = failedResult.error.fields[0]
        if (firstField === undefined) {
            throw new Error("expected validation error field")
        }

        expect(firstField.field).toBe("target")
        expect(repository.items).toHaveLength(0)
    })
})
