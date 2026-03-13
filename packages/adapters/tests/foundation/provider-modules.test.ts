import {describe, expect, test} from "bun:test"

import {Container, TOKENS} from "@codenautic/core"

import {GIT_TOKENS, GitProviderFactory, registerGitModule} from "../../src/git"
import {LLM_TOKENS, LlmProviderFactory, registerLlmModule} from "../../src/llm"
import {
    NOTIFICATION_TOKENS,
    NotificationProviderFactory,
    registerNotificationsModule,
} from "../../src/notifications"
import {registerReviewModule} from "../../src/review"
import {registerRuleModule} from "../../src/rule"
import {
    createGitProviderMock,
    createLlmProviderMock,
    createNotificationProviderMock,
    createPipelineCheckpointStoreMock,
    createRepositoryWorkspaceProviderMock,
    createReviewRepositoryMock,
    createRuleRepositoryMock,
} from "../helpers/provider-factories"

describe("Provider modules registration", () => {
    test("registerGitModule binds provider to adapters token", () => {
        const container = new Container()
        const provider = createGitProviderMock()

        registerGitModule(container, {provider})

        const resolved = container.resolve(GIT_TOKENS.Provider)

        expect(resolved).toBe(provider)
    })

    test("registerLlmModule binds provider to adapters token", () => {
        const container = new Container()
        const provider = createLlmProviderMock()

        registerLlmModule(container, {provider})

        const resolved = container.resolve(LLM_TOKENS.Provider)

        expect(resolved).toBe(provider)
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
