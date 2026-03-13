import {access, mkdtemp} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"

import {describe, expect, test} from "bun:test"

import {
    REPOSITORY_WORKSPACE_PHASE,
    type IRepositoryWorkspaceProgress,
    type RepositoryWorkspacePhase,
} from "@codenautic/core"

import {
    GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE,
    GitRepositoryWorkspaceProvider,
    GitRepositoryWorkspaceProviderError,
} from "../../src/git"

interface ICommandCall {
    readonly command: string
    readonly args: readonly string[]
}

/**
 * Creates async path existence check.
 *
 * @param targetPath Absolute filesystem path.
 * @returns True when path exists.
 */
async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await access(targetPath)
        return true
    } catch {
        return false
    }
}

/**
 * Builds deterministic command executor mock.
 *
 * @param responses Responses by command prefix.
 * @returns Executor mock and captured calls.
 */
function createCommandExecutorMock(
    responses: Readonly<Record<string, {readonly stdout?: string; readonly stderr?: string}>>,
): {
    readonly calls: ICommandCall[]
    readonly executor: (
        command: string,
        args: readonly string[],
    ) => Promise<{readonly stdout: string; readonly stderr: string}>
} {
    const calls: ICommandCall[] = []

    return {
        calls,
        executor(
            command: string,
            args: readonly string[],
        ): Promise<{readonly stdout: string; readonly stderr: string}> {
            calls.push({command, args})

            const key = args.join(" ")
            const response = responses[key]

            if (response === undefined) {
                throw new Error(`Unexpected command: ${command} ${key}`)
            }

            return Promise.resolve({
                stdout: response.stdout ?? "",
                stderr: response.stderr ?? "",
            })
        },
    }
}

/**
 * Asserts typed workspace provider error shape.
 *
 * @param callback Action expected to reject.
 * @param code Expected typed error code.
 */
async function expectWorkspaceProviderError(
    callback: () => Promise<unknown>,
    code: (typeof GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE)[keyof typeof GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE],
): Promise<void> {
    try {
        await callback()
    } catch (error) {
        expect(error).toBeInstanceOf(GitRepositoryWorkspaceProviderError)

        if (error instanceof GitRepositoryWorkspaceProviderError) {
            expect(error.code).toBe(code)
            return
        }
    }

    throw new Error("Expected GitRepositoryWorkspaceProviderError to be thrown")
}

describe("GitRepositoryWorkspaceProvider", () => {
    test("creates shallow workspace, injects token auth, and reports clone progress", async () => {
        const workspaceParentDirectory = await mkdtemp(
            join(tmpdir(), "git-workspace-provider-test-"),
        )
        const cloneStderr = [
            "Cloning into '/tmp/workspace'...",
            "Receiving objects: 100% (5/5), done.",
        ].join("\n")
        const {calls, executor} = createCommandExecutorMock({
            "clone --progress --no-checkout --depth 1 https://x-access-token:secret-token@example.com/org/repo.git": {
                stderr: cloneStderr,
            },
            "checkout --force main": {},
        })
        const provider = new GitRepositoryWorkspaceProvider({
            remoteUrl: "https://example.com/org/repo.git",
            accessToken: "secret-token",
            workspaceParentDirectory,
            workspaceIdFactory: () => "workspace-1",
            commandExecutor: async (
                command,
                args,
                _options,
            ): Promise<{readonly stdout: string; readonly stderr: string}> => {
                const normalizedArgs =
                    args[0] === "-C" ? args.slice(2) : args.slice(0, -1)

                return await executor(command, normalizedArgs)
            },
            nowProvider: () => new Date("2026-03-13T11:00:00.000Z"),
        })
        const phases: RepositoryWorkspacePhase[] = []
        const progressEvents: IRepositoryWorkspaceProgress[] = []

        const workspace = await provider.createWorkspace({
            repositoryId: "gh:repo-1",
            ref: "main",
            shallow: true,
            onProgress(progress: IRepositoryWorkspaceProgress): void {
                phases.push(progress.phase)
                progressEvents.push(progress)
            },
        })

        expect(workspace.workspaceId).toBe("workspace-1")
        expect(workspace.repositoryId).toBe("gh:repo-1")
        expect(workspace.ref).toBe("main")
        expect(workspace.isShallow).toBe(true)
        expect(workspace.createdAt).toBe("2026-03-13T11:00:00.000Z")
        expect(await pathExists(workspace.workspacePath)).toBe(true)
        expect(calls).toHaveLength(2)
        expect(phases).toEqual([
            REPOSITORY_WORKSPACE_PHASE.CLONING,
            REPOSITORY_WORKSPACE_PHASE.CLONING,
            REPOSITORY_WORKSPACE_PHASE.CHECKING_OUT,
            REPOSITORY_WORKSPACE_PHASE.READY,
        ])
        expect(progressEvents[1]?.receivedObjects).toBe(5)
        expect(progressEvents[1]?.totalObjects).toBe(5)

        await provider.disposeWorkspace(workspace.workspaceId)
        expect(await pathExists(workspace.workspacePath)).toBe(false)
    })

    test("fetches missing shallow ref before checking out FETCH_HEAD", async () => {
        const workspaceParentDirectory = await mkdtemp(
            join(tmpdir(), "git-workspace-provider-test-"),
        )
        const cloneStderr = "Receiving objects: 100% (3/3), done."
        const fetchStderr = "Receiving objects: 100% (1/1), done."
        const attemptedCommands: string[] = []
        const {executor} = createCommandExecutorMock({
            "clone --progress --no-checkout --depth 1 https://example.com/org/repo.git": {
                stderr: cloneStderr,
            },
            "fetch --progress --depth 1 origin refs/pull/42/head": {
                stderr: fetchStderr,
            },
            "checkout --force FETCH_HEAD": {},
        })
        const provider = new GitRepositoryWorkspaceProvider({
            remoteUrl: "https://example.com/org/repo.git",
            workspaceParentDirectory,
            workspaceIdFactory: () => "workspace-1-fallback",
            commandExecutor(
                command,
                args,
            ): Promise<{readonly stdout: string; readonly stderr: string}> {
                const normalizedArgs =
                    args[0] === "-C" ? args.slice(2) : args.slice(0, -1)
                const normalizedCommand = normalizedArgs.join(" ")
                attemptedCommands.push(normalizedCommand)

                if (normalizedCommand === "checkout --force refs/pull/42/head") {
                    return Promise.reject(new Error("pathspec did not match"))
                }

                return executor(command, normalizedArgs)
            },
        })
        const phases: RepositoryWorkspacePhase[] = []
        const progressEvents: IRepositoryWorkspaceProgress[] = []

        const workspace = await provider.createWorkspace({
            repositoryId: "gh:repo-42",
            ref: "refs/pull/42/head",
            shallow: true,
            onProgress(progress: IRepositoryWorkspaceProgress): void {
                phases.push(progress.phase)
                progressEvents.push(progress)
            },
        })

        expect(attemptedCommands).toEqual([
            "clone --progress --no-checkout --depth 1 https://example.com/org/repo.git",
            "checkout --force refs/pull/42/head",
            "fetch --progress --depth 1 origin refs/pull/42/head",
            "checkout --force FETCH_HEAD",
        ])
        expect(phases).toEqual([
            REPOSITORY_WORKSPACE_PHASE.CLONING,
            REPOSITORY_WORKSPACE_PHASE.CHECKING_OUT,
            REPOSITORY_WORKSPACE_PHASE.CHECKING_OUT,
            REPOSITORY_WORKSPACE_PHASE.READY,
        ])
        expect(progressEvents[1]?.message).toBe("Checking out refs/pull/42/head")
        expect(progressEvents[2]?.receivedObjects).toBe(1)
        expect(progressEvents[2]?.totalObjects).toBe(1)

        await provider.disposeWorkspace(workspace.workspaceId)
        expect(await pathExists(workspace.workspacePath)).toBe(false)
    })

    test("omits shallow depth argument when full clone is requested", async () => {
        const workspaceParentDirectory = await mkdtemp(
            join(tmpdir(), "git-workspace-provider-test-"),
        )
        const capturedArgs: string[][] = []
        const provider = new GitRepositoryWorkspaceProvider({
            remoteUrl: "https://example.com/org/repo.git",
            workspaceParentDirectory,
            workspaceIdFactory: () => "workspace-2",
            commandExecutor: (
                _command,
                args,
            ): Promise<{readonly stdout: string; readonly stderr: string}> => {
                capturedArgs.push([...args])
                return Promise.resolve({
                    stdout: "",
                    stderr: "",
                })
            },
        })

        const workspace = await provider.createWorkspace({
            repositoryId: "gh:repo-2",
            ref: "feature/scan",
            shallow: false,
        })

        expect(capturedArgs[0]?.includes("--depth")).toBe(false)
        expect(workspace.isShallow).toBe(false)

        await provider.disposeWorkspace(workspace.workspaceId)
    })

    test("throws typed error for invalid remote URL", () => {
        expect(() => {
            return new GitRepositoryWorkspaceProvider({
                remoteUrl: "git@github.com:org/repo.git",
            })
        }).toThrow(GitRepositoryWorkspaceProviderError)
    })

    test("throws typed error when clone command fails and cleans workspace", async () => {
        const workspaceParentDirectory = await mkdtemp(
            join(tmpdir(), "git-workspace-provider-test-"),
        )
        const provider = new GitRepositoryWorkspaceProvider({
            remoteUrl: "https://example.com/org/repo.git",
            workspaceParentDirectory,
            commandExecutor: (): Promise<{
                readonly stdout: string
                readonly stderr: string
            }> => {
                return Promise.reject(new Error("clone failed"))
            },
        })

        await expectWorkspaceProviderError(
            async () => {
                await provider.createWorkspace({
                    repositoryId: "gh:repo-3",
                    ref: "main",
                })
            },
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CLONE_FAILED,
        )
    })

    test("throws typed error when workspace id is unknown on dispose", async () => {
        const provider = new GitRepositoryWorkspaceProvider({
            remoteUrl: "https://example.com/org/repo.git",
            commandExecutor: (): Promise<{
                readonly stdout: string
                readonly stderr: string
            }> => {
                return Promise.resolve({
                    stdout: "",
                    stderr: "",
                })
            },
        })

        await expectWorkspaceProviderError(
            async () => {
                await provider.disposeWorkspace("missing-workspace")
            },
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.WORKSPACE_NOT_FOUND,
        )
    })
})
