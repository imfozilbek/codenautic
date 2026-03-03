import {describe, expect, test} from "bun:test"

import {TaskFactory, type IReconstituteTaskProps} from "../../../src/domain/factories/task.factory"
import {TASK_STATUS} from "../../../src/domain/entities/task.entity"

describe("TaskFactory", () => {
    const factory = new TaskFactory()

    test("creates task with pending defaults", () => {
        const task = factory.create({
            type: "scan-repo",
            metadata: {
                owner: "bot",
            },
        })

        expect(task.type).toBe("scan-repo")
        expect(task.status).toBe(TASK_STATUS.PENDING)
        expect(task.progress).toBe(0)
        expect(task.metadata).toEqual({owner: "bot"})
    })

    test("reconstitutes task from storage snapshot", () => {
        const snapshot: IReconstituteTaskProps = {
            id: "task-42",
            type: "analyze",
            status: TASK_STATUS.RUNNING,
            progress: 12,
            metadata: {
                plan: "default",
            },
            result: {
                passed: true,
            },
        }
        const task = factory.reconstitute(snapshot)

        expect(task.id.value).toBe("task-42")
        expect(task.type).toBe(snapshot.type)
        expect(task.status).toBe(snapshot.status)
        expect(task.progress).toBe(snapshot.progress)
        expect(task.result).toEqual(snapshot.result)
    })
})
