import type { AuthCollection } from "../collections/auth-collection"

/**
 * Заполняет auth-коллекцию набором тестовых пользователей и активной сессией.
 *
 * Создаёт трёх пользователей (Neo, Trinity, Morpheus) из platform-team
 * и устанавливает активную сессию для Neo (admin) через GitHub.
 *
 * @param auth - Коллекция авторизации для заполнения.
 */
export function seedAuth(auth: AuthCollection): void {
    auth.seed(
        [
            {
                id: "u-neo",
                email: "neo@metacortex.com",
                displayName: "Neo",
                role: "admin",
                roles: ["admin", "developer"],
                tenantId: "platform-team",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Neo",
            },
            {
                id: "u-trinity",
                email: "trinity@metacortex.com",
                displayName: "Trinity",
                role: "developer",
                roles: ["developer"],
                tenantId: "platform-team",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Trinity",
            },
            {
                id: "u-morpheus",
                email: "morpheus@zion.io",
                displayName: "Morpheus",
                role: "lead",
                roles: ["lead", "developer"],
                tenantId: "platform-team",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Morpheus",
            },
        ],
        {
            provider: "github",
            expiresAt: "2030-01-01T00:00:00.000Z",
            user: {
                id: "u-neo",
                email: "neo@metacortex.com",
                displayName: "Neo",
                role: "admin",
                roles: ["admin", "developer"],
                tenantId: "platform-team",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Neo",
            },
        },
    )
}
