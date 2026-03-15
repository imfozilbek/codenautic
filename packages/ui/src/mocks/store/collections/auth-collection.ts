import type { IAuthSession, IAuthUser, TOAuthProvider } from "@/lib/auth/types"

/**
 * Хранимый пользователь с опциональным паролем для mock-авторизации.
 */
interface IStoredUser extends IAuthUser {
    readonly password?: string
}

/**
 * Коллекция авторизации: пользователи и сессии.
 *
 * Хранит in-memory данные для mock API слоя MSW.
 * Поддерживает CRUD-операции над пользователями и сессиями,
 * а также seed/clear для инициализации и сброса состояния.
 */
export class AuthCollection {
    /**
     * Хранилище пользователей по ID.
     */
    private users: Map<string, IStoredUser> = new Map()

    /**
     * Хранилище сессий по ID.
     */
    private sessions: Map<string, IAuthSession> = new Map()

    /**
     * ID текущей активной сессии.
     */
    private activeSessionId: string | undefined = undefined

    /**
     * Возвращает текущую активную сессию.
     *
     * @returns Активная сессия или undefined, если нет активной.
     */
    public getActiveSession(): IAuthSession | undefined {
        if (this.activeSessionId === undefined) {
            return undefined
        }
        return this.sessions.get(this.activeSessionId)
    }

    /**
     * Создаёт новую сессию для указанного пользователя и провайдера.
     *
     * Устанавливает срок истечения сессии через 24 часа от текущего момента.
     * Созданная сессия автоматически становится активной.
     *
     * @param provider - OAuth-провайдер авторизации.
     * @param userId - ID пользователя для привязки к сессии.
     * @returns Созданная сессия.
     * @throws Error если пользователь с указанным ID не найден.
     */
    public createSession(provider: TOAuthProvider, userId: string): IAuthSession {
        const user = this.users.get(userId)
        if (user === undefined) {
            throw new Error(`[AuthCollection] User not found: ${userId}`)
        }

        const sessionId = `session-${crypto.randomUUID()}`
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        const authUser: IAuthUser = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            roles: user.roles,
            tenantId: user.tenantId,
        }

        const session: IAuthSession = {
            provider,
            expiresAt,
            user: authUser,
        }

        this.sessions.set(sessionId, session)
        this.activeSessionId = sessionId

        return session
    }

    /**
     * Удаляет текущую активную сессию.
     *
     * Если активная сессия отсутствует, метод ничего не делает.
     */
    public deleteSession(): void {
        if (this.activeSessionId !== undefined) {
            this.sessions.delete(this.activeSessionId)
            this.activeSessionId = undefined
        }
    }

    /**
     * Находит пользователя по email-адресу.
     *
     * @param email - Email для поиска.
     * @returns Найденный пользователь или undefined.
     */
    public getUserByEmail(email: string): IStoredUser | undefined {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user
            }
        }
        return undefined
    }

    /**
     * Находит пользователя по ID.
     *
     * @param id - ID пользователя.
     * @returns Найденный пользователь или undefined.
     */
    public getUserById(id: string): IStoredUser | undefined {
        return this.users.get(id)
    }

    /**
     * Создаёт нового пользователя в коллекции.
     *
     * @param user - Данные пользователя для сохранения.
     * @returns Сохранённый пользователь.
     * @throws Error если пользователь с таким ID уже существует.
     */
    public createUser(user: IStoredUser): IStoredUser {
        if (this.users.has(user.id)) {
            throw new Error(`[AuthCollection] User already exists: ${user.id}`)
        }

        this.users.set(user.id, user)
        return user
    }

    /**
     * Возвращает список всех пользователей.
     *
     * @returns Неизменяемый массив всех пользователей.
     */
    public listUsers(): ReadonlyArray<IStoredUser> {
        return Array.from(this.users.values())
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданных пользователей.
     * Опционально устанавливает активную сессию по умолчанию.
     *
     * @param users - Массив пользователей для загрузки.
     * @param defaultSession - Опциональная сессия по умолчанию.
     */
    public seed(
        users: ReadonlyArray<IStoredUser>,
        defaultSession?: IAuthSession,
    ): void {
        this.clear()

        for (const user of users) {
            this.users.set(user.id, user)
        }

        if (defaultSession !== undefined) {
            const sessionId = "session-default"
            this.sessions.set(sessionId, defaultSession)
            this.activeSessionId = sessionId
        }
    }

    /**
     * Полностью очищает коллекцию: пользователи, сессии, активная сессия.
     */
    public clear(): void {
        this.users.clear()
        this.sessions.clear()
        this.activeSessionId = undefined
    }
}
