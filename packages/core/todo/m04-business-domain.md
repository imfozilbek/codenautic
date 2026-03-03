# M04 — Business Domain

> Источник: `packages/core/TODO.md`

> **Задач:** 63 | **Проверка:** Org, Project, Rules, Feedback, Prompts, Analytics, Graph, Notifications, CCR Summary

> **Результат milestone:** Готовы бизнес-домены правил, фидбека, аналитики и конфигурации под реальные команды и репозитории.

## v0.17.0 — Organization Domain

> Пользователи, организации, команды, доступ.

> **Результат версии:** Завершена версия «v0.17.0 — Organization Domain» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-085 | Реализовать user entity | DONE | Реализовано | Реализация: Entity. email: string, displayName: string, roles: MemberRole[], preferences: UserPreferences, authProviders: string[]. updatePreferences(prefs). hasRole(role). Готово, если: для CORE-085 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-086 | Реализовать organization aggregate | TODO | Не начато | Реализация: AggregateRoot. name, ownerId: UniqueId, settings: OrgSettings, apiKeys: APIKeyConfig[], byokEnabled: boolean. addMember(userId, role). removeMember(userId). updateSettings(). Готово, если: для CORE-086 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-087 | Реализовать team entity | TODO | Не начато | Реализация: Entity. name, organizationId: UniqueId, memberIds: UniqueId[], repoIds: RepositoryId[], ruleIds: UniqueId[]. addMember(), removeMember(), assignRepo(). Готово, если: для CORE-087 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-088 | Реализовать organization ports | TODO | Не начато | Реализация: IOrganizationRepository: extends IRepository<Organization> + findByOwnerId(). ITeamRepository: extends IRepository<Team> + findByOrganizationId(). IUserRepository: findByEmail(). Готово, если: для CORE-088 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.18.0 — Project & Конфигурация

> Проект (репозиторий) и система конфигурации.

> **Результат версии:** Завершена версия «v0.18.0 — Project & Config» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-089 | Реализовать project entity | TODO | Не начато | Реализация: Entity. repositoryId: RepositoryId, organizationId: OrganizationId, settings: ProjectSettings, integrations: string[]. updateSettings(). addIntegration(). Готово, если: для CORE-089 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-090 | Реализовать репозиторийКонфигурация type | TODO | Не начато | Реализация: Full schema interface: severity, ignorePaths, cadence ("automatic"/"manual"/"auto-pause"), limits, customRuleIds, promptOverrides. Все поля optional с defaults. Готово, если: для CORE-090 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-091 | Реализовать конфигурацияMergerUseCase | TODO | Не начато | Реализация: IUseCase<{default, org?, repo?}, ValidatedConfig>. Deep merge: repo > org > default. Arrays: replace (не concat). Nested objects: recursive merge. Готово, если: для CORE-091 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-092 | Реализовать конфигурацияValidatorUseCase | TODO | Не начато | Реализация: IUseCase<unknown, ValidatedConfig, ValidationError>. Zod-like validation (pure, без зависимости на Zod). Детальные ошибки по полям. Готово, если: для CORE-092 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-093 | Реализовать iProjectRepository | TODO | Не начато | Реализация: Extends IRepository<Project>. findByRepositoryId(repoId: RepositoryId). findByOrganizationId(orgId). Готово, если: для CORE-093 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-093a | Реализовать iProjectFilters + findAll/count | TODO | Не начато | Реализация: IProjectFilters {organizationId?, repositoryId?}. findAll(filters?), count(filters?) в IProjectRepository. Готово, если: для CORE-093a полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-093b | Реализовать project CRUD Use Cases | TODO | Не начато | Реализация: CreateProjectUseCase, GetProjectByIdUseCase, ListProjectsUseCase, UpdateProjectUseCase, DeleteProjectUseCase, GetProjectGraphUseCase. DTOs, токены, тесты (23). Готово, если: для CORE-093b полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-094 | Реализовать iRepositoryConfigLoader | TODO | Не начато | Реализация: Interface: loadConfig(repoId: RepositoryId): Promise<Partial<РепозиторийКонфигурация> / null>. Загрузка из файла репозитория. Готово, если: для CORE-094 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.19.0 — Custom Rules

> Пользовательские правила для code review.

> **Результат версии:** Завершена версия «v0.19.0 — Custom Rules» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-095 | Реализовать customRule entity | TODO | Не начато | Реализация: Entity. title, rule: string, type: "REGEX"/"PROMPT"/"AST", status: "ACTIVE"/"PENDING"/"REJECTED"/"DELETED", scope: "FILE"/"CCR", severity: Severity, examples: {snippet, isCorrect}[]. activate(), reject(), softDelete(). Готово, если: для CORE-095 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-096 | Реализовать applyRuleUseCase | TODO | Не начато | Реализация: IUseCase. Применяет rules к файлам/CCR. REGEX -> pattern match по коду. PROMPT -> query через ILLMProvider. config.applyFiltersToCustomRules flag: true -> SafeGuard, false -> bypass. Готово, если: для CORE-096 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-097 | Реализовать ruleValidationService | TODO | Не начато | Реализация: Domain service. Validates: REGEX -> valid regex syntax. PROMPT -> non-empty, max length. AST -> valid query syntax. Возвращает Result<void, ValidationError>. Готово, если: для CORE-097 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-098 | Реализовать iCustomRuleRepository | TODO | Не начато | Реализация: Extends IRepository<CustomRule>. findByOrganizationId(orgId), findByStatus(status), findByScope(scope), findActiveByOrganization(orgId). Готово, если: для CORE-098 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.20.0 — Feedback System

> Обратная связь от пользователей.

> **Результат версии:** Завершена версия «v0.20.0 — Feedback System» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-099 | Реализовать issueFeedback value object | TODO | Не начато | Реализация: IssueId: UniqueId, reviewId: UniqueId, type: "FALSE_POSITIVE"/"ALREADY_KNOWN"/"HELPFUL"/"IMPLEMENTED"/"DISMISSED", userId: UniqueId, comment?: string, createdAt: Date. Готово, если: для CORE-099 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-100 | Реализовать collectFeedbackUseCase | TODO | Не начато | Реализация: IUseCase<{reviewId, feedbacks: IssueFeedback[]}, void>. Дедупликация по issueId + userId. Bulk save через IFeedbackRepository. Emits FeedbackReceived events. Готово, если: для CORE-100 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-101 | Реализовать iFeedbackRepository | TODO | Не начато | Реализация: Save(feedback), saveMany(feedbacks[]), findByReviewId(reviewId), findByIssueId(issueId), aggregateByType(reviewId): Record<FeedbackType, number>. Готово, если: для CORE-101 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.21.0 — Prompt System

> Database-driven промпты и шаблоны.

> **Результат версии:** Завершена версия «v0.21.0 — Prompt System» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-102 | Реализовать promptTemplate entity | TODO | Не начато | Реализация: Entity. name, category: "review"/"rules"/"analysis"/"output", type: "system"/"user", content: string, variables: TemplateVariable[], version: number, isGlobal: boolean, organizationId?. Готово, если: для CORE-102 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-103 | Реализовать promptConfiguration entity | TODO | Не начато | Реализация: Entity. templateId: UniqueId, name, defaults: Record<string, unknown>, overrides: Record<string, unknown>, isGlobal: boolean, organizationId?. Готово, если: для CORE-103 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-104 | Реализовать promptEngineService | TODO | Не начато | Реализация: Domain service. render(template: string, variables: Record<string, unknown>): string. {{variable}} interpolation. validate(template): Result<void, ValidationError>. extractVariables(template): string[]. Готово, если: для CORE-104 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-105 | Реализовать generatePromptUseCase | TODO | Не начато | Реализация: IUseCase. Fetch template by name (org fallback to global) -> merge config (defaults + overrides + runtime) -> render. Возвращает rendered prompt string. Готово, если: для CORE-105 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-106 | Реализовать iPromptTemplateRepository | TODO | Не начато | Реализация: FindByName(name, orgId?): org-specific с global fallback. findByCategory(category). findGlobal(). save(). Готово, если: для CORE-106 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-107 | Реализовать iPromptConfigurationRepository | TODO | Не начато | Реализация: FindByTemplateId(templateId). findByName(name). save(). delete(). Готово, если: для CORE-107 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.22.0 — Rules Library

> Управление библиотекой pre-built правил.

> **Результат версии:** Завершена версия «v0.22.0 — Rules Library» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-108 | Реализовать rule entity (library) | TODO | Не начато | Реализация: Entity. uuid: string, title, rule, whyIsThisImportant, severity: Severity, examples: {snippet, isCorrect}[], language: string, buckets: string[], scope, plugAndPlay: boolean, isGlobal, organizationId?. Готово, если: для CORE-108 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-109 | Реализовать ruleCategory entity | TODO | Не начато | Реализация: Entity. slug: string, name: string, description: string, isActive: boolean. Валидация: slug kebab-case. Готово, если: для CORE-109 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-110 | Реализовать getEnabledRulesUseCase | TODO | Не начато | Реализация: IUseCase<{organizationId}, Rule[]>. Hybrid: global rules + org-specific overrides. Active только. Сортировка по severity. Готово, если: для CORE-110 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-111 | Реализовать listRulesUseCase | TODO | Не начато | Реализация: IUseCase<{language?, category?, severity?, scope?, page, limit}, {rules: Rule[], total: number}>. Pagination. Фильтры комбинируются. Готово, если: для CORE-111 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-112 | Реализовать iRuleRepository | TODO | Не начато | Реализация: FindByUuid(uuid). findByLanguage(lang). findByCategory(slug). findGlobal(). findByOrganization(orgId). count(filters). save(). saveMany(). delete(). Готово, если: для CORE-112 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-113 | Реализовать iRuleCategoryRepository | TODO | Не начато | Реализация: FindBySlug(slug). findAll(). findActive(). save(). saveMany(). Готово, если: для CORE-113 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.23.0 — Messaging Patterns

> Transactional outbox/inbox для надежной доставки событий.

> **Результат версии:** Завершена версия «v0.23.0 — Messaging Patterns» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-114 | Реализовать outboxMessage entity | TODO | Не начато | Реализация: Entity. eventType: string, payload: string (JSON), status: "PENDING"/"SENT"/"FAILED", retryCount: number, maxRetries: number. markSent(). markFailed(). Готово, если: для CORE-114 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-115 | Реализовать inboxMessage entity | TODO | Не начато | Реализация: Entity. messageId: string (external), eventType: string, processedAt?: Date. markProcessed(). isProcessed(): boolean. Deduplication by messageId. Готово, если: для CORE-115 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-116 | Реализовать outboxRelayService | TODO | Не начато | Реализация: Domain service. relay(): getPending() -> publish каждый через IMessageBroker -> markSent(). Retry при ошибке до maxRetries. Batch processing. Готово, если: для CORE-116 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-117 | Реализовать inboxDeduplicationService | TODO | Не начато | Реализация: Domain service. isDuplicate(messageId): boolean. process(messageId): markProcessed(). Idempotency guarantee. Готово, если: для CORE-117 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-118 | Реализовать iMessageBroker | TODO | Не начато | Реализация: Publish(eventType, payload): Promise<void>. subscribe(eventType, handler: (payload) => Promise<void>). Абстракция Redis Streams/Kafka/RabbitMQ. Готово, если: для CORE-118 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-119 | Реализовать iOutboxRepository / IInboxRepository | TODO | Не начато | Реализация: Outbox: save(), findPending(limit), markSent(id), markFailed(id). Inbox: save(), findByMessageId(externalId), markProcessed(id). Готово, если: для CORE-119 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.24.0 — Analytics Domain

> Метрики, аналитика, token tracking.

> **Результат версии:** Завершена версия «v0.24.0 — Analytics Domain» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-120 | Реализовать dORAMetrics type | TODO | Не начато | Реализация: Interface: deployFrequency (deploys/day), leadTime (hours), changeFailRate (%), meanTimeToRestore (hours). timeRange: {from, to}. Готово, если: для CORE-120 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-121 | Реализовать CCRMetrics type | TODO | Не начато | Реализация: Interface: cycleTime (hours), reviewTime (hours), size (lines changed), commentsCount, iterationsCount, firstResponseTime (hours). Готово, если: для CORE-121 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-122 | Реализовать tokenUsageRecord type | TODO | Не начато | Реализация: Interface: model, provider, input, output, outputReasoning, total, organizationId, teamId, developerId?, ccrNumber?, byok: boolean, recordedAt: Date. Готово, если: для CORE-122 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-123 | Реализовать costEstimate type | TODO | Не начато | Реализация: Interface: totalCost: number, currency: string, byModel: {model, tokens, cost}[]. calculate(usageRecords, pricing): CostEstimate static. Готово, если: для CORE-123 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-124 | Реализовать analyticsAggregationUseCase | TODO | Не начато | Реализация: IUseCase<{timeRange, groupBy: "org"/"team"/"developer"/"model"}, AggregatedMetrics>. AggregatedMetrics: dora, ccr, tokenUsage, cost. Готово, если: для CORE-124 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-125 | Реализовать iAnalyticsService | TODO | Не начато | Реализация: Track(record: TokenUsageRecord): Promise<void>. aggregate(query): Promise<AggregatedMetrics>. getDORA(orgId, timeRange). getCCRMetrics(repoId, timeRange). Готово, если: для CORE-125 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.25.0 — Graph Domain

> Code graph: узлы, ребра, impact analysis.

> **Результат версии:** Завершена версия «v0.25.0 — Graph Domain» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-126 | Реализовать codeGraph types | TODO | Не начато | Реализация: CodeNode: id, type ("file"/"function"/"class"/"type"/"variable"), name, filePath, metadata?. CodeEdge: source, target, type ("CALLS"/"IMPORTS"/"EXTENDS"/"реализует"). CodeGraph: nodes[], edges[]. Готово, если: для CORE-126 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-127 | Реализовать impactAnalysisResult type | TODO | Не начато | Реализация: Interface: changedNodes: CodeNode[], affectedNodes: CodeNode[], impactRadius: number (depth), breakingChanges: {node, reason}[]. Готово, если: для CORE-127 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-128 | Реализовать graphUpdated event | TODO | Не начато | Реализация: Extends BaseDomainEvent. eventName = "GraphUpdated". Payload: repositoryId: RepositoryId, changedNodeIds: string[]. Готово, если: для CORE-128 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-129 | Реализовать iGraphRepository | TODO | Не начато | Реализация: SaveGraph(repoId, graph: CodeGraph). loadGraph(repoId): Promise<CodeGraph / null>. queryNodes(filter: {type?, filePath?}): Promise<CodeNode[]>. Готово, если: для CORE-129 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-130 | Реализовать iDependencyGraphService | TODO | Не начато | Реализация: BuildGraph(files: DiffFile[]): Promise<CodeGraph>. getImpact(changedFiles: FilePath[]): Promise<ImpactAnalysisResult>. detectCircular(): Promise<{nodeA, nodeB, path}[]>. Готово, если: для CORE-130 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.26.0 — Mention Commands & External Context

> @codenautic команды + интеграция с внешними системами.

> **Результат версии:** Завершена версия «v0.26.0 — Mention Commands & External Context» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-131 | Реализовать mentionCommand types | TODO | Не начато | Реализация: MentionCommand: commandType, args: string[], sourceComment, userId, mergeRequestId. CommandType: "review"/"explain"/"fix"/"summary"/"help"/"config". CommandResult: success, response. Готово, если: для CORE-131 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-132 | Реализовать executeMentionCommandUseCase | TODO | Не начато | Реализация: IUseCase<MentionCommand, CommandResult>. Парсит comment text -> MentionCommand. Dispatch к ICommandHandler<CommandType>. Unknown command -> help response. Готово, если: для CORE-132 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-133 | Реализовать iCommandHandler interface | TODO | Не начато | Реализация: Interface: commandType: CommandType, handle(command: MentionCommand, context): Promise<CommandResult>. Per-command handler. Готово, если: для CORE-133 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-134 | Реализовать externalContext types | TODO | Не начато | Реализация: ExternalContext: source ("JIRA"/"LINEAR"/"SENTRY"/"DATADOG"/"POSTHOG"), data: unknown, fetchedAt: Date. JiraTicket: key, summary, status. LinearIssue: id, title, state. SentryError: id, title, stackTrace[]. Готово, если: для CORE-134 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-135 | Реализовать iExternalContextProvider | TODO | Не начато | Реализация: Interface: source: string, loadContext(identifier: string): Promise<ExternalContext / null>. Per-platform: IJiraProvider.getTicket(), ILinearProvider.getIssue(), ISentryProvider.getError(). Готово, если: для CORE-135 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-136 | Реализовать augmentContextUseCase | TODO | Не начато | Реализация: IUseCase. Обнаружение связанных файлов через IVectorRepository.search(). Cross-file relationship analysis. Enriches `ReviewPipelineState.externalContext`. Для pipeline-интеграции сохраняет совместимость с versioned `PipelineDefinition` (`runId`, `definitionVersion`, `stageId`). Готово, если: `augmentContextUseCase` детерминированно обогащает state и корректно работает при разных версиях pipeline-определения, покрыт тестами на missing-context/fallback/negative кейсы; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.27.0 — Notification System

> Уведомления через Slack, Teams, Email, Webhook.

> **Результат версии:** Завершена версия «v0.27.0 — Notification System» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-137 | Реализовать notificationChannel type | TODO | Не начато | Реализация: Union type: "SLACK" / "TEAMS" / "EMAIL" / "WEBHOOK". NotificationEvent: "REVIEW_COMPLETED" / "ISSUE_CRITICAL" / "MENTION" / etc. Готово, если: для CORE-137 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-138 | Реализовать notificationPayload type | TODO | Не начато | Реализация: Interface: channel, event, recipients: string[], title, body, metadata?: Record<string, unknown>, urgency: "low"/"normal"/"high". Готово, если: для CORE-138 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-139 | Реализовать notificationPreferences | TODO | Не начато | Реализация: Interface: userId: UniqueId, channels: {channel, enabled: boolean, events: NotificationEvent[]}[]. Per-user per-channel configuration. Готово, если: для CORE-139 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-140 | Реализовать iNotificationService | TODO | Не начато | Реализация: Send(payload: NotificationPayload): Promise<void>. sendBatch(payloads[]). Dispatch к правильному INotificationProvider по channel. Готово, если: для CORE-140 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-141 | Реализовать iNotificationProvider | TODO | Не начато | Реализация: Interface: channel: NotificationChannel, send(payload): Promise<void>. Одна реализация на канал (SlackProvider, TeamsProvider, etc.). Готово, если: для CORE-141 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.28.0 — CCR Summary & Review Modes

> Генерация CCR summary и режимы review.

> **Результат версии:** Завершена версия «v0.28.0 — CCR Summary & Review Modes» в рамках M04; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-142 | Реализовать generateCCRSummaryUseCase | TODO | Не начато | Реализация: IUseCase. Генерирует summary через ILLMProvider. Existing description modes: "REPLACE"/"CONCATENATE"/"COMPLEMENT". New commits modes: "NONE"/"REPLACE"/"CONCATENATE". Готово, если: для CORE-142 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-143 | Реализовать manageReviewCadenceUseCase | TODO | Не начато | Реализация: IUseCase<{repoId, event}, {shouldReview: boolean, reason}>. Cadence: AUTOMATIC (всегда), MANUAL (только @codenautic), AUTO_PAUSE (пауза после N suggestions, resume по команде). Готово, если: для CORE-143 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-144 | Реализовать dryRunReviewUseCase | TODO | Не начато | Реализация: IUseCase. Полный pipeline без posting комментариев. IGitProvider вызовы только для чтения. Возвращает ReviewResult + execution trace (`definitionVersion`, stage statuses, stop point). Готово, если: dry-run воспроизводит тот же порядок stage, что и активный `PipelineDefinition`, но без write-side эффектов, а отчёт позволяет точно определить stage остановки и причину; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-145 | Реализовать throttleReviewUseCase | TODO | Не начато | Реализация: IUseCase<{repoId}, {allowed: boolean, retryAfter?: number}>. Rate limit reviews per repo. Window + maxReviews из config. Использует ICache. Готово, если: для CORE-145 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
