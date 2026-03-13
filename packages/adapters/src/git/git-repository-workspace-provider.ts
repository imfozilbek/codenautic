import {spawn} from "node:child_process"
import {randomUUID} from "node:crypto"
import {mkdir, mkdtemp, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"

import {
    REPOSITORY_WORKSPACE_PHASE,
    RepositoryId,
    type ICreateRepositoryWorkspaceInput,
    type IRepositoryWorkspace,
    type IRepositoryWorkspaceProgress,
    type IRepositoryWorkspaceProvider,
    type RepositoryWorkspacePhase,
} from "@codenautic/core"

import {
    GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE,
    GitRepositoryWorkspaceProviderError,
} from "./git-repository-workspace-provider.error"

const DEFAULT_WORKSPACE_PREFIX = "codenautic-git-workspace-"
const GIT_BINARY = "git"

interface IGitCommandExecutionOptions {
    /**
     * Working directory for command execution.
     */
    readonly cwd?: string
}

interface IGitCommandExecutionResult {
    /**
     * Captured stdout payload.
     */
    readonly stdout: string

    /**
     * Captured stderr payload.
     */
    readonly stderr: string
}

type IGitCommandExecutor = (
    command: string,
    args: readonly string[],
    options?: IGitCommandExecutionOptions,
) => Promise<IGitCommandExecutionResult>

/**
 * Constructor options for git repository workspace provider.
 */
export interface IGitRepositoryWorkspaceProviderOptions {
    /**
     * Canonical remote URL used for clone operations.
     */
    readonly remoteUrl: string

    /**
     * Optional access token for authenticated HTTPS clones.
     */
    readonly accessToken?: string

    /**
     * Optional parent directory for temporary workspaces.
     */
    readonly workspaceParentDirectory?: string

    /**
     * Optional git command executor override for tests.
     */
    readonly commandExecutor?: IGitCommandExecutor

    /**
     * Optional workspace identifier factory for deterministic tests.
     */
    readonly workspaceIdFactory?: () => string

    /**
     * Optional clock provider for deterministic timestamps.
     */
    readonly nowProvider?: () => Date
}

/**
 * Git CLI backed disposable repository workspace provider.
 */
export class GitRepositoryWorkspaceProvider implements IRepositoryWorkspaceProvider {
    private readonly remoteUrl: string
    private readonly accessToken?: string
    private readonly workspaceParentDirectory: string
    private readonly commandExecutor: IGitCommandExecutor
    private readonly workspaceIdFactory: () => string
    private readonly nowProvider: () => Date
    private readonly workspaces: Map<string, IRepositoryWorkspace>

    /**
     * Creates git repository workspace provider.
     *
     * @param options Provider configuration and optional test hooks.
     * @throws {GitRepositoryWorkspaceProviderError} When configuration is invalid.
     */
    public constructor(options: IGitRepositoryWorkspaceProviderOptions) {
        this.remoteUrl = normalizeRemoteUrl(options.remoteUrl)
        this.accessToken = normalizeAccessToken(options.accessToken)
        this.workspaceParentDirectory =
            options.workspaceParentDirectory ?? tmpdir()
        this.commandExecutor = options.commandExecutor ?? executeGitCommand
        this.workspaceIdFactory = options.workspaceIdFactory ?? randomUUID
        this.nowProvider = options.nowProvider ?? (() => new Date())
        this.workspaces = new Map<string, IRepositoryWorkspace>()
    }

    /**
     * Creates disposable local workspace for requested repository ref.
     *
     * @param input Workspace creation input.
     * @returns Prepared workspace metadata.
     */
    public async createWorkspace(
        input: ICreateRepositoryWorkspaceInput,
    ): Promise<IRepositoryWorkspace> {
        const repositoryId = normalizeRepositoryId(input.repositoryId)
        const ref = normalizeRef(input.ref)
        const workspacePath = await createWorkspaceDirectory(
            this.workspaceParentDirectory,
        )
        const workspaceId = this.workspaceIdFactory()
        const remoteUrl = resolveCloneRemoteUrl(this.remoteUrl, this.accessToken)

        try {
            const cloneResult = await this.commandExecutor(
                GIT_BINARY,
                buildCloneArguments(remoteUrl, workspacePath, input.shallow === true),
            )
            await reportCommandProgress(
                cloneResult.stderr,
                REPOSITORY_WORKSPACE_PHASE.CLONING,
                input.onProgress,
            )

            await emitProgress(
                {
                    phase: REPOSITORY_WORKSPACE_PHASE.CHECKING_OUT,
                    message: `Checking out ${ref}`,
                },
                input.onProgress,
            )
            await this.checkoutWorkspaceRef({
                workspacePath,
                ref,
                shallow: input.shallow === true,
                onProgress: input.onProgress,
            })

            const workspace: IRepositoryWorkspace = {
                workspaceId,
                repositoryId,
                ref,
                workspacePath,
                isShallow: input.shallow === true,
                createdAt: this.nowProvider().toISOString(),
            }

            this.workspaces.set(workspaceId, workspace)
            await emitProgress(
                {
                    phase: REPOSITORY_WORKSPACE_PHASE.READY,
                    message: `Workspace ready at ${workspacePath}`,
                },
                input.onProgress,
            )

            return workspace
        } catch (error) {
            await safeRemoveWorkspace(workspacePath)

            if (error instanceof GitRepositoryWorkspaceProviderError) {
                throw error
            }

            throw new GitRepositoryWorkspaceProviderError(
                GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CLONE_FAILED,
                {
                    repositoryId,
                    remoteUrl: this.remoteUrl,
                    ref,
                    workspacePath,
                    causeMessage: resolveCauseMessage(error),
                },
            )
        }
    }

    /**
     * Removes previously created workspace from disk.
     *
     * @param workspaceId Stable workspace identifier.
     */
    public async disposeWorkspace(workspaceId: string): Promise<void> {
        const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
        const workspace = this.workspaces.get(normalizedWorkspaceId)

        if (workspace === undefined) {
            throw new GitRepositoryWorkspaceProviderError(
                GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.WORKSPACE_NOT_FOUND,
                {workspaceId: normalizedWorkspaceId},
            )
        }

        try {
            await rm(workspace.workspacePath, {
                recursive: true,
                force: true,
            })
            this.workspaces.delete(normalizedWorkspaceId)
        } catch (error) {
            throw new GitRepositoryWorkspaceProviderError(
                GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.DISPOSE_FAILED,
                {
                    workspaceId: normalizedWorkspaceId,
                    workspacePath: workspace.workspacePath,
                    causeMessage: resolveCauseMessage(error),
                },
            )
        }
    }

    /**
     * Checks out requested ref and performs shallow fetch fallback when needed.
     *
     * @param params Workspace checkout parameters.
     */
    private async checkoutWorkspaceRef(params: {
        readonly workspacePath: string
        readonly ref: string
        readonly shallow: boolean
        readonly onProgress?: ICreateRepositoryWorkspaceInput["onProgress"]
    }): Promise<void> {
        try {
            await this.commandExecutor(
                GIT_BINARY,
                ["-C", params.workspacePath, "checkout", "--force", params.ref],
            )
            return
        } catch (error) {
            if (params.shallow === false) {
                throw new GitRepositoryWorkspaceProviderError(
                    GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CHECKOUT_FAILED,
                    {
                        ref: params.ref,
                        workspacePath: params.workspacePath,
                        causeMessage: resolveCauseMessage(error),
                    },
                )
            }
        }

        try {
            const fetchResult = await this.commandExecutor(
                GIT_BINARY,
                [
                    "-C",
                    params.workspacePath,
                    "fetch",
                    "--progress",
                    "--depth",
                    "1",
                    "origin",
                    params.ref,
                ],
            )
            await reportCommandProgress(
                fetchResult.stderr,
                REPOSITORY_WORKSPACE_PHASE.CHECKING_OUT,
                params.onProgress,
            )
            await this.commandExecutor(
                GIT_BINARY,
                [
                    "-C",
                    params.workspacePath,
                    "checkout",
                    "--force",
                    "FETCH_HEAD",
                ],
            )
        } catch (error) {
            throw new GitRepositoryWorkspaceProviderError(
                GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.CHECKOUT_FAILED,
                {
                    ref: params.ref,
                    workspacePath: params.workspacePath,
                    causeMessage: resolveCauseMessage(error),
                },
            )
        }
    }
}

/**
 * Validates and normalizes remote URL.
 *
 * @param remoteUrl Raw remote URL.
 * @returns Normalized remote URL.
 * @throws {GitRepositoryWorkspaceProviderError} When remote URL is invalid.
 */
function normalizeRemoteUrl(remoteUrl: string): string {
    try {
        const parsedUrl = new URL(remoteUrl.trim())

        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {
            throw new Error("Unsupported protocol")
        }

        return parsedUrl.toString()
    } catch {
        throw new GitRepositoryWorkspaceProviderError(
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REMOTE_URL,
            {remoteUrl},
        )
    }
}

/**
 * Validates optional access token.
 *
 * @param accessToken Optional access token.
 * @returns Trimmed access token when provided.
 * @throws {GitRepositoryWorkspaceProviderError} When token is blank.
 */
function normalizeAccessToken(accessToken: string | undefined): string | undefined {
    if (accessToken === undefined) {
        return undefined
    }

    const normalizedToken = accessToken.trim()
    if (normalizedToken.length === 0) {
        throw new GitRepositoryWorkspaceProviderError(
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_ACCESS_TOKEN,
        )
    }

    return normalizedToken
}

/**
 * Validates repository identifier format.
 *
 * @param repositoryId Raw repository identifier.
 * @returns Canonical repository identifier.
 * @throws {GitRepositoryWorkspaceProviderError} When repository id is invalid.
 */
function normalizeRepositoryId(repositoryId: string): string {
    try {
        return RepositoryId.parse(repositoryId).toString()
    } catch (error) {
        throw new GitRepositoryWorkspaceProviderError(
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REPOSITORY_ID,
            {
                repositoryId,
                causeMessage: resolveCauseMessage(error),
            },
        )
    }
}

/**
 * Validates requested git ref.
 *
 * @param ref Raw ref value.
 * @returns Trimmed git ref.
 * @throws {GitRepositoryWorkspaceProviderError} When ref is blank.
 */
function normalizeRef(ref: string): string {
    const normalizedRef = ref.trim()
    if (normalizedRef.length === 0) {
        throw new GitRepositoryWorkspaceProviderError(
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_REF,
            {ref},
        )
    }

    return normalizedRef
}

/**
 * Validates workspace identifier.
 *
 * @param workspaceId Raw workspace identifier.
 * @returns Trimmed workspace identifier.
 * @throws {GitRepositoryWorkspaceProviderError} When identifier is blank.
 */
function normalizeWorkspaceId(workspaceId: string): string {
    const normalizedWorkspaceId = workspaceId.trim()
    if (normalizedWorkspaceId.length === 0) {
        throw new GitRepositoryWorkspaceProviderError(
            GIT_REPOSITORY_WORKSPACE_PROVIDER_ERROR_CODE.INVALID_WORKSPACE_ID,
        )
    }

    return normalizedWorkspaceId
}

/**
 * Resolves authenticated remote URL when access token is configured.
 *
 * @param remoteUrl Canonical remote URL.
 * @param accessToken Optional access token.
 * @returns Clone-ready remote URL.
 */
function resolveCloneRemoteUrl(
    remoteUrl: string,
    accessToken: string | undefined,
): string {
    if (accessToken === undefined) {
        return remoteUrl
    }

    const parsedUrl = new URL(remoteUrl)
    parsedUrl.username = "x-access-token"
    parsedUrl.password = accessToken
    return parsedUrl.toString()
}

/**
 * Creates temporary workspace directory.
 *
 * @param parentDirectory Parent directory for temporary workspaces.
 * @returns Prepared workspace directory path.
 */
async function createWorkspaceDirectory(parentDirectory: string): Promise<string> {
    await mkdir(parentDirectory, {recursive: true})
    return mkdtemp(join(parentDirectory, DEFAULT_WORKSPACE_PREFIX))
}

/**
 * Builds clone arguments with optional shallow mode.
 *
 * @param remoteUrl Clone-ready remote URL.
 * @param workspacePath Target workspace path.
 * @param shallow Whether shallow clone is requested.
 * @returns Git clone arguments.
 */
function buildCloneArguments(
    remoteUrl: string,
    workspacePath: string,
    shallow: boolean,
): readonly string[] {
    const argumentsList = ["clone", "--progress", "--no-checkout"] as string[]

    if (shallow) {
        argumentsList.push("--depth", "1")
    }

    argumentsList.push(remoteUrl, workspacePath)
    return argumentsList
}

/**
 * Reports parsed progress lines to optional callback.
 *
 * @param stderr Captured stderr output.
 * @param phase Workspace lifecycle phase.
 * @param onProgress Optional progress callback.
 */
async function reportCommandProgress(
    stderr: string,
    phase: RepositoryWorkspacePhase,
    onProgress: ICreateRepositoryWorkspaceInput["onProgress"],
): Promise<void> {
    if (onProgress === undefined) {
        return
    }

    for (const progress of parseProgressEvents(stderr, phase)) {
        await onProgress(progress)
    }
}

/**
 * Emits one progress event when callback exists.
 *
 * @param progress Progress payload.
 * @param onProgress Optional progress callback.
 */
async function emitProgress(
    progress: IRepositoryWorkspaceProgress,
    onProgress: ICreateRepositoryWorkspaceInput["onProgress"],
): Promise<void> {
    if (onProgress !== undefined) {
        await onProgress(progress)
    }
}

/**
 * Parses git stderr into normalized workspace progress events.
 *
 * @param stderr Captured stderr output.
 * @param phase Workspace lifecycle phase.
 * @returns Parsed progress events.
 */
function parseProgressEvents(
    stderr: string,
    phase: RepositoryWorkspacePhase,
): readonly IRepositoryWorkspaceProgress[] {
    const events: IRepositoryWorkspaceProgress[] = []

    for (const rawLine of stderr.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (line.length === 0) {
            continue
        }

        const counters = line.match(/\((\d+)\/(\d+)\)/)
        const receivedObjects =
            counters?.[1] !== undefined ? Number(counters[1]) : undefined
        const totalObjects =
            counters?.[2] !== undefined ? Number(counters[2]) : undefined

        events.push({
            phase,
            message: line,
            receivedObjects,
            totalObjects,
        })
    }

    return events
}

/**
 * Removes workspace directory and ignores cleanup failures.
 *
 * @param workspacePath Workspace directory path.
 */
async function safeRemoveWorkspace(workspacePath: string): Promise<void> {
    try {
        await rm(workspacePath, {
            recursive: true,
            force: true,
        })
    } catch {
        return
    }
}

/**
 * Executes git command and captures stdout/stderr buffers.
 *
 * @param command Binary name.
 * @param args Command arguments.
 * @param options Optional execution settings.
 * @returns Captured command output.
 */
async function executeGitCommand(
    command: string,
    args: readonly string[],
    options: IGitCommandExecutionOptions = {},
): Promise<IGitCommandExecutionResult> {
    return new Promise<IGitCommandExecutionResult>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            stdio: ["ignore", "pipe", "pipe"],
        })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (chunk: Buffer | string): void => {
            stdout += chunk.toString()
        })
        child.stderr.on("data", (chunk: Buffer | string): void => {
            stderr += chunk.toString()
        })
        child.on("error", (error: Error): void => {
            reject(error)
        })
        child.on("close", (exitCode: number | null): void => {
            if (exitCode !== 0) {
                reject(
                    new Error(
                        stderr.trim().length > 0
                            ? stderr.trim()
                            : `Command failed with exit code ${exitCode ?? -1}`,
                    ),
                )
                return
            }

            resolve({stdout, stderr})
        })
    })
}

/**
 * Resolves lower-level error message.
 *
 * @param error Unknown thrown value.
 * @returns Human-readable cause message.
 */
function resolveCauseMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    return "Unknown workspace provider failure"
}
