import {
    Container,
    TOKENS,
    type IExpertPanelRepository,
    type ILibraryRuleRepository,
    type InjectionToken,
    type IOrganizationRepository,
    type IPromptConfigurationRepository,
    type IPromptTemplateRepository,
    type IRepositoryConfigLoader,
    type IReviewIssueTicketRepository,
    type IReviewRepository,
    type IRuleCategoryRepository,
    type IRuleRepository,
    type ISystemSettingsRepository,
    type ITaskRepository,
} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {AllowAllAuthService} from "./adapters/allow-all-auth.service"
import type {MongoOrganizationConfigLoader} from "./adapters/mongo-organization-config-loader"
import {DATABASE_TOKENS} from "./database.tokens"
import type {IDatabaseConnectionManager} from "./database.types"
import type {IMongoRepositoryFactory} from "./repositories"
import type {
    IExpertPanelSchema,
    IOrganizationSchema,
    IPromptConfigurationSchema,
    IPromptTemplateSchema,
    IReviewIssueTicketSchema,
    IReviewSchema,
    IRuleCategorySchema,
    IRuleSchema,
    ISystemSettingSchema,
    ITaskSchema,
} from "./schemas"

type ReviewEntity = Parameters<IReviewRepository["save"]>[0]
type TaskEntity = Parameters<ITaskRepository["save"]>[0]
type RuleEntity = Parameters<IRuleRepository["save"]>[0]
type RuleCategoryEntity = Parameters<IRuleCategoryRepository["save"]>[0]
type PromptTemplateEntity = Parameters<IPromptTemplateRepository["save"]>[0]
type PromptConfigurationEntity = Parameters<IPromptConfigurationRepository["save"]>[0]
type ExpertPanelEntity = NonNullable<Awaited<ReturnType<IExpertPanelRepository["findByName"]>>>
type ReviewIssueTicketEntity = Parameters<IReviewIssueTicketRepository["save"]>[0]
type OrganizationEntity = Parameters<IOrganizationRepository["save"]>[0]
type SystemSettingRecord = Parameters<ISystemSettingsRepository["upsert"]>[0]

/**
 * Database mapper factories wiring contract.
 */
export interface IDatabaseModuleFactories {
    /**
     * Review aggregate mapper factory.
     */
    readonly review: IMongoRepositoryFactory<ReviewEntity, IReviewSchema>

    /**
     * Task aggregate mapper factory.
     */
    readonly task: IMongoRepositoryFactory<TaskEntity, ITaskSchema>

    /**
     * Rule aggregate mapper factory.
     */
    readonly rule: IMongoRepositoryFactory<RuleEntity, IRuleSchema>

    /**
     * Rule category mapper factory.
     */
    readonly ruleCategory: IMongoRepositoryFactory<RuleCategoryEntity, IRuleCategorySchema>

    /**
     * Prompt template mapper factory.
     */
    readonly promptTemplate: IMongoRepositoryFactory<
        PromptTemplateEntity,
        IPromptTemplateSchema
    >

    /**
     * Prompt configuration mapper factory.
     */
    readonly promptConfiguration: IMongoRepositoryFactory<
        PromptConfigurationEntity,
        IPromptConfigurationSchema
    >

    /**
     * Expert panel mapper factory.
     */
    readonly expertPanel: IMongoRepositoryFactory<ExpertPanelEntity, IExpertPanelSchema>

    /**
     * Review issue ticket mapper factory.
     */
    readonly reviewIssueTicket: IMongoRepositoryFactory<
        ReviewIssueTicketEntity,
        IReviewIssueTicketSchema
    >

    /**
     * Organization aggregate mapper factory.
     */
    readonly organization: IMongoRepositoryFactory<OrganizationEntity, IOrganizationSchema>

    /**
     * System settings mapper factory.
     */
    readonly systemSettings: IMongoRepositoryFactory<SystemSettingRecord, ISystemSettingSchema>
}

/**
 * Database repository wiring contract.
 */
export interface IDatabaseModuleRepositories {
    /**
     * Review repository implementation.
     */
    readonly review: IReviewRepository

    /**
     * Task repository implementation.
     */
    readonly task: ITaskRepository

    /**
     * Rule repository implementation.
     */
    readonly rule: IRuleRepository

    /**
     * Optional library rule repository implementation.
     */
    readonly libraryRule: ILibraryRuleRepository

    /**
     * Rule category repository implementation.
     */
    readonly ruleCategory: IRuleCategoryRepository

    /**
     * Prompt template repository implementation.
     */
    readonly promptTemplate: IPromptTemplateRepository

    /**
     * Prompt configuration repository implementation.
     */
    readonly promptConfiguration: IPromptConfigurationRepository

    /**
     * Expert panel repository implementation.
     */
    readonly expertPanel: IExpertPanelRepository

    /**
     * Review issue ticket repository implementation.
     */
    readonly reviewIssueTicket: IReviewIssueTicketRepository

    /**
     * Organization repository implementation.
     */
    readonly organization: IOrganizationRepository

    /**
     * System settings repository implementation.
     */
    readonly systemSettings: ISystemSettingsRepository
}

/**
 * Database auxiliary adapters wiring contract.
 */
export interface IDatabaseModuleAdapters {
    /**
     * Authorization service implementation.
     */
    readonly authService: AllowAllAuthService

    /**
     * Organization-level config layer loader.
     */
    readonly organizationConfigLoader: MongoOrganizationConfigLoader

    /**
     * Repository config loader implementation.
     */
    readonly repositoryConfigLoader: IRepositoryConfigLoader
}

/**
 * Registration options for database adapter module.
 */
export interface IRegisterDatabaseModuleOptions {
    /**
     * Database connection manager implementation.
     */
    readonly connectionManager: IDatabaseConnectionManager

    /**
     * Optional mapper factories wiring.
     */
    readonly factories?: Partial<IDatabaseModuleFactories>

    /**
     * Optional repositories wiring.
     */
    readonly repositories?: Partial<IDatabaseModuleRepositories>

    /**
     * Optional adapters wiring.
     */
    readonly adapters?: Partial<IDatabaseModuleAdapters>
}

/**
 * Registers database adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerDatabaseModule(
    container: Container,
    options: IRegisterDatabaseModuleOptions,
): void {
    bindConstantSingleton(container, DATABASE_TOKENS.ConnectionManager, options.connectionManager)
    registerFactories(container, options.factories)
    registerRepositories(container, options.repositories)
    registerAdapters(container, options.adapters)
}

/**
 * Registers optional database mapper factories.
 *
 * @param container Target container.
 * @param factories Optional mapper factories.
 */
function registerFactories(
    container: Container,
    factories?: Partial<IDatabaseModuleFactories>,
): void {
    if (factories === undefined) {
        return
    }

    bindOptionalSingleton(container, DATABASE_TOKENS.Factories.Review, factories.review)
    bindOptionalSingleton(container, DATABASE_TOKENS.Factories.Task, factories.task)
    bindOptionalSingleton(container, DATABASE_TOKENS.Factories.Rule, factories.rule)
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.RuleCategory,
        factories.ruleCategory,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.PromptTemplate,
        factories.promptTemplate,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.PromptConfiguration,
        factories.promptConfiguration,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.ExpertPanel,
        factories.expertPanel,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.ReviewIssueTicket,
        factories.reviewIssueTicket,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.Organization,
        factories.organization,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Factories.SystemSettings,
        factories.systemSettings,
    )
}

/**
 * Registers optional repositories with adapters and core tokens.
 *
 * @param container Target container.
 * @param repositories Optional repositories.
 */
function registerRepositories(
    container: Container,
    repositories?: Partial<IDatabaseModuleRepositories>,
): void {
    if (repositories === undefined) {
        return
    }

    bindOptionalSingleton(container, DATABASE_TOKENS.Repositories.Review, repositories.review)
    bindOptionalSingleton(container, TOKENS.Review.Repository, repositories.review)

    bindOptionalSingleton(container, DATABASE_TOKENS.Repositories.Task, repositories.task)
    bindOptionalSingleton(container, TOKENS.Task.Repository, repositories.task)

    bindOptionalSingleton(container, DATABASE_TOKENS.Repositories.Rule, repositories.rule)
    bindOptionalSingleton(container, TOKENS.Rule.Repository, repositories.rule)

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.LibraryRule,
        repositories.libraryRule,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Rule.LibraryRepository,
        repositories.libraryRule,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.RuleCategory,
        repositories.ruleCategory,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Rule.CategoryRepository,
        repositories.ruleCategory,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.PromptTemplate,
        repositories.promptTemplate,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Prompt.TemplateRepository,
        repositories.promptTemplate,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.PromptConfiguration,
        repositories.promptConfiguration,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Prompt.ConfigurationRepository,
        repositories.promptConfiguration,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.ExpertPanel,
        repositories.expertPanel,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Prompt.ExpertPanelRepository,
        repositories.expertPanel,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.ReviewIssueTicket,
        repositories.reviewIssueTicket,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Review.IssueTicketRepository,
        repositories.reviewIssueTicket,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.Organization,
        repositories.organization,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Organization.Repository,
        repositories.organization,
    )

    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Repositories.SystemSettings,
        repositories.systemSettings,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Common.SystemSettingsRepository,
        repositories.systemSettings,
    )
}

/**
 * Registers optional database adapters.
 *
 * @param container Target container.
 * @param adapters Optional adapters.
 */
function registerAdapters(
    container: Container,
    adapters?: Partial<IDatabaseModuleAdapters>,
): void {
    if (adapters === undefined) {
        return
    }

    bindOptionalSingleton(container, DATABASE_TOKENS.Adapters.AuthService, adapters.authService)
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Adapters.OrganizationConfigLoader,
        adapters.organizationConfigLoader,
    )
    bindOptionalSingleton(
        container,
        DATABASE_TOKENS.Adapters.RepositoryConfigLoader,
        adapters.repositoryConfigLoader,
    )
    bindOptionalSingleton(
        container,
        TOKENS.Review.RepositoryConfigLoader,
        adapters.repositoryConfigLoader,
    )
}

/**
 * Binds singleton value when it is provided.
 *
 * @template T Dependency type.
 * @param container Target container.
 * @param token Dependency token.
 * @param value Optional dependency value.
 */
function bindOptionalSingleton<T>(
    container: Container,
    token: InjectionToken<T>,
    value: T | undefined,
): void {
    if (value === undefined) {
        return
    }

    bindConstantSingleton(container, token, value)
}
