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
    codeReview: {
        all: (): readonly ["code-review"] => ["code-review"] as const,
        byId: (reviewId: string): readonly ["code-review", "by-id", string] => {
            return ["code-review", "by-id", reviewId] as const
        },
    },
}
