/**
 * Единый factory для React Query ключей.
 */
export const queryKeys = {
    auth: {
        session: (): readonly ["auth", "session"] => ["auth", "session"] as const,
    },
    featureFlags: {
        all: (): readonly ["feature-flags"] => ["feature-flags"] as const,
    },
    permissions: {
        all: (): readonly ["permissions"] => ["permissions"] as const,
        byRole: (role: string): readonly ["permissions", "by-role", string] => {
            return ["permissions", "by-role", role]
        },
    },
    system: {
        health: (): readonly ["system", "health"] => ["system", "health"] as const,
    },
    customRules: {
        all: (): readonly ["custom-rules"] => ["custom-rules"] as const,
        list: (
            scope?: string,
            status?: string,
        ): readonly [
            "custom-rules",
            "list",
            {
                readonly scope?: string
                readonly status?: string
            },
        ] => {
            return [
                "custom-rules",
                "list",
                {
                    scope,
                    status,
                },
            ] as const
        },
    },
    externalContext: {
        all: (): readonly ["external-context"] => ["external-context"] as const,
        sources: (): readonly ["external-context", "sources"] => {
            return ["external-context", "sources"] as const
        },
        preview: (sourceId: string): readonly ["external-context", "preview", string] => {
            return ["external-context", "preview", sourceId] as const
        },
    },
    repoConfig: {
        all: (): readonly ["repo-config"] => ["repo-config"] as const,
        byRepository: (repositoryId: string): readonly ["repo-config", "by-repository", string] => {
            return ["repo-config", "by-repository", repositoryId] as const
        },
    },
    dryRun: {
        all: (): readonly ["dry-run"] => ["dry-run"] as const,
        byRepository: (repositoryId: string): readonly ["dry-run", "by-repository", string] => {
            return ["dry-run", "by-repository", repositoryId] as const
        },
    },
    ccrSummary: {
        all: (): readonly ["ccr-summary"] => ["ccr-summary"] as const,
        byRepository: (repositoryId: string): readonly ["ccr-summary", "by-repository", string] => {
            return ["ccr-summary", "by-repository", repositoryId] as const
        },
    },
    ccrWorkspace: {
        all: (): readonly ["ccr-workspace"] => ["ccr-workspace"] as const,
        list: (): readonly ["ccr-workspace", "list"] => {
            return ["ccr-workspace", "list"] as const
        },
        context: (reviewId: string): readonly ["ccr-workspace", "context", string] => {
            return ["ccr-workspace", "context", reviewId] as const
        },
    },
    codeReview: {
        all: (): readonly ["code-review"] => ["code-review"] as const,
        byId: (reviewId: string): readonly ["code-review", "by-id", string] => {
            return ["code-review", "by-id", reviewId] as const
        },
    },
    gitProviders: {
        all: (): readonly ["git-providers"] => ["git-providers"] as const,
        list: (): readonly ["git-providers", "list"] => {
            return ["git-providers", "list"] as const
        },
        byId: (providerId: string): readonly ["git-providers", "by-id", string] => {
            return ["git-providers", "by-id", providerId] as const
        },
    },
    contractValidation: {
        all: (): readonly ["contract-validation"] => ["contract-validation"] as const,
        blueprint: (): readonly ["contract-validation", "blueprint"] => {
            return ["contract-validation", "blueprint"] as const
        },
        guardrails: (): readonly ["contract-validation", "guardrails"] => {
            return ["contract-validation", "guardrails"] as const
        },
        violations: (): readonly ["contract-validation", "violations"] => {
            return ["contract-validation", "violations"] as const
        },
        trend: (): readonly ["contract-validation", "trend"] => {
            return ["contract-validation", "trend"] as const
        },
        graph: (): readonly ["contract-validation", "graph"] => {
            return ["contract-validation", "graph"] as const
        },
    },
    repositories: {
        all: (): readonly ["repositories"] => ["repositories"] as const,
        list: (): readonly ["repositories", "list"] => {
            return ["repositories", "list"] as const
        },
        byId: (repositoryId: string): readonly ["repositories", "by-id", string] => {
            return ["repositories", "by-id", repositoryId] as const
        },
        overview: (
            repositoryId: string,
        ): readonly ["repositories", "overview", string] => {
            return ["repositories", "overview", repositoryId] as const
        },
    },
    codeCity: {
        all: (): readonly ["code-city"] => ["code-city"] as const,
        profiles: (): readonly ["code-city", "profiles"] => {
            return ["code-city", "profiles"] as const
        },
        dependencyGraph: (
            repoId: string,
        ): readonly ["code-city", "dependency-graph", string] => {
            return ["code-city", "dependency-graph", repoId] as const
        },
    },
    reports: {
        all: (): readonly ["reports"] => ["reports"] as const,
        list: (): readonly ["reports", "list"] => {
            return ["reports", "list"] as const
        },
        byId: (reportId: string): readonly ["reports", "by-id", string] => {
            return ["reports", "by-id", reportId] as const
        },
    },
    issues: {
        all: (): readonly ["issues"] => ["issues"] as const,
        list: (
            status?: string,
            severity?: string,
            search?: string,
        ): readonly [
            "issues",
            "list",
            {
                readonly status?: string
                readonly severity?: string
                readonly search?: string
            },
        ] => {
            return [
                "issues",
                "list",
                {
                    status,
                    severity,
                    search,
                },
            ] as const
        },
    },
    triage: {
        all: (): readonly ["triage"] => ["triage"] as const,
        list: (
            scope?: string,
        ): readonly [
            "triage",
            "list",
            {
                readonly scope?: string
            },
        ] => {
            return [
                "triage",
                "list",
                {
                    scope,
                },
            ] as const
        },
    },
    teams: {
        all: (): readonly ["teams"] => ["teams"] as const,
        list: (): readonly ["teams", "list"] => {
            return ["teams", "list"] as const
        },
        byId: (teamId: string): readonly ["teams", "by-id", string] => {
            return ["teams", "by-id", teamId] as const
        },
    },
    byok: {
        all: (): readonly ["byok"] => ["byok"] as const,
        list: (): readonly ["byok", "list"] => {
            return ["byok", "list"] as const
        },
    },
    sso: {
        all: (): readonly ["sso"] => ["sso"] as const,
        saml: (): readonly ["sso", "saml"] => {
            return ["sso", "saml"] as const
        },
        oidc: (): readonly ["sso", "oidc"] => {
            return ["sso", "oidc"] as const
        },
    },
    organization: {
        all: (): readonly ["organization"] => ["organization"] as const,
        profile: (): readonly ["organization", "profile"] => {
            return ["organization", "profile"] as const
        },
        members: (): readonly ["organization", "members"] => {
            return ["organization", "members"] as const
        },
        billing: (): readonly ["organization", "billing"] => {
            return ["organization", "billing"] as const
        },
    },
    dashboard: {
        all: (): readonly ["dashboard"] => ["dashboard"] as const,
        metrics: (
            range: string,
        ): readonly ["dashboard", "metrics", string] => {
            return ["dashboard", "metrics", range] as const
        },
        statusDistribution: (
            range: string,
        ): readonly ["dashboard", "status-distribution", string] => {
            return ["dashboard", "status-distribution", range] as const
        },
        teamActivity: (
            range: string,
        ): readonly ["dashboard", "team-activity", string] => {
            return ["dashboard", "team-activity", range] as const
        },
        flowMetrics: (
            range: string,
        ): readonly ["dashboard", "flow-metrics", string] => {
            return ["dashboard", "flow-metrics", range] as const
        },
        tokenUsage: (
            range: string,
        ): readonly ["dashboard", "token-usage", string] => {
            return ["dashboard", "token-usage", range] as const
        },
        workQueue: (): readonly ["dashboard", "work-queue"] => {
            return ["dashboard", "work-queue"] as const
        },
        timeline: (): readonly ["dashboard", "timeline"] => {
            return ["dashboard", "timeline"] as const
        },
    },
}
