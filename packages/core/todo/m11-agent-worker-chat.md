# M11 — Agent Worker & Chat

> Источник: `packages/core/TODO.md`

> **Задач (core):** 22 | **Проверка:** Rule inheritance, review depth modes, conversation agent domain

> **Результат milestone:** Готов доменный фундамент агентных и conversational сценариев в контексте code review.

## v0.45.0 — Rule Inheritance (team-level)

> Каскадное наследование правил: global → org → team. Фундамент: Team entity уже имеет `ruleIds: UniqueId[]`.

> **Результат версии:** Завершена версия «v0.45.0 — Rule Inheritance (team-level)» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-231 | Расширить IGetEnabledRulesInput на teamId | TODO | Не начато | Реализация: Добавить optional `teamId?: string` в `application/dto/rules/get-enabled-rules.dto.ts`. Обратная совместимость: без teamId — текущее поведение (global + org). Готово, если: для CORE-231 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-232 | Реализовать iTeamRuleProvider порт + Team entity | TODO | Не начато | Реализация: `application/ports/outbound/rules/team-rule-provider.ts`: `ITeamRuleConfiguration { ruleIds, disabledRuleUuids }`, `ITeamRuleProvider.getTeamRuleConfiguration(teamId)`. Токен `TOKENS.Rules.TeamRuleProvider`. Team entity: `disabledRuleUuids: string[]`, методы `disableRule(uuid)`, `enableRule(uuid)`. Barrel export. Готово, если: для CORE-232 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-233 | Расширить GetEnabledRulesUseCase | TODO | Не начато | Реализация: 3-level merge: global → org override → team override (по uuid). Team rules добавляются поверх org rules. Team может отключать org/global rules через `disabledRuleUuids`. Optional `teamRuleProvider` для обратной совместимости. Готово, если: для CORE-233 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-234 | Реализовать wire team rules в pipeline | TODO | Не начато | Реализация: `resolveRuleContext()` передаёт `context.teamId` в `GetEnabledRulesUseCase.execute()`. ReviewPipelineState уже имел `teamId`. Готово, если: для CORE-234 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.45.1 — Review Depth Modes

> Per-file оптимизация контекста для LLM. Light = только diff, Heavy = diff + полный файл. Эвристика или конфигурация.

> **Результат версии:** Завершена версия «v0.45.1 — Review Depth Modes» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-235 | Реализовать reviewDepthMode value object | TODO | Не начато | Реализация: union type со значениями `light` и `heavy`. Статический `fromFileChange(file: DiffFile): ReviewDepthMode` — эвристика: heavy если изменены imports, public API, >50% файла изменено; light иначе. Готово, если: для CORE-235 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-236 | Реализовать iReviewConfig: reviewDepthStrategy | TODO | Не начато | Реализация: добавить в `IReviewConfig` поле `reviewDepthStrategy` со значениями `auto`, `always-light`, `always-heavy`. Default: `auto`. Обратная совместимость: без поля — `auto`. Готово, если: для CORE-236 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-237 | Реализовать интеграция в ProcessFilesReviewStage | TODO | Не начато | Реализация: При `auto`: определять mode per file через `ReviewDepthMode.fromFileChange()`. Light: отправлять в LLM только diff (без полного файла). Heavy: diff + полный файл. При `always-light`/`always-heavy`: принудительный режим. Логировать mode per file. Готово, если: для CORE-237 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.45.2 — Directory-level Конфигурация

> Per-directory настройки review. Файлы в разных директориях могут иметь разные severity threshold, ignore patterns,

> **Результат версии:** Завершена версия «v0.45.2 — Directory-level Config» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> правила.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-238 | Реализовать iDirectoryConfig тип | TODO | Не начато | Реализация: `application/dto/config/directory-config.dto.ts`. Interface: `{path: string, config: Partial<IReviewConfig>}`. Path — glob pattern (`src/backend/**`). Extends IDTO. Тесты типов. Готово, если: для CORE-238 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-239 | Расширить IReviewConfig на directories | TODO | Не начато | Реализация: Добавить `directories?: readonly IDirectoryConfig[]` в IReviewConfig. Обратная совместимость: без directories — текущее поведение. КонфигурацияValidatorUseCase: валидация directories (path не пустой, config partial). Готово, если: для CORE-239 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-240 | Реализовать directoryConfigResolver domain service | TODO | Не начато | Реализация: `resolve(filePath: string): IDirectoryConfig или null`. Longest-match wins (более специфичный path побеждает). Готово, если: для CORE-240 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-241 | Реализовать интеграция в FileContextGateStage | TODO | Не начато | Реализация: Per-file config resolution: base config + directory override (deep merge). Файлы группируются в батчи по effective config (одинаковый effective config = один батч). Готово, если: для CORE-241 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.46.0 — Issue Tracking from Suggestions

> Внутренние issues из suggestions для отслеживания повторяющихся проблем.

> **Результат версии:** Завершена версия «v0.46.0 — Issue Tracking from Suggestions» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-242 | Реализовать reviewIssueTicket entity | TODO | Не начато | Реализация: Entity со статусами `IN_PROGRESS`, `RESOLVED`, `DISMISSED`; поля `sourceReviewId`, `sourceSuggestionIds`, `filePath`, `occurrenceCount`. Методы: `resolve()`, `dismiss()`, `addOccurrence(suggestionId)`. Готово, если: для CORE-242 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-243 | Реализовать reviewIssueTicketFactory | TODO | Не начато | Реализация: `domain/factories/review/review-issue-ticket.factory.ts`. IEntityFactory<ReviewIssueTicket>. create() — новый тикет. reconstitute() — из persistence. Готово, если: для CORE-243 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-244 | Реализовать iReviewIssueTicketRepository порт | TODO | Не начато | Реализация: `application/ports/outbound/review/review-issue-ticket-repository.ts`. extends IRepository<ReviewIssueTicket>. findByFilePath(path), findOpenByRepository(repoId), findBySuggestionId(id). Токен `TOKENS.Review.IssueTicketRepository`. Barrel export. Готово, если: для CORE-244 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-245 | Реализовать createIssueFromSuggestionUseCase | TODO | Не начато | Реализация: `application/use-cases/review/create-issue-from-suggestion.use-case.ts`. IUseCase. Matching: если существующий open issue с тем же filePath + category → addOccurrence() + save. Иначе create new через factory. Конфигурация: `autoCreateIssues?: boolean` в IReviewConfig (default false). Готово, если: для CORE-245 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-246 | Реализовать createIssueTicketsStage | TODO | Не начато | Реализация: `application/stages/processing/create-issue-tickets.stage.ts`. Новый stage после AggregateResultsStage (между stage 15 и 16). Для каждого suggestion с severity >= config.severityThreshold → CreateIssueFromSuggestionUseCase. Optional: skip если autoCreateIssues = false. Готово, если: для CORE-246 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.47.0 — Conversation Agent

> Интерактивный чат по CCR/кодовой базе через @codenautic chat или API endpoint.

> **Результат версии:** Завершена версия «v0.47.0 — Conversation Agent» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-247 | Реализовать conversationThread entity | TODO | Не начато | Реализация: Entity со статусами `ACTIVE` и `CLOSED`. Методы: `addMessage(msg)`, `close()`. Max 50 messages per thread. Готово, если: для CORE-247 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-248 | Реализовать conversationMessage value object | TODO | Не начато | Реализация: поля `role`, `content`, `timestamp`, `metadata`; `role` принимает `user` или `assistant`. Immutable. Валидация: `content` не пустой. Готово, если: для CORE-248 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-249 | Реализовать conversationThreadFactory | TODO | Не начато | Реализация: IEntityFactory<ConversationThread>. create(channelId, participantIds) + reconstitute(props, id, state). Готово, если: для CORE-249 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-250 | Реализовать iConversationThreadRepository порт | TODO | Не начато | Реализация: Extends IRepository<ConversationThread>. findByChannelId(channelId), findActiveByParticipant(userId). Токен `TOKENS.Messaging.ConversationThreadRepository`. Barrel export. Готово, если: для CORE-250 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-251 | Реализовать chatUseCase | TODO | Не начато | Реализация: `application/use-cases/messaging/chat.use-case.ts`. IUseCase<IChatInput, IChatOutput>. Input: channelId, message, userId. Загружает thread (или создаёт новый). Собирает context: thread history + optional file context. Вызывает ILLMProvider.chat(). Сохраняет ответ. Готово, если: для CORE-251 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-252 | Реализовать wire "chat" в ICommandHandler | TODO | Не начато | Реализация: Новый command type `"chat"` в CommandType union. ChatCommandHandler: реализует ICommandHandler. Парсит `@codenautic chat <message>`, вызывает ChatUseCase с channelId = mergeRequestId. Готово, если: для CORE-252 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
