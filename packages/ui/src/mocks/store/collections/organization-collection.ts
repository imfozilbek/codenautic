import type {
    IBillingState,
    IOrgMember,
    IOrganizationProfile,
} from "@/lib/api/endpoints/organization.endpoint"

/**
 * Данные для seed-инициализации OrganizationCollection.
 */
export interface IOrganizationSeedData {
    /**
     * Профиль организации.
     */
    readonly profile: IOrganizationProfile
    /**
     * Состояние биллинга.
     */
    readonly billing: IBillingState
    /**
     * Начальный набор участников.
     */
    readonly members: ReadonlyArray<IOrgMember>
}

/**
 * Коллекция организации для mock API.
 *
 * Хранит in-memory данные профиля, биллинга и участников организации.
 * Поддерживает CRUD, seed и clear.
 */
export class OrganizationCollection {
    /**
     * Профиль организации.
     */
    private profile: IOrganizationProfile | undefined

    /**
     * Состояние биллинга.
     */
    private billing: IBillingState | undefined

    /**
     * Хранилище участников по ID.
     */
    private members: Map<string, IOrgMember> = new Map()

    /**
     * Возвращает профиль организации.
     *
     * @returns Профиль или undefined, если не инициализирован.
     */
    public getProfile(): IOrganizationProfile | undefined {
        return this.profile
    }

    /**
     * Обновляет профиль организации.
     *
     * @param patch - Частичные данные для обновления.
     * @returns Обновлённый профиль или undefined, если не инициализирован.
     */
    public updateProfile(
        patch: Partial<IOrganizationProfile>,
    ): IOrganizationProfile | undefined {
        if (this.profile === undefined) {
            return undefined
        }

        this.profile = {
            ...this.profile,
            ...patch,
        }

        return this.profile
    }

    /**
     * Возвращает состояние биллинга.
     *
     * @returns Биллинг или undefined, если не инициализирован.
     */
    public getBilling(): IBillingState | undefined {
        return this.billing
    }

    /**
     * Обновляет состояние биллинга.
     *
     * @param patch - Частичные данные для обновления.
     * @returns Обновлённый биллинг или undefined, если не инициализирован.
     */
    public updateBilling(patch: Partial<IBillingState>): IBillingState | undefined {
        if (this.billing === undefined) {
            return undefined
        }

        this.billing = {
            ...this.billing,
            ...patch,
        }

        return this.billing
    }

    /**
     * Возвращает список всех участников организации.
     *
     * @returns Массив участников.
     */
    public listMembers(): ReadonlyArray<IOrgMember> {
        return Array.from(this.members.values())
    }

    /**
     * Возвращает участника по идентификатору.
     *
     * @param id - Идентификатор участника.
     * @returns Участник или undefined, если не найден.
     */
    public getMemberById(id: string): IOrgMember | undefined {
        return this.members.get(id)
    }

    /**
     * Добавляет нового участника.
     *
     * @param member - Данные участника.
     */
    public addMember(member: IOrgMember): void {
        this.members.set(member.id, member)
    }

    /**
     * Обновляет роль участника.
     *
     * @param id - Идентификатор участника.
     * @param role - Новая роль.
     * @returns Обновлённый участник или undefined, если не найден.
     */
    public updateMemberRole(id: string, role: IOrgMember["role"]): IOrgMember | undefined {
        const existing = this.members.get(id)
        if (existing === undefined) {
            return undefined
        }

        const updated: IOrgMember = { ...existing, role }
        this.members.set(id, updated)
        return updated
    }

    /**
     * Удаляет участника.
     *
     * @param id - Идентификатор участника.
     * @returns true если участник был удалён, false иначе.
     */
    public removeMember(id: string): boolean {
        return this.members.delete(id)
    }

    /**
     * Заполняет коллекцию начальными данными.
     *
     * Очищает текущее состояние и загружает переданные данные.
     *
     * @param data - Данные для seed-инициализации.
     */
    public seed(data: IOrganizationSeedData): void {
        this.clear()

        this.profile = { ...data.profile }
        this.billing = { ...data.billing }

        for (const member of data.members) {
            this.members.set(member.id, member)
        }
    }

    /**
     * Полностью очищает коллекцию.
     */
    public clear(): void {
        this.profile = undefined
        this.billing = undefined
        this.members.clear()
    }
}
