import {describe, expect, test} from "bun:test"

import {
    REPOSITORY_WORKSPACE_PHASE,
    type IRepositoryWorkspace,
    type IRepositoryWorkspaceProgress,
    type RepositoryWorkspacePhase,
} from "../../../../src/application/dto/scanning"

describe("IRepositoryWorkspace", () => {
    test("supports prepared shallow workspace metadata", () => {
        const workspace: IRepositoryWorkspace = {
            workspaceId: "workspace-001",
            repositoryId: "gh:repo-001",
            ref: "main",
            workspacePath: "/tmp/codenautic/workspace-001",
            isShallow: true,
            createdAt: "2026-03-13T10:00:00.000Z",
        }

        expect(workspace.workspaceId).toBe("workspace-001")
        expect(workspace.repositoryId).toBe("gh:repo-001")
        expect(workspace.isShallow).toBe(true)
        expect(workspace.workspacePath).toContain("/tmp/codenautic")
    })
})

describe("IRepositoryWorkspaceProgress", () => {
    test("supports clone lifecycle phases and optional transport counters", () => {
        const phase: RepositoryWorkspacePhase = REPOSITORY_WORKSPACE_PHASE.CLONING
        const progress: IRepositoryWorkspaceProgress = {
            phase,
            message: "Receiving objects",
            receivedObjects: 42,
            totalObjects: 100,
            receivedBytes: 2048,
        }

        expect(progress.phase).toBe(REPOSITORY_WORKSPACE_PHASE.CLONING)
        expect(progress.message).toBe("Receiving objects")
        expect(progress.totalObjects).toBe(100)
        expect(progress.receivedBytes).toBe(2048)
    })

    test("supports cleanup phase without transport counters", () => {
        const progress: IRepositoryWorkspaceProgress = {
            phase: REPOSITORY_WORKSPACE_PHASE.CLEANING_UP,
        }

        expect(progress.phase).toBe(REPOSITORY_WORKSPACE_PHASE.CLEANING_UP)
        expect(progress.message).toBeUndefined()
    })
})
