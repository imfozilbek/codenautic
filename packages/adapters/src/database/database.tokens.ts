import {
    createToken,
    type InjectionToken,
    type IRepositoryConfigLoader,
} from "@codenautic/core"

import type {AllowAllAuthService} from "./adapters/allow-all-auth.service"
import type {MongoOrganizationConfigLoader} from "./adapters/mongo-organization-config-loader"
import type {IDatabaseConnectionManager} from "./database.types"

interface IDatabaseTokens {
    readonly ConnectionManager: InjectionToken<IDatabaseConnectionManager>
    readonly Factories: {
        readonly ExpertPanel: InjectionToken<unknown>
        readonly Organization: InjectionToken<unknown>
        readonly PromptConfiguration: InjectionToken<unknown>
        readonly PromptTemplate: InjectionToken<unknown>
        readonly Review: InjectionToken<unknown>
        readonly ReviewIssueTicket: InjectionToken<unknown>
        readonly Rule: InjectionToken<unknown>
        readonly RuleCategory: InjectionToken<unknown>
        readonly SystemSettings: InjectionToken<unknown>
        readonly Task: InjectionToken<unknown>
    }
    readonly Repositories: {
        readonly ExpertPanel: InjectionToken<unknown>
        readonly LibraryRule: InjectionToken<unknown>
        readonly Organization: InjectionToken<unknown>
        readonly PromptConfiguration: InjectionToken<unknown>
        readonly PromptTemplate: InjectionToken<unknown>
        readonly Review: InjectionToken<unknown>
        readonly ReviewIssueTicket: InjectionToken<unknown>
        readonly Rule: InjectionToken<unknown>
        readonly RuleCategory: InjectionToken<unknown>
        readonly SystemSettings: InjectionToken<unknown>
        readonly Task: InjectionToken<unknown>
    }
    readonly Adapters: {
        readonly AuthService: InjectionToken<AllowAllAuthService>
        readonly OrganizationConfigLoader: InjectionToken<MongoOrganizationConfigLoader>
        readonly RepositoryConfigLoader: InjectionToken<IRepositoryConfigLoader>
    }
}

/**
 * DI tokens for database adapter domain.
 */
export const DATABASE_TOKENS: IDatabaseTokens = {
    ConnectionManager: createToken<IDatabaseConnectionManager>(
        "adapters.database.connection-manager",
    ),
    Factories: {
        ExpertPanel: createToken<unknown>("adapters.database.factory.expert-panel"),
        Organization: createToken<unknown>("adapters.database.factory.organization"),
        PromptConfiguration: createToken<unknown>(
            "adapters.database.factory.prompt-configuration",
        ),
        PromptTemplate: createToken<unknown>("adapters.database.factory.prompt-template"),
        Review: createToken<unknown>("adapters.database.factory.review"),
        ReviewIssueTicket: createToken<unknown>(
            "adapters.database.factory.review-issue-ticket",
        ),
        Rule: createToken<unknown>("adapters.database.factory.rule"),
        RuleCategory: createToken<unknown>("adapters.database.factory.rule-category"),
        SystemSettings: createToken<unknown>("adapters.database.factory.system-settings"),
        Task: createToken<unknown>("adapters.database.factory.task"),
    },
    Repositories: {
        ExpertPanel: createToken<unknown>("adapters.database.repository.expert-panel"),
        LibraryRule: createToken<unknown>("adapters.database.repository.library-rule"),
        Organization: createToken<unknown>("adapters.database.repository.organization"),
        PromptConfiguration: createToken<unknown>(
            "adapters.database.repository.prompt-configuration",
        ),
        PromptTemplate: createToken<unknown>("adapters.database.repository.prompt-template"),
        Review: createToken<unknown>("adapters.database.repository.review"),
        ReviewIssueTicket: createToken<unknown>(
            "adapters.database.repository.review-issue-ticket",
        ),
        Rule: createToken<unknown>("adapters.database.repository.rule"),
        RuleCategory: createToken<unknown>("adapters.database.repository.rule-category"),
        SystemSettings: createToken<unknown>("adapters.database.repository.system-settings"),
        Task: createToken<unknown>("adapters.database.repository.task"),
    },
    Adapters: {
        AuthService: createToken<AllowAllAuthService>("adapters.database.adapter.auth-service"),
        OrganizationConfigLoader: createToken<MongoOrganizationConfigLoader>(
            "adapters.database.adapter.organization-config-loader",
        ),
        RepositoryConfigLoader: createToken<IRepositoryConfigLoader>(
            "adapters.database.adapter.repository-config-loader",
        ),
    },
} as const
