import {describe, expect, test} from "bun:test"

import {
    REPOSITORY_WORKSPACE_PHASE,
    type IRepositoryWorkspace,
    type IRepositoryWorkspaceProgress,
    type RepositoryWorkspacePhase,
} from "../../../../../src/application/dto/scanning"
import type {
    ICreateRepositoryWorkspaceInput,
    IRepositoryWorkspaceProvider,
} from "../../../../../src/application/ports/outbound/scanning/repository-workspace-provider"

class InMemoryRepositoryWorkspaceProvider implements IRepositoryWorkspaceProvider {
    private readonly workspaces: Map<string, IRepositoryWorkspace>

    public constructor() {
        this.workspaces = new Map<string, IRepositoryWorkspace>()
    }

    public async createWorkspace(
        input: ICreateRepositoryWorkspaceInput,
    ): Promise<IRepositoryWorkspace> {
        const workspace: IRepositoryWorkspace = {
            workspaceId: `${input.repositoryId}:${input.ref}`,
            repositoryId: input.repositoryId,
            ref: input.ref,
            workspacePath: `/tmp/${input.repositoryId.replaceAll(":", "-")}/${input.ref}`,
            isShallow: input.shallow ?? true,
            createdAt: "2026-03-13T10:10:00.000Z",
        }

        this.workspaces.set(workspace.workspaceId, workspace)

        if (input.onProgress !== undefined) {
            const progressEvents: readonly IRepositoryWorkspaceProgress[] = [
                {
                    phase: REPOSITORY_WORKSPACE_PHASE.CLONING,
                    message: "Cloning repository",
                    receivedObjects: 10,
                    totalObjects: 10,
                },
                {
                    phase: REPOSITORY_WORKSPACE_PHASE.READY,
                    message: "Workspace ready",
                },
            ]

            for (const progress of progressEvents) {
                await input.onProgress(progress)
            }
        }

        return workspace
    }

    public disposeWorkspace(workspaceId: string): Promise<void> {
        this.workspaces.delete(workspaceId)
        return Promise.resolve()
    }

    public hasWorkspace(workspaceId: string): boolean {
        return this.workspaces.has(workspaceId)
    }
}

describe("IRepositoryWorkspaceProvider contract", () => {
    test("creates workspace and emits progress updates", async () => {
        const provider = new InMemoryRepositoryWorkspaceProvider()
        const phases: RepositoryWorkspacePhase[] = []

        const workspace = await provider.createWorkspace({
            repositoryId: "gh:repo-1",
            ref: "main",
            shallow: true,
            onProgress(progress): void {
                phases.push(progress.phase)
            },
        })

        expect(workspace.repositoryId).toBe("gh:repo-1")
        expect(workspace.ref).toBe("main")
        expect(workspace.isShallow).toBe(true)
        expect(phases).toEqual([
            REPOSITORY_WORKSPACE_PHASE.CLONING,
            REPOSITORY_WORKSPACE_PHASE.READY,
        ])
        expect(provider.hasWorkspace(workspace.workspaceId)).toBe(true)
    })

    test("disposes workspace by stable identifier", async () => {
        const provider = new InMemoryRepositoryWorkspaceProvider()
        const workspace = await provider.createWorkspace({
            repositoryId: "gh:repo-2",
            ref: "feature/scan",
            shallow: false,
        })

        await provider.disposeWorkspace(workspace.workspaceId)

        expect(provider.hasWorkspace(workspace.workspaceId)).toBe(false)
    })
})
