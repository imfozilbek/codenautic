/**
 * Единый factory для React Query ключей.
 */
export const queryKeys = {
    auth: {
        session: (): readonly ["auth", "session"] => ["auth", "session"] as const,
    },
    system: {
        health: (): readonly ["system", "health"] => ["system", "health"] as const,
    },
}
