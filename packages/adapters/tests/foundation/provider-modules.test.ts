import {describe, expect, test} from "bun:test"

import {
    Container,
    TOKENS,
    type IInboxRepository,
    type IMergeRequestDTO,
    type ILogger,
    type IOutboxRelayService,
    type IOutboxRepository,
    UniqueId,
} from "@codenautic/core"

import type {Connection} from "mongoose"

import {AST_TOKENS, registerAstModule} from "../../src/ast"
import {CONTEXT_TOKENS, registerContextModule} from "../../src/context"
import {
    DATABASE_TOKENS,
    type IDatabaseConnectionManager,
    registerDatabaseModule,
} from "../../src/database"
import {
    GIT_PROVIDER_HEALTH_ERROR_CODE,
    GIT_RATE_LIMIT_TIER,
    GIT_TOKENS,
    GitProviderHealthError,
    GitProviderFactory,
    registerGitModule,
} from "../../src/git"
import {
    LLM_RATE_LIMIT_TIER,
    LLM_TOKENS,
    LlmProviderFactory,
    registerLlmModule,
} from "../../src/llm"
import {
    InboxDeduplicationImpl,
    InboxDeduplicator,
    MESSAGING_TOKENS,
    OutboxWriter,
    registerMessagingModule,
} from "../../src/messaging"
import {
    NOTIFICATION_TOKENS,
    NotificationProviderFactory,
    registerNotificationsModule,
} from "../../src/notifications"
import {registerReviewModule} from "../../src/review"
import {registerRuleModule} from "../../src/rule"
import {
    WORKER_TOKENS,
    type IWorkerDlqManager,
    type IWorkerProcessorRegistry,
    type IWorkerQueueService,
    type IWorkerRedisConnection,
    type IWorkerRedisConnectionManager,
    type IWorkerRuntime,
    registerWorkerModule,
} from "../../src/worker"
import {
    createCodeChunkEmbeddingGeneratorMock,
    createCodeGraphPageRankServiceMock,
    createExternalContextProviderMock,
    createGraphRepositoryMock,
    createGitProviderMock,
    createLlmProviderMock,
    createNotificationProviderMock,
    createPipelineCheckpointStoreMock,
    createRepositoryWorkspaceProviderMock,
    createReviewRepositoryMock,
    createSourceCodeParserMock,
    createRuleRepositoryMock,
} from "../helpers/provider-factories"

/**
 * Asserts rejection with expected message fragment.
 *
 * @param promise Promise expected to reject.
 * @param messageFragment Expected message fragment.
 * @returns Completion promise.
 */
async function expectPromiseRejectMessage(
    promise: Promise<unknown>,
    messageFragment: string,
): Promise<void> {
    try {
        await promise
    } catch (error) {
        expect(error).toBeInstanceOf(Error)
        if (error instanceof Error) {
            expect(error.message).toContain(messageFragment)
            return
        }
    }

    throw new Error("Expected promise to reject with matching message")
}

describe("Provider modules registration", () => {
    test("registerGitModule binds provider to adapters token", () => {
        const container = new Container()
        const provider = createGitProviderMock()

        registerGitModule(container, {provider})

        const resolvedBlame = container.resolve(GIT_TOKENS.Blame)
        const resolvedPipelineStatus = container.resolve(GIT_TOKENS.PipelineStatus)
        const resolved = container.resolve(GIT_TOKENS.Provider)

        expect(resolvedBlame).toBe(provider)
        expect(resolvedPipelineStatus).toBe(provider)
        expect(resolved).toBe(provider)
    })

    test("registerGitModule applies optional git rate limiter wrapper", async () => {
        const container = new Container()
        const calls: string[] = []
        let currentTimeMs = 0
        const sleepCalls: number[] = []
        const provider = createGitProviderMock()
        provider.getMergeRequest = (id: string): Promise<IMergeRequestDTO> => {
            calls.push(id)
            return Promise.resolve({id} as IMergeRequestDTO)
        }

        registerGitModule(container, {
            provider,
            rateLimit: {
                organizationId: "org-module-rate-limit",
                tier: GIT_RATE_LIMIT_TIER.FREE,
                freeTierLimit: 1,
                windowMs: 1_000,
                now: (): number => currentTimeMs,
                sleep: (delayMs: number): Promise<void> => {
                    sleepCalls.push(delayMs)
                    currentTimeMs += delayMs
                    return Promise.resolve()
                },
            },
        })

        const resolvedProvider = container.resolve(GIT_TOKENS.Provider)

        await resolvedProvider.getMergeRequest("mr-1")
        await resolvedProvider.getMergeRequest("mr-2")

        expect(calls).toEqual([
            "mr-1",
            "mr-2",
        ])
        expect(sleepCalls).toEqual([1_000])
    })

    test("registerGitModule applies optional git retry wrapper", async () => {
        const container = new Container()
        let attempts = 0
        let currentTimeMs = 0
        const sleepCalls: number[] = []
        const provider = createGitProviderMock()
        provider.getMergeRequest = (id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts === 1) {
                const retryableError = new Error("temporary failure") as Error & {
                    statusCode: number
                }
                retryableError.statusCode = 500
                return Promise.reject(retryableError)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        }

        registerGitModule(container, {
            provider,
            retry: {
                maxAttempts: 2,
                baseDelayMs: 10,
                now: (): number => currentTimeMs,
                sleep: (delayMs: number): Promise<void> => {
                    sleepCalls.push(delayMs)
                    currentTimeMs += delayMs
                    return Promise.resolve()
                },
            },
        })

        const resolvedProvider = container.resolve(GIT_TOKENS.Provider)
        const mergeRequest = await resolvedProvider.getMergeRequest("mr-retry")

        expect(mergeRequest.id).toBe("mr-retry")
        expect(attempts).toBe(2)
        expect(sleepCalls).toEqual([10])
    })

    test("registerGitModule binds optional git health monitor and applies circuit breaker", async () => {
        const container = new Container()
        let currentTimeMs = 0
        let attempts = 0
        const provider = createGitProviderMock()
        provider.getMergeRequest = (id: string): Promise<IMergeRequestDTO> => {
            attempts += 1
            if (attempts === 1) {
                const retryableError = new Error("temporary failure") as Error & {
                    statusCode: number
                }
                retryableError.statusCode = 500
                return Promise.reject(retryableError)
            }

            return Promise.resolve({id} as IMergeRequestDTO)
        }

        registerGitModule(container, {
            provider,
            health: {
                autoStart: false,
                failureThreshold: 1,
                circuitOpenMs: 100,
                now: (): number => currentTimeMs,
                ping: async (): Promise<void> => Promise.resolve(),
            },
        })

        const resolvedProvider = container.resolve(GIT_TOKENS.Provider)
        const healthMonitor = container.resolve(GIT_TOKENS.HealthMonitor)

        expect(healthMonitor.getReport().status).toBe("HEALTHY")
        await expectPromiseRejectMessage(
            resolvedProvider.getMergeRequest("mr-open"),
            "temporary failure",
        )

        try {
            await resolvedProvider.getMergeRequest("mr-blocked")
        } catch (error) {
            expect(error).toBeInstanceOf(GitProviderHealthError)
            if (error instanceof GitProviderHealthError) {
                expect(error.code).toBe(GIT_PROVIDER_HEALTH_ERROR_CODE.CIRCUIT_OPEN)
            }
        }

        expect(healthMonitor.getReport().status).toBe("UNHEALTHY")
        expect(attempts).toBe(1)
        currentTimeMs += 100
    })

    test("registerLlmModule binds provider to adapters token", () => {
        const container = new Container()
        const provider = createLlmProviderMock()

        registerLlmModule(container, {provider})

        const resolved = container.resolve(LLM_TOKENS.Provider)

        expect(resolved).toBe(provider)
    })

    test("registerLlmModule applies optional llm rate limiter wrapper", async () => {
        let currentTimeMs = 0
        const sleepDelays: number[] = []
        let callCount = 0
        const provider = createLlmProviderMock()
        provider.chat = (): ReturnType<typeof provider.chat> => {
            callCount += 1
            return Promise.resolve({
                content: `ok-${String(callCount)}`,
                usage: {
                    input: 0,
                    output: 0,
                    total: 0,
                },
            })
        }
        const container = new Container()

        registerLlmModule(container, {
            provider,
            rateLimit: {
                organizationId: "org-llm-rate-limit",
                tier: LLM_RATE_LIMIT_TIER.FREE,
                freeTierLimit: 1,
                windowMs: 1_000,
                now: (): number => currentTimeMs,
                sleep: (delayMs: number): Promise<void> => {
                    sleepDelays.push(delayMs)
                    currentTimeMs += delayMs
                    return Promise.resolve()
                },
            },
        })

        const resolvedProvider = container.resolve(LLM_TOKENS.Provider)

        const firstResponse = await resolvedProvider.chat({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: "hello",
                },
            ],
        })
        const secondResponse = await resolvedProvider.chat({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: "world",
                },
            ],
        })

        expect(firstResponse.content).toBe("ok-1")
        expect(secondResponse.content).toBe("ok-2")
        expect(sleepDelays).toEqual([1_000])
        expect(callCount).toBe(2)
    })

    test("registerLlmModule binds optional provider factory token", () => {
        const container = new Container()
        const provider = createLlmProviderMock()
        const providerFactory = new LlmProviderFactory({
            openai: {
                provider,
                supportedModels: ["gpt-4o"],
            },
        })

        registerLlmModule(container, {
            provider,
            providerFactory,
        })

        const resolvedFactory = container.resolve(LLM_TOKENS.ProviderFactory)

        expect(resolvedFactory).toBe(providerFactory)
    })

    test("registerGitModule binds optional provider factory token", () => {
        const container = new Container()
        const githubProvider = createGitProviderMock()
        const provider = createGitProviderMock()
        const providerFactory = new GitProviderFactory({
            github: githubProvider,
        })

        registerGitModule(container, {
            provider,
            providerFactory,
        })

        const resolvedFactory = container.resolve(GIT_TOKENS.ProviderFactory)

        expect(resolvedFactory).toBe(providerFactory)
    })

    test("registerGitModule binds optional repository workspace provider token", () => {
        const container = new Container()
        const provider = createGitProviderMock()
        const repositoryWorkspaceProvider = createRepositoryWorkspaceProviderMock()

        registerGitModule(container, {
            provider,
            repositoryWorkspaceProvider,
        })

        const resolvedWorkspaceProvider = container.resolve(
            GIT_TOKENS.RepositoryWorkspaceProvider,
        )

        expect(resolvedWorkspaceProvider).toBe(repositoryWorkspaceProvider)
    })

    test("registerNotificationsModule binds providers collection token", () => {
        const container = new Container()
        const slackProvider = createNotificationProviderMock()
        const teamsProvider = createNotificationProviderMock("TEAMS")

        registerNotificationsModule(container, {
            providers: [
                slackProvider,
                teamsProvider,
            ],
        })

        const resolvedProviders = container.resolve(NOTIFICATION_TOKENS.Providers)

        expect(resolvedProviders).toEqual([
            slackProvider,
            teamsProvider,
        ])
    })

    test("registerNotificationsModule binds optional provider factory token", () => {
        const container = new Container()
        const slackProvider = createNotificationProviderMock()
        const providerFactory = new NotificationProviderFactory({
            slack: slackProvider,
        })

        registerNotificationsModule(container, {
            providers: [slackProvider],
            providerFactory,
        })

        const resolvedFactory = container.resolve(NOTIFICATION_TOKENS.ProviderFactory)

        expect(resolvedFactory).toBe(providerFactory)
    })

    test("registerContextModule binds providers collection and default provider", () => {
        const container = new Container()
        const jiraProvider = createExternalContextProviderMock("JIRA")
        const sentryProvider = createExternalContextProviderMock("SENTRY")

        registerContextModule(container, {
            providers: [
                jiraProvider,
                sentryProvider,
            ],
        })

        const resolvedProviders = container.resolve(CONTEXT_TOKENS.Providers)
        const resolvedDefaultProvider = container.resolve(CONTEXT_TOKENS.Provider)
        const resolvedCoreProvider = container.resolve(TOKENS.Review.ExternalContextProvider)

        expect(resolvedProviders).toEqual([
            jiraProvider,
            sentryProvider,
        ])
        expect(resolvedDefaultProvider).toBe(jiraProvider)
        expect(resolvedCoreProvider).toBe(jiraProvider)
    })

    test("registerContextModule binds explicit default provider override", () => {
        const container = new Container()
        const jiraProvider = createExternalContextProviderMock("JIRA")
        const linearProvider = createExternalContextProviderMock("LINEAR")

        registerContextModule(container, {
            providers: [
                jiraProvider,
                linearProvider,
            ],
            defaultProvider: linearProvider,
        })

        const resolvedDefaultProvider = container.resolve(CONTEXT_TOKENS.Provider)
        const resolvedCoreProvider = container.resolve(TOKENS.Review.ExternalContextProvider)

        expect(resolvedDefaultProvider).toBe(linearProvider)
        expect(resolvedCoreProvider).toBe(linearProvider)
    })

    test("registerAstModule binds source-code parser to adapters and core tokens", () => {
        const container = new Container()
        const parser = createSourceCodeParserMock()

        registerAstModule(container, {
            sourceCodeParser: parser,
        })

        const resolvedAdaptersParser = container.resolve(AST_TOKENS.SourceCodeParser)
        const resolvedCoreParser = container.resolve(TOKENS.Scanning.SourceCodeParser)

        expect(resolvedAdaptersParser).toBe(parser)
        expect(resolvedCoreParser).toBe(parser)
    })

    test("registerAstModule binds optional graph and vector services", () => {
        const container = new Container()
        const parser = createSourceCodeParserMock()
        const graphRepository = createGraphRepositoryMock()
        const embeddingGenerator = createCodeChunkEmbeddingGeneratorMock()
        const pageRankService = createCodeGraphPageRankServiceMock()

        registerAstModule(container, {
            sourceCodeParser: parser,
            graphRepository,
            codeChunkEmbeddingGenerator: embeddingGenerator,
            pageRankService,
        })

        const resolvedGraphRepository = container.resolve(AST_TOKENS.GraphRepository)
        const resolvedCoreGraphRepository = container.resolve(TOKENS.Analysis.GraphRepository)
        const resolvedEmbeddingGenerator = container.resolve(
            AST_TOKENS.CodeChunkEmbeddingGenerator,
        )
        const resolvedCoreEmbeddingGenerator = container.resolve(
            TOKENS.Vector.CodeChunkEmbeddingGenerator,
        )
        const resolvedPageRankService = container.resolve(AST_TOKENS.PageRankService)
        const resolvedCorePageRankService = container.resolve(
            TOKENS.Analysis.CodeGraphPageRankService,
        )

        expect(resolvedGraphRepository).toBe(graphRepository)
        expect(resolvedCoreGraphRepository).toBe(graphRepository)
        expect(resolvedEmbeddingGenerator).toBe(embeddingGenerator)
        expect(resolvedCoreEmbeddingGenerator).toBe(embeddingGenerator)
        expect(resolvedPageRankService).toBe(pageRankService)
        expect(resolvedCorePageRankService).toBe(pageRankService)
    })

    test("registerMessagingModule binds outbox writer and inbox deduplicator", () => {
        const container = new Container()
        const outboxWriter = new OutboxWriter()
        const inboxDeduplicator = new InboxDeduplicator()
        const outboxRepository: IOutboxRepository = {
            findById(_id): ReturnType<IOutboxRepository["findById"]> {
                return Promise.resolve(null)
            },
            save(_entity): ReturnType<IOutboxRepository["save"]> {
                return Promise.resolve()
            },
            findPending(_limit): ReturnType<IOutboxRepository["findPending"]> {
                return Promise.resolve([])
            },
            markSent(_id: string | UniqueId): ReturnType<IOutboxRepository["markSent"]> {
                return Promise.resolve()
            },
            markFailed(_id: string | UniqueId): ReturnType<IOutboxRepository["markFailed"]> {
                return Promise.resolve()
            },
        }
        const inboxRepository: IInboxRepository = {
            findById(_id): ReturnType<IInboxRepository["findById"]> {
                return Promise.resolve(null)
            },
            save(_entity): ReturnType<IInboxRepository["save"]> {
                return Promise.resolve()
            },
            findByMessageId(_messageId): ReturnType<IInboxRepository["findByMessageId"]> {
                return Promise.resolve(null)
            },
            markProcessed(_id: string | UniqueId): ReturnType<IInboxRepository["markProcessed"]> {
                return Promise.resolve()
            },
        }
        const outboxRelayService: IOutboxRelayService = {
            relay(): ReturnType<IOutboxRelayService["relay"]> {
                return Promise.resolve({
                    total: 0,
                    sent: 0,
                    failed: 0,
                    retriable: 0,
                    permanentlyFailed: 0,
                })
            },
        }
        const inboxDeduplication = new InboxDeduplicationImpl({
            inboxRepository,
            now: () => new Date("2026-03-14T19:00:00.000Z"),
        })

        registerMessagingModule(container, {
            outboxWriter,
            inboxDeduplicator,
            outboxRepository,
            inboxRepository,
            outboxRelayService,
            inboxDeduplication,
        })

        const resolvedOutboxWriter = container.resolve(MESSAGING_TOKENS.OutboxWriter)
        const resolvedInboxDeduplicator = container.resolve(MESSAGING_TOKENS.InboxDeduplicator)
        const resolvedOutboxRepository = container.resolve(MESSAGING_TOKENS.OutboxRepository)
        const resolvedInboxRepository = container.resolve(MESSAGING_TOKENS.InboxRepository)
        const resolvedOutboxRelayService = container.resolve(
            MESSAGING_TOKENS.OutboxRelayService,
        )
        const resolvedInboxDeduplication = container.resolve(
            MESSAGING_TOKENS.InboxDeduplication,
        )
        const resolvedCoreOutboxRepository = container.resolve(TOKENS.Messaging.OutboxRepository)
        const resolvedCoreInboxRepository = container.resolve(TOKENS.Messaging.InboxRepository)

        expect(resolvedOutboxWriter).toBe(outboxWriter)
        expect(resolvedInboxDeduplicator).toBe(inboxDeduplicator)
        expect(resolvedOutboxRepository).toBe(outboxRepository)
        expect(resolvedInboxRepository).toBe(inboxRepository)
        expect(resolvedOutboxRelayService).toBe(outboxRelayService)
        expect(resolvedInboxDeduplication).toBe(inboxDeduplication)
        expect(resolvedCoreOutboxRepository).toBe(outboxRepository)
        expect(resolvedCoreInboxRepository).toBe(inboxRepository)
    })

    test("registerWorkerModule binds optional worker adapters", () => {
        const container = new Container()
        const logger: ILogger = {
            info(_message: string, _context?: Record<string, unknown>): Promise<void> {
                return Promise.resolve()
            },
            warn(_message: string, _context?: Record<string, unknown>): Promise<void> {
                return Promise.resolve()
            },
            error(_message: string, _context?: Record<string, unknown>): Promise<void> {
                return Promise.resolve()
            },
            debug(_message: string, _context?: Record<string, unknown>): Promise<void> {
                return Promise.resolve()
            },
            child(_context: Record<string, unknown>): ILogger {
                return this
            },
        }
        const queueService: IWorkerQueueService = {
            enqueue(_payload): Promise<string> {
                return Promise.resolve("job-1")
            },
            dequeue(_limit?: number): Promise<readonly []> {
                return Promise.resolve([])
            },
            getStatus(_jobId: string): Promise<null> {
                return Promise.resolve(null)
            },
        }
        const dlqManager: IWorkerDlqManager = {
            start(): Promise<void> {
                return Promise.resolve()
            },
            stop(): Promise<void> {
                return Promise.resolve()
            },
            retry(_jobId: string): Promise<boolean> {
                return Promise.resolve(false)
            },
        }
        const processorRegistry: IWorkerProcessorRegistry = {
            register(_jobType: string, _processor: (payload: unknown) => Promise<void>): void {
                return
            },
            get(_jobType: string): ((payload: unknown) => Promise<void>) | undefined {
                return undefined
            },
        }
        const runtime: IWorkerRuntime = {
            start(): Promise<void> {
                return Promise.resolve()
            },
            stop(): Promise<void> {
                return Promise.resolve()
            },
            healthCheck(): ReturnType<IWorkerRuntime["healthCheck"]> {
                return {
                    queueName: "worker-queue",
                    status: "IDLE",
                    isHealthy: false,
                    activeJobs: 0,
                    prefetch: 1,
                    gracefulShutdownTimeoutMs: 30_000,
                    startedAt: null,
                    stoppedAt: null,
                    lastFailure: null,
                }
            },
        }
        const redisConnectionManager: IWorkerRedisConnectionManager = {
            connect(): Promise<void> {
                return Promise.resolve()
            },
            disconnect(): Promise<void> {
                return Promise.resolve()
            },
            getConnection(): IWorkerRedisConnection {
                return {
                    connect(): Promise<void> {
                        return Promise.resolve()
                    },
                    quit(): Promise<void> {
                        return Promise.resolve()
                    },
                    ping(_message?: string): Promise<string> {
                        return Promise.resolve("PONG")
                    },
                }
            },
            healthCheck(): ReturnType<IWorkerRedisConnectionManager["healthCheck"]> {
                return Promise.resolve({
                    status: "IDLE",
                    isHealthy: false,
                    poolSize: 0,
                    connectedConnections: 0,
                    degradedConnections: 0,
                    lastFailure: null,
                    checkedAt: new Date("2026-03-14T21:30:00.000Z"),
                })
            },
        }

        registerWorkerModule(container, {
            logger,
            queueService,
            dlqManager,
            processorRegistry,
            redisConnectionManager,
            runtime,
        })

        const resolvedLogger = container.resolve(WORKER_TOKENS.Logger)
        const resolvedCoreLogger = container.resolve(TOKENS.Common.Logger)
        const resolvedQueueService = container.resolve(WORKER_TOKENS.QueueService)
        const resolvedDlqManager = container.resolve(WORKER_TOKENS.DlqManager)
        const resolvedProcessorRegistry = container.resolve(WORKER_TOKENS.ProcessorRegistry)
        const resolvedRedisConnectionManager = container.resolve(
            WORKER_TOKENS.RedisConnectionManager,
        )
        const resolvedRuntime = container.resolve(WORKER_TOKENS.Runtime)

        expect(resolvedLogger).toBe(logger)
        expect(resolvedCoreLogger).toBe(logger)
        expect(resolvedQueueService).toBe(queueService)
        expect(resolvedDlqManager).toBe(dlqManager)
        expect(resolvedProcessorRegistry).toBe(processorRegistry)
        expect(resolvedRedisConnectionManager).toBe(redisConnectionManager)
        expect(resolvedRuntime).toBe(runtime)
    })

    test("registerDatabaseModule binds connection manager", () => {
        const container = new Container()
        const connectionManager: IDatabaseConnectionManager = {
            connect(): Promise<void> {
                return Promise.resolve()
            },
            disconnect(): Promise<void> {
                return Promise.resolve()
            },
            getConnection(): Connection | null {
                return null
            },
            isConnected(): boolean {
                return false
            },
        }

        registerDatabaseModule(container, {
            connectionManager,
        })

        const resolvedConnectionManager = container.resolve(DATABASE_TOKENS.ConnectionManager)

        expect(resolvedConnectionManager).toBe(connectionManager)
    })

    test("registerReviewModule binds review repository", () => {
        const container = new Container()
        const repository = createReviewRepositoryMock()

        registerReviewModule(container, {repository})

        const resolvedRepository = container.resolve(TOKENS.Review.Repository)

        expect(resolvedRepository).toBe(repository)
        expect(container.has(TOKENS.Review.PipelineCheckpointStore)).toBe(false)
    })

    test("registerReviewModule binds optional checkpoint store", () => {
        const container = new Container()
        const repository = createReviewRepositoryMock()
        const checkpointStore = createPipelineCheckpointStoreMock()

        registerReviewModule(container, {
            repository,
            pipelineCheckpointStore: checkpointStore,
        })

        const resolvedStore = container.resolve(TOKENS.Review.PipelineCheckpointStore)

        expect(resolvedStore).toBe(checkpointStore)
    })

    test("registerRuleModule binds rule repository", () => {
        const container = new Container()
        const repository = createRuleRepositoryMock()

        registerRuleModule(container, {repository})

        const resolvedRepository = container.resolve(TOKENS.Rule.Repository)

        expect(resolvedRepository).toBe(repository)
    })
})
