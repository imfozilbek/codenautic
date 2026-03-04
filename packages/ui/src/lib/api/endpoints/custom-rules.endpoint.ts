import type { IHttpClient } from "../http-client"

/** Доступные типы custom-правил. */
export const CUSTOM_RULE_TYPE = {
    regex: "REGEX",
    prompt: "PROMPT",
    ast: "AST",
} as const

/** Тип custom-правила. */
export type TCustomRuleType = (typeof CUSTOM_RULE_TYPE)[keyof typeof CUSTOM_RULE_TYPE]

/** Доступные scope для custom-правил. */
export const CUSTOM_RULE_SCOPE = {
    file: "FILE",
    ccr: "CCR",
} as const

/** Scope custom-правила. */
export type TCustomRuleScope = (typeof CUSTOM_RULE_SCOPE)[keyof typeof CUSTOM_RULE_SCOPE]

/** Доступные статусы custom-правил. */
export const CUSTOM_RULE_STATUS = {
    active: "ACTIVE",
    pending: "PENDING",
    rejected: "REJECTED",
    deleted: "DELETED",
} as const

/** Статус custom-правила. */
export type TCustomRuleStatus = (typeof CUSTOM_RULE_STATUS)[keyof typeof CUSTOM_RULE_STATUS]

/** Доступные severity для custom-правил. */
export const CUSTOM_RULE_SEVERITY = {
    info: "INFO",
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
} as const

/** Уровень severity. */
export type TCustomRuleSeverity = (typeof CUSTOM_RULE_SEVERITY)[keyof typeof CUSTOM_RULE_SEVERITY]

/** Пример для проверки custom-правила. */
export interface ICustomRuleExample {
    /** Пример кода. */
    readonly snippet: string
    /** Корректно ли правило срабатывает на примере. */
    readonly isCorrect: boolean
}

/** Пайплайн-сущность custom-правила. */
export interface ICustomRule {
    /** Идентификатор. */
    readonly id: string
    /** Заголовок правила. */
    readonly title: string
    /** Тело/regex/prompt правила. */
    readonly rule: string
    /** Тип исполнения. */
    readonly type: TCustomRuleType
    /** Область применения. */
    readonly scope: TCustomRuleScope
    /** Уровень severity. */
    readonly severity: TCustomRuleSeverity
    /** Статус custom-правила. */
    readonly status: TCustomRuleStatus
    /** Примеры для подтверждения поведения. */
    readonly examples: readonly ICustomRuleExample[]
}

/** Ответ списка правил для клиента. */
export interface ICustomRulesListResponse {
    /** Отфильтрованный список. */
    readonly rules: readonly ICustomRule[]
    /** Полное число для пагинации. */
    readonly total: number
}

/** Параметры запроса списка правил. */
export interface IListCustomRulesQuery {
    /** Фильтр по scope. */
    readonly scope?: TCustomRuleScope
    /** Фильтр по статусу. */
    readonly status?: TCustomRuleStatus
}

/** Запрос на создание custom-правила. */
export interface ICreateCustomRuleRequest {
    /** Заголовок. */
    readonly title: string
    /** Тело/regex/prompt правила. */
    readonly rule: string
    /** Тип исполнения. */
    readonly type: TCustomRuleType
    /** Область применения. */
    readonly scope: TCustomRuleScope
    /** Severity. */
    readonly severity: TCustomRuleSeverity
    /** Статус. */
    readonly status: TCustomRuleStatus
    /** Примеры. */
    readonly examples: readonly ICustomRuleExample[]
}

/** Запрос на обновление custom-правила. */
export interface IUpdateCustomRuleRequest {
    /** Идентификатор правила. */
    readonly id: string
    /** Заголовок. */
    readonly title?: string
    /** Тело/regex/prompt правила. */
    readonly rule?: string
    /** Тип исполнения. */
    readonly type?: TCustomRuleType
    /** Область применения. */
    readonly scope?: TCustomRuleScope
    /** Severity. */
    readonly severity?: TCustomRuleSeverity
    /** Статус. */
    readonly status?: TCustomRuleStatus
    /** Примеры. */
    readonly examples?: readonly ICustomRuleExample[]
}

/** Запрос на удаление custom-правила. */
export interface IDeleteCustomRuleRequest {
    /** Идентификатор правила. */
    readonly id: string
}

/** Результат удаления. */
export interface IDeleteCustomRuleResponse {
    /** Идентификатор удалённого правила. */
    readonly id: string
    /** Флаг подтверждения удаления. */
    readonly removed: boolean
}

/** Контракт custom rules API. */
export interface ICustomRulesApi {
    /** Возвращает список custom-правил. */
    listCustomRules(query?: IListCustomRulesQuery): Promise<ICustomRulesListResponse>

    /** Возвращает одно custom-правило по id. */
    getCustomRule(ruleId: string): Promise<ICustomRule>

    /** Создаёт новое custom-правило. */
    createCustomRule(request: ICreateCustomRuleRequest): Promise<ICustomRule>

    /** Обновляет custom-правило по id. */
    updateCustomRule(request: IUpdateCustomRuleRequest): Promise<ICustomRule>

    /** Удаляет custom-правило по id. */
    deleteCustomRule(request: IDeleteCustomRuleRequest): Promise<IDeleteCustomRuleResponse>
}

/** Endpoint-слой для custom rules API. */
export class CustomRulesApi implements ICustomRulesApi {
    private readonly httpClient: IHttpClient

    public constructor(httpClient: IHttpClient) {
        this.httpClient = httpClient
    }

    public async listCustomRules(
        query: IListCustomRulesQuery = {},
    ): Promise<ICustomRulesListResponse> {
        const requestQuery = query as Readonly<Record<string, string | undefined>>

        return this.httpClient.request<ICustomRulesListResponse>({
            method: "GET",
            path: "/api/v1/rules",
            query: requestQuery,
            credentials: "include",
        })
    }

    public async getCustomRule(ruleId: string): Promise<ICustomRule> {
        const normalizedRuleId = ruleId.trim()
        if (normalizedRuleId.length === 0) {
            throw new Error("ruleId не должен быть пустым")
        }

        return this.httpClient.request<ICustomRule>({
            method: "GET",
            path: `/api/v1/rules/${encodeURIComponent(normalizedRuleId)}`,
            credentials: "include",
        })
    }

    public async createCustomRule(request: ICreateCustomRuleRequest): Promise<ICustomRule> {
        return this.httpClient.request<ICustomRule>({
            method: "POST",
            path: "/api/v1/rules",
            body: request,
            credentials: "include",
        })
    }

    public async updateCustomRule(request: IUpdateCustomRuleRequest): Promise<ICustomRule> {
        const normalizedRuleId = request.id.trim()
        if (normalizedRuleId.length === 0) {
            throw new Error("ruleId не должен быть пустым")
        }

        const { id: _ruleId, ...payload } = request

        return this.httpClient.request<ICustomRule>({
            method: "PUT",
            path: `/api/v1/rules/${encodeURIComponent(normalizedRuleId)}`,
            body: payload,
            credentials: "include",
        })
    }

    public async deleteCustomRule(
        request: IDeleteCustomRuleRequest,
    ): Promise<IDeleteCustomRuleResponse> {
        const normalizedRuleId = request.id.trim()
        if (normalizedRuleId.length === 0) {
            throw new Error("ruleId не должен быть пустым")
        }

        return this.httpClient.request<IDeleteCustomRuleResponse>({
            method: "DELETE",
            path: `/api/v1/rules/${encodeURIComponent(normalizedRuleId)}`,
            credentials: "include",
        })
    }
}
