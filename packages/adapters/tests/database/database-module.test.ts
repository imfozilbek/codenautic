import {describe, expect, test} from "bun:test"

import {Container, TOKENS} from "@codenautic/core"

import type {Connection} from "mongoose"

import {
    AllowAllAuthService,
    DATABASE_TOKENS,
    DefaultRepositoryConfigLoader,
    MongoOrganizationConfigLoader,
    type IDatabaseModuleAdapters,
    type IDatabaseModuleFactories,
    type IDatabaseModuleRepositories,
    type IRegisterDatabaseModuleOptions,
    registerDatabaseModule,
} from "../../src/database"

interface ICompleteRegisterDatabaseModuleOptions extends IRegisterDatabaseModuleOptions {
    readonly factories: IDatabaseModuleFactories
    readonly repositories: IDatabaseModuleRepositories
    readonly adapters: IDatabaseModuleAdapters
}

describe("registerDatabaseModule", () => {
    test("binds all database factory tokens", () => {
        const container = new Container()
        const options = createCompleteDatabaseModuleOptions()

        registerDatabaseModule(container, options)

        expect(container.resolve(DATABASE_TOKENS.Factories.Review)).toBe(options.factories.review)
        expect(container.resolve(DATABASE_TOKENS.Factories.Task)).toBe(options.factories.task)
        expect(container.resolve(DATABASE_TOKENS.Factories.Rule)).toBe(options.factories.rule)
        expect(container.resolve(DATABASE_TOKENS.Factories.RuleCategory)).toBe(
            options.factories.ruleCategory,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.PromptTemplate)).toBe(
            options.factories.promptTemplate,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.PromptConfiguration)).toBe(
            options.factories.promptConfiguration,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.ExpertPanel)).toBe(
            options.factories.expertPanel,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.ReviewIssueTicket)).toBe(
            options.factories.reviewIssueTicket,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.Organization)).toBe(
            options.factories.organization,
        )
        expect(container.resolve(DATABASE_TOKENS.Factories.SystemSettings)).toBe(
            options.factories.systemSettings,
        )
    })

    test("binds all repositories to adapters and core tokens", () => {
        const container = new Container()
        const options = createCompleteDatabaseModuleOptions()

        registerDatabaseModule(container, options)

        expect(container.resolve(DATABASE_TOKENS.Repositories.Review)).toBe(options.repositories.review)
        expect(container.resolve(TOKENS.Review.Repository)).toBe(options.repositories.review)

        expect(container.resolve(DATABASE_TOKENS.Repositories.Task)).toBe(options.repositories.task)
        expect(container.resolve(TOKENS.Task.Repository)).toBe(options.repositories.task)

        expect(container.resolve(DATABASE_TOKENS.Repositories.Rule)).toBe(options.repositories.rule)
        expect(container.resolve(TOKENS.Rule.Repository)).toBe(options.repositories.rule)

        expect(container.resolve(DATABASE_TOKENS.Repositories.LibraryRule)).toBe(
            options.repositories.libraryRule,
        )
        expect(container.resolve(TOKENS.Rule.LibraryRepository)).toBe(
            options.repositories.libraryRule,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.RuleCategory)).toBe(
            options.repositories.ruleCategory,
        )
        expect(container.resolve(TOKENS.Rule.CategoryRepository)).toBe(
            options.repositories.ruleCategory,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.PromptTemplate)).toBe(
            options.repositories.promptTemplate,
        )
        expect(container.resolve(TOKENS.Prompt.TemplateRepository)).toBe(
            options.repositories.promptTemplate,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.PromptConfiguration)).toBe(
            options.repositories.promptConfiguration,
        )
        expect(container.resolve(TOKENS.Prompt.ConfigurationRepository)).toBe(
            options.repositories.promptConfiguration,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.ExpertPanel)).toBe(
            options.repositories.expertPanel,
        )
        expect(container.resolve(TOKENS.Prompt.ExpertPanelRepository)).toBe(
            options.repositories.expertPanel,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.ReviewIssueTicket)).toBe(
            options.repositories.reviewIssueTicket,
        )
        expect(container.resolve(TOKENS.Review.IssueTicketRepository)).toBe(
            options.repositories.reviewIssueTicket,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.Organization)).toBe(
            options.repositories.organization,
        )
        expect(container.resolve(TOKENS.Organization.Repository)).toBe(
            options.repositories.organization,
        )

        expect(container.resolve(DATABASE_TOKENS.Repositories.SystemSettings)).toBe(
            options.repositories.systemSettings,
        )
        expect(container.resolve(TOKENS.Common.SystemSettingsRepository)).toBe(
            options.repositories.systemSettings,
        )
    })

    test("binds adapter tokens and maps repository config loader to core token", () => {
        const container = new Container()
        const options = createCompleteDatabaseModuleOptions()

        registerDatabaseModule(container, options)

        expect(container.resolve(DATABASE_TOKENS.Adapters.AuthService)).toBe(
            options.adapters.authService,
        )
        expect(container.resolve(DATABASE_TOKENS.Adapters.OrganizationConfigLoader)).toBe(
            options.adapters.organizationConfigLoader,
        )
        expect(container.resolve(DATABASE_TOKENS.Adapters.RepositoryConfigLoader)).toBe(
            options.adapters.repositoryConfigLoader,
        )
        expect(container.resolve(TOKENS.Review.RepositoryConfigLoader)).toBe(
            options.adapters.repositoryConfigLoader,
        )
    })

    test("keeps optional bindings absent when not provided", () => {
        const container = new Container()
        const connectionManager = createConnectionManager()

        registerDatabaseModule(container, {
            connectionManager,
        })

        expect(container.resolve(DATABASE_TOKENS.ConnectionManager)).toBe(connectionManager)
        expect(container.has(DATABASE_TOKENS.Factories.Review)).toBe(false)
        expect(container.has(DATABASE_TOKENS.Repositories.Review)).toBe(false)
        expect(container.has(DATABASE_TOKENS.Adapters.RepositoryConfigLoader)).toBe(false)
        expect(container.has(TOKENS.Review.Repository)).toBe(false)
        expect(container.has(TOKENS.Review.RepositoryConfigLoader)).toBe(false)
    })
})

/**
 * Creates complete DB module options with all optional dependencies.
 *
 * @returns Ready-to-use registration options.
 */
function createCompleteDatabaseModuleOptions(): ICompleteRegisterDatabaseModuleOptions {
    const organizationConfigLoader = new MongoOrganizationConfigLoader({
        findOne(_filter): Promise<null> {
            return Promise.resolve(null)
        },
    })
    const repositoryConfigLoader = new DefaultRepositoryConfigLoader({
        systemSettingsModel: {
            findOne(_filter): Promise<null> {
                return Promise.resolve(null)
            },
        },
        organizationConfigLoader,
    })

    return {
        connectionManager: createConnectionManager(),
        factories: {
            review: createStub<IDatabaseModuleFactories["review"]>(),
            task: createStub<IDatabaseModuleFactories["task"]>(),
            rule: createStub<IDatabaseModuleFactories["rule"]>(),
            ruleCategory: createStub<IDatabaseModuleFactories["ruleCategory"]>(),
            promptTemplate: createStub<IDatabaseModuleFactories["promptTemplate"]>(),
            promptConfiguration: createStub<IDatabaseModuleFactories["promptConfiguration"]>(),
            expertPanel: createStub<IDatabaseModuleFactories["expertPanel"]>(),
            reviewIssueTicket: createStub<IDatabaseModuleFactories["reviewIssueTicket"]>(),
            organization: createStub<IDatabaseModuleFactories["organization"]>(),
            systemSettings: createStub<IDatabaseModuleFactories["systemSettings"]>(),
        },
        repositories: {
            review: createStub<IDatabaseModuleRepositories["review"]>(),
            task: createStub<IDatabaseModuleRepositories["task"]>(),
            rule: createStub<IDatabaseModuleRepositories["rule"]>(),
            libraryRule: createStub<IDatabaseModuleRepositories["libraryRule"]>(),
            ruleCategory: createStub<IDatabaseModuleRepositories["ruleCategory"]>(),
            promptTemplate: createStub<IDatabaseModuleRepositories["promptTemplate"]>(),
            promptConfiguration: createStub<IDatabaseModuleRepositories["promptConfiguration"]>(),
            expertPanel: createStub<IDatabaseModuleRepositories["expertPanel"]>(),
            reviewIssueTicket: createStub<IDatabaseModuleRepositories["reviewIssueTicket"]>(),
            organization: createStub<IDatabaseModuleRepositories["organization"]>(),
            systemSettings: createStub<IDatabaseModuleRepositories["systemSettings"]>(),
        },
        adapters: {
            authService: new AllowAllAuthService(),
            organizationConfigLoader,
            repositoryConfigLoader,
        },
    }
}

/**
 * Creates connection manager test double.
 *
 * @returns Connection manager stub.
 */
function createConnectionManager(): IRegisterDatabaseModuleOptions["connectionManager"] {
    return {
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
}

/**
 * Creates generic typed stub for wiring tests.
 *
 * @template T Stub type.
 * @returns Typed empty stub.
 */
function createStub<T>(): T {
    return {} as T
}
