# M11 — Agent Worker & Chat

> Источник: `packages/core/TODO.md`

> **Задач (core):** 22 | **Проверка:** Rule inheritance, review depth modes, conversation agent domain

> **Результат milestone:** Готов доменный фундамент агентных и conversational сценариев в контексте code review.

## Pipeline-интеграционный контракт (2026-03-02)

> Для задач этого milestone, которые внедряются в review pipeline, действует контракт M02/M03:

1. Stage интегрируется как отдельный Use Case и регистрируется по `stageId`.
2. Порядок stage задаётся через `PipelineDefinition` + `definitionVersion`.
3. Любая вставка/перестановка stage делается новой версией определения, без миграции in-flight run.

## v0.45.0 — Rule Inheritance (team-level)

> Каскадное наследование правил: global → org → team. Фундамент: Team entity уже имеет `ruleIds: UniqueId[]`.

> **Результат версии:** Завершена версия «v0.45.0 — Rule Inheritance (team-level)» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-231 | Расширить IGetEnabledRulesInput на teamId | DONE | Реализовано | Реализация: Добавить optional `teamId?: string` в `application/dto/rules/get-enabled-rules.dto.ts`. Обратная совместимость: без teamId — текущее поведение (global + org). Готово, если: для CORE-231 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-232 | Реализовать iTeamRuleProvider порт + Team entity | DONE | Реализовано | Реализация: `application/ports/outbound/rules/team-rule-provider.ts`: `ITeamRuleConfiguration { ruleIds, disabledRuleUuids }`, `ITeamRuleProvider.getTeamRuleConfiguration(teamId)`. Токен `TOKENS.Rules.TeamRuleProvider`. Team entity: `disabledRuleUuids: string[]`, методы `disableRule(uuid)`, `enableRule(uuid)`. Barrel export. Готово, если: для CORE-232 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-233 | Расширить GetEnabledRulesUseCase | DONE | Реализовано | Реализация: 3-level merge: global → org override → team override (по uuid). Team rules добавляются поверх org rules. Team может отключать org/global rules через `disabledRuleUuids`. Optional `teamRuleProvider` для обратной совместимости. Готово, если: для CORE-233 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-234 | Реализовать wire team rules в pipeline | DONE | Реализовано | Реализация: `resolveRuleContext()` передаёт `context.teamId` в `GetEnabledRulesUseCase.execute()`. Интеграция выполняется в stage use case, подключённый в `PipelineDefinition` (без хардкода порядка). Готово, если: team-level rules стабильно применяются при разных `definitionVersion`, покрыты тесты на отсутствие `teamId` и на override team/org/global, регрессий в stage contracts нет; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.45.1 — Review Depth Modes

> Per-file оптимизация контекста для LLM. Light = только diff, Heavy = diff + полный файл. Эвристика или конфигурация.

> **Результат версии:** Завершена версия «v0.45.1 — Review Depth Modes» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-235 | Реализовать reviewDepthMode value object | DONE | Реализовано | Реализация: union type со значениями `light` и `heavy`. Статический `fromFileChange(file: DiffFile): ReviewDepthMode` — эвристика: heavy если изменены imports, public API, >50% файла изменено; light иначе. Готово, если: для CORE-235 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-236 | Реализовать iReviewConfig: reviewDepthStrategy | DONE | Реализовано | Реализация: добавить в `IReviewConfig` поле `reviewDepthStrategy` со значениями `auto`, `always-light`, `always-heavy`. Default: `auto`. Обратная совместимость: без поля — `auto`. Готово, если: для CORE-236 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-237 | Реализовать интеграция в ProcessFilesReviewStage | DONE | Реализовано | Реализация: При `auto`: определять mode per file через `ReviewDepthMode.fromFileChange()`. Light: отправлять в LLM только diff (без полного файла). Heavy: diff + полный файл. При `always-light`/`always-heavy`: принудительный режим. Логировать mode per file и `stageId/runId/definitionVersion`. Готово, если: режимы корректно работают в stage use case при разных pipeline definition, есть тесты на deterministic выбор mode и на fallback-поведение при неполном контексте; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.45.2 — Directory-level Конфигурация

> Per-directory настройки review. Файлы в разных директориях могут иметь разные severity threshold, ignore patterns,

> **Результат версии:** Завершена версия «v0.45.2 — Directory-level Config» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> правила.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-238 | Реализовать iDirectoryConfig тип | DONE | Реализовано | Реализация: `application/dto/config/directory-config.dto.ts`. Interface: `{path: string, config: Partial<IReviewConfig>}`. Path — glob pattern (`src/backend/**`). Extends IDTO. Тесты типов. Готово, если: для CORE-238 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-239 | Расширить IReviewConfig на directories | DONE | Реализовано | Реализация: Добавить `directories?: readonly IDirectoryConfig[]` в IReviewConfig. Обратная совместимость: без directories — текущее поведение. КонфигурацияValidatorUseCase: валидация directories (path не пустой, config partial). Готово, если: для CORE-239 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-240 | Реализовать directoryConfigResolver domain service | DONE | Реализовано | Реализация: `resolve(filePath: string): IDirectoryConfig или null`. Longest-match wins (более специфичный path побеждает). Готово, если: для CORE-240 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-241 | Реализовать интеграция в FileContextGateStage | DONE | Реализовано | Реализация: Per-file config resolution: base config + directory override (deep merge). Файлы группируются в батчи по effective config (одинаковый effective config = один батч). Stage интегрируется через definition-driven wiring. Готово, если: батчирование детерминировано и не зависит от физического порядка файлов, есть тесты на стабильность в разных `definitionVersion` и на edge-cases с перекрывающимися directory rules; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.46.0 — Issue Tracking from Suggestions

> Внутренние issues из suggestions для отслеживания повторяющихся проблем.

> **Результат версии:** Завершена версия «v0.46.0 — Issue Tracking from Suggestions» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-242 | Реализовать reviewIssueTicket entity | DONE | Реализовано | Реализация: `domain/entities/review-issue-ticket.entity.ts` — статусы `IN_PROGRESS`, `RESOLVED`, `DISMISSED`; поля `sourceReviewId`, `sourceSuggestionIds`, `filePath`, `occurrenceCount`. Методы `resolve()`, `dismiss()`, `addOccurrence(suggestionId)` с валидацией и инвариантами по count. Тесты: `review-issue-ticket.entity.test.ts`. Готово, если: для CORE-242 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-243 | Реализовать reviewIssueTicketFactory | DONE | Реализовано | Реализация: `domain/factories/review-issue-ticket.factory.ts`. `IEntityFactory<ReviewIssueTicket>`. `create()` — новый тикет. `reconstitute()` — из persistence. Категория повторяющейся проблемы закреплена в entity и проходит через фабрику. Готово, если: для CORE-243 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-244 | Реализовать iReviewIssueTicketRepository порт | DONE | Реализовано | Реализация: `application/ports/outbound/review/review-issue-ticket-repository.port.ts`. extends `IRepository<ReviewIssueTicket>`. `findByFilePath(path)`, `findOpenByRepository(repoId)`, `findBySuggestionId(id)`. Токен `TOKENS.Review.IssueTicketRepository`. Barrel export. Контракт допускает repository-scope через адаптерный lookup `sourceReviewId -> review -> repositoryId`. Готово, если: для CORE-244 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-245 | Реализовать createIssueFromSuggestionUseCase | DONE | Реализовано | Реализация: `application/use-cases/review/create-issue-from-suggestion.use-case.ts`. `IUseCase`. Matching: если существующий open issue с тем же `filePath + category` → `addOccurrence()` + `save`. Иначе create new через factory. Категория матчится по точной нормализованной строке без дополнительного heuristics-mapping. Конфигурация: `autoCreateIssues?: boolean` в `IReviewConfig` с default `false` на этапе валидации. Готово, если: для CORE-245 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-246 | Реализовать createIssueTicketsStage | TODO | Не начато | Реализация: `application/stages/processing/create-issue-tickets.stage.ts`. Stage use case добавляется в новую `PipelineDefinition` после `aggregateResultsStage` (без прямой привязки к числам stage 15/16). Для каждого suggestion с severity >= config.severityThreshold → `CreateIssueFromSuggestionUseCase`. Optional: skip если autoCreateIssues = false. Готово, если: вставка stage выполняется через новую `definitionVersion`, in-flight run не ломаются, а новые run корректно включают stage и checkpoint/metrics по нему; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.47.0 — Conversation Agent

> Интерактивный чат по CCR/кодовой базе через @codenautic chat или API endpoint.

> **Результат версии:** Завершена версия «v0.47.0 — Conversation Agent» в рамках M11; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-247 | Реализовать conversationThread entity | DONE | Реализовано | Entity со статусами `ACTIVE` и `CLOSED`, методами `addMessage(msg)`, `close()`, ограничением в 50 сообщений и проверками инвариантов; покрыт unit-тестами и `core`-pipeline. |
| CORE-248 | Реализовать conversationMessage value object | DONE | Реализовано | VO с полями `role`, `content`, `timestamp`, `metadata`; `role` принимает `user` или `assistant`; content валидируется на непустоту; метаданные защищены и покрыты unit-тестами. |
| CORE-249 | Реализовать conversationThreadFactory | DONE | Реализовано | Фабрика `IEntityFactory<ConversationThread>`: `create(channelId, participantIds)` для новых threads и `reconstitute` из снапшота сообщений/состояния; покрыт unit-тестами. |
| CORE-250 | Реализовать iConversationThreadRepository порт | DONE | Реализовано | Порт расширяет `IRepository<ConversationThread>`: `findByChannelId`, `findActiveByParticipant`; добавлен токен и barrel-экспорт; контрактный тест подтверждает поведение. |
| CORE-251 | Реализовать chatUseCase | DONE | Реализовано | Реализация: `application/use-cases/messaging/chat.use-case.ts`. IUseCase<IChatInput, IChatOutput>. Input: channelId, message, userId. Загружает thread (или создаёт новый). Собирает context: thread history + optional file context. Вызывает ILLMProvider.chat(). Сохраняет ответ. Готово, если: для CORE-251 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-252 | Реализовать wire "chat" в ICommandHandler | DONE | Реализовано | Реализация: Новый command type `"chat"` в CommandType union. `ChatCommandHandler` реализует `ICommandHandler`, парсит `@codenautic chat <message>`, вызывает `ChatUseCase` с `channelId = mergeRequestId` и покрыт тестами. |

---
