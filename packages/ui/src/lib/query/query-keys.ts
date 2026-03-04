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
        preview: (
            sourceId: string,
        ): readonly ["external-context", "preview", string] => {
            return ["external-context", "preview", sourceId] as const
        },
    },
    repoConfig: {
        all: (): readonly ["repo-config"] => ["repo-config"] as const,
        byRepository: (
            repositoryId: string,
        ): readonly ["repo-config", "by-repository", string] => {
            return ["repo-config", "by-repository", repositoryId] as const
        },
    },
    dryRun: {
        all: (): readonly ["dry-run"] => ["dry-run"] as const,
        byRepository: (
            repositoryId: string,
        ): readonly ["dry-run", "by-repository", string] => {
            return ["dry-run", "by-repository", repositoryId] as const
        },
    },
    codeReview: {
        all: (): readonly ["code-review"] => ["code-review"] as const,
        byId: (reviewId: string): readonly ["code-review", "by-id", string] => {
            return ["code-review", "by-id", reviewId] as const
        },
    },
}
