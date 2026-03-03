import {describe, expect, test} from "bun:test"

import {
    Task,
    TASK_STATUS,
} from "../../../src/domain/entities/task.entity"
import {UniqueId} from "../../../src/domain/value-objects/unique-id.value-object"

describe("Task", () => {
    test("creates task with normalized fields", () => {
        const task = new Task(UniqueId.create("task-1"), {
            type: "  scan-repository  ",
            status: TASK_STATUS.PENDING,
            progress: 0,
            metadata: {
                actor: "agent",
            },
        })

        expect(task.type).toBe("scan-repository")
        expect(task.status).toBe(TASK_STATUS.PENDING)
        expect(task.progress).toBe(0)
        expect(task.metadata).toEqual({actor: "agent"})
    })

    test("starts task and resets progress", () => {
        const task = new Task(UniqueId.create(), {
            type: "build-index",
            status: TASK_STATUS.PENDING,
            progress: 20,
            metadata: {},
        })

        task.start()

        expect(task.status).toBe(TASK_STATUS.RUNNING)
        expect(task.progress).toBe(0)
        expect(task.result).toBeUndefined()
        expect(task.error).toBeUndefined()
    })

    test("updates progress only in running state", () => {
        const task = createRunningTask()

        task.updateProgress(42.5)

        expect(task.progress).toBe(42.5)
        expect(() => {
            createCompletedTask().updateProgress(50)
        }).toThrow("Cannot update progress for non-running task")
    })

    test("completes task with result", () => {
        const task = createRunningTask()

        task.complete({
            summary: "all good",
        })

        expect(task.status).toBe(TASK_STATUS.COMPLETED)
        expect(task.progress).toBe(100)
        expect(task.result).toEqual({summary: "all good"})
        expect(task.error).toBeUndefined()
    })

    test("fails task with error", () => {
        const task = createRunningTask()

        task.fail({
            message: "network timeout",
        })

        expect(task.status).toBe(TASK_STATUS.FAILED)
        expect(task.progress).toBe(100)
        expect(task.error).toEqual({message: "network timeout"})
    })

    test("rejects invalid task progress", () => {
        expect(() => {
            return new Task(UniqueId.create(), {
                type: "analyze",
                status: TASK_STATUS.RUNNING,
                progress: 150,
                metadata: {},
            })
        }).toThrow("Task progress must be between 0 and 100")
    })

    test("rejects completed task without terminal progress", () => {
        expect(() => {
            return new Task(UniqueId.create(), {
                type: "analyze",
                status: TASK_STATUS.COMPLETED,
                progress: 80,
                metadata: {},
            })
        }).toThrow("Completed task progress must be 100")
    })

    test("rejects empty type", () => {
        expect(() => {
            return new Task(UniqueId.create(), {
                type: "   ",
                status: TASK_STATUS.PENDING,
                progress: 0,
                metadata: {},
            })
        }).toThrow("Task type cannot be empty")
    })

    function createRunningTask(): Task {
        const task = new Task(UniqueId.create(), {
            type: "export-data",
            status: TASK_STATUS.PENDING,
            progress: 0,
            metadata: {},
        })
        task.start()
        return task
    }

    function createCompletedTask(): Task {
        return new Task(UniqueId.create(), {
            type: "export-data",
            status: TASK_STATUS.COMPLETED,
            progress: 100,
            metadata: {},
        })
    }
})
