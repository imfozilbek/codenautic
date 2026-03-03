# M03 — 20-Stage Pipeline & SafeGuard

> Источник: `packages/core/TODO.md`

> **Задач:** 26 | **Проверка:** Полный pipeline + SafeGuard прогоняется с моками

> **Результат milestone:** Готов полный 20-stage pipeline и SafeGuard-фильтрация для качественного AI code review.

## Контракт порядка стадий (связан с M02)

> Для всех задач ниже применяется единая модель versioned pipeline definition.

1. Нумерация `Stage 1..20` в этом файле — canonical alias для `PipelineDefinition v1`.
2. Реальный порядок исполнения берётся из `PipelineDefinition`, а не из хардкода в runner.
3. Добавление/перестановка stage выполняется только через новую `definitionVersion`.
4. In-flight run остаётся на версии, с которой стартовал (pinning).
5. Каждый stage публикует lifecycle events и завершает шаг checkpoint-обновлением run state.

## v0.12.0 — Pipeline: Validation Stages (1-4)

> Проверка предпосылок и загрузка конфигурации.

> **Результат версии:** Завершена версия «v0.12.0 — Pipeline: Validation Stages (1-4)» в рамках M03; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-059 | Реализовать validatePrerequisitesStage | DONE | Реализовано | Реализация: Stage 1. Проверяет: auth токен, organizationId, teamId, лицензия активна. Fail early с UnauthorizedError / NotFoundError если нет. Готово, если: для CORE-059 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-060 | Реализовать validateNewCommitsStage | DONE | Реализовано | Реализация: Stage 2. Сравнивает последний reviewed commit с текущим HEAD. Skip (success с пустым context) если нет новых коммитов. Готово, если: для CORE-060 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-061 | Реализовать resolveConfigStage | DONE | Реализовано | Реализация: Stage 3. Загружает repo config через IRepositoryConfigLoader. Merge: default -> org -> repo. Записывает config в context. Готово, если: для CORE-061 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-062 | Реализовать validateConfigStage | DONE | Реализовано | Реализация: Stage 4. Валидирует config schema. Fail с ValidationError если невалиден. Записывает validated config в context. Готово, если: для CORE-062 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.13.0 — Pipeline: Preparation Stages (5-9)

> Подготовка к AI-анализу.

> **Результат версии:** Завершена версия «v0.13.0 — Pipeline: Preparation Stages (5-9)» в рамках M03; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-063 | Реализовать createCheckStage | DONE | Реализовано | Реализация: Stage 5. Создает pending check run через IGitProvider.createCheckRun(). Записывает checkId в context. Готово, если: для CORE-063 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-064 | Реализовать fetchChangedFilesStage | DONE | Реализовано | Реализация: Stage 6. Получает diff через IGitProvider.getChangedFiles(). Применяет config.ignorePaths фильтр. Записывает files[] в context. Готово, если: для CORE-064 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-065 | Реализовать loadExternalContextStage | DONE | Реализовано | Реализация: Stage 7. Загружает RAG-контекст из IVectorRepository. Обогащает context.externalContext. Skip если vector DB недоступен. Готово, если: для CORE-065 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-066 | Реализовать fileContextGateStage | DONE | Реализовано | Реализация: Stage 8. Фильтрует файлы по доступности контекста. Группирует в батчи по config.batchSize (default 30). Готово, если: для CORE-066 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-067 | Реализовать initialCommentStage | DONE | Реализовано | Реализация: Stage 9. Постит "Review started" комментарий через IGitProvider.postComment(). Записывает commentId в context. Готово, если: для CORE-067 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.14.0 — Pipeline: Analysis Stages (10-14)

> AI-анализ и валидация предложений.

> **Результат версии:** Завершена версия «v0.14.0 — Pipeline: Analysis Stages (10-14)» в рамках M03; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-068 | Реализовать processCcrLevelReviewStage | DONE | Реализовано | Реализация: Stage 10. Cross-file анализ через ILLMProvider.chat(). Prompt из config. Результат: CCR-level suggestions (архитектура, тесты, breaking changes). Готово, если: CCR-level анализ формирует структурированный output по категориям (архитектура/тесты/breaking changes), при недоступности LLM stage возвращает предсказуемую ошибку и не ломает пайплайн-состояние; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-069 | Реализовать processFilesReviewStage | DONE | Реализовано | Реализация: Stage 11. Per-file LLM анализ. Параллельные батчи (context.batches). Timeout 60s на файл. Собирает suggestions[] в context. Готово, если: для батчей файлов соблюдаются лимиты параллелизма и timeout 60s/файл, timeout одного файла не роняет весь review, итоговые suggestions агрегируются без потерь и дублей; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-070 | Реализовать createCcrLevelCommentsStage | DONE | Реализовано | Реализация: Stage 12. Постит CCR-level suggestions через IGitProvider.postComment(). Группирует по категории. Готово, если: для CORE-070 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-071 | Реализовать validateSuggestionsStage | DONE | Реализовано | Реализация: Stage 13. Запускает SafeGuard фильтры (ISafeGuardFilter[]) последовательно. Записывает passed -> suggestions, rejected -> discardedSuggestions. Готово, если: цепочка SafeGuard фильтров применяется детерминированно, для каждой discarded suggestion фиксируется discardReason, false-positive budget конфигурируется и проверяется тестами; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-072 | Реализовать createFileCommentsStage | DONE | Реализовано | Реализация: Stage 14. Постит inline комментарии через IGitProvider.postInlineComment(). Форматирует под платформу. Готово, если: для CORE-072 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.15.0 — Pipeline: Output Stages (15-20)

> Агрегация, summary, финализация.

> **Результат версии:** Завершена версия «v0.15.0 — Pipeline: Output Stages (15-20)» в рамках M03; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-073 | Реализовать aggregateResultsStage | DONE | Реализовано | Реализация: Stage 15. Считает: issueCount, severity distribution, tokenUsage суммарный, riskScore через RiskScore.calculate(). Записывает metrics. Готово, если: для CORE-073 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-074 | Реализовать generateSummaryStage | DONE | Реализовано | Реализация: Stage 16. Генерирует CCR summary через ILLMProvider.chat(). Обновляет initial comment (commentId) с summary. Готово, если: для CORE-074 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-075 | Реализовать requestChangesOrApproveStage | DONE | Реализовано | Реализация: Stage 17. Approve через IGitProvider если нет CRITICAL/HIGH issues. Request changes если есть. Configurable через config.autoApprove. Готово, если: решение approve/request changes принимается строго по порогам severity и config.autoApprove, для пограничных кейсов (ровно threshold, пустой список issues) есть явные тесты; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-076 | Реализовать finalizeCheckStage | DONE | Реализовано | Реализация: Stage 18. Обновляет check run: success если approved, failure если request changes. Включает summary в output. Готово, если: check run всегда завершается финальным статусом (success/failure) с валидным summary, при ошибке обновления check run выполняется retry и фиксируется наблюдаемый failure-path; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-077 | Реализовать updateMetricsStage | DONE | Реализовано | Реализация: Stage 19. Записывает метрики review (duration, tokenUsage, issueCount, riskScore). Emits MetricsCalculated event. Готово, если: для CORE-077 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-078 | Реализовать emitEventsStage | DONE | Реализовано | Реализация: Stage 20. Публикует накопленные domain events из Review aggregate через IEventBus.publishAll(). Очищает events. Готово, если: для CORE-078 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.16.0 — SafeGuard Filters

> Фильтрация LLM-ответов для качества.

> **Результат версии:** Завершена версия «v0.16.0 — SafeGuard Filters» в рамках M03; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-079 | Реализовать iSafeGuardFilter | DONE | Реализовано | Реализация: Interface: name: string, filter(suggestions, context): Promise<{passed: Suggestion[], discarded: DiscardedSuggestion[]}>. Composable. Готово, если: для CORE-079 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-080 | Реализовать deduplicationFilter | DONE | Реализовано | Реализация: Дедупликация по hash(filePath + lineRange + message). При дубликатах оставляет highest severity. discardReason = "duplicate". Готово, если: для CORE-080 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-081 | Реализовать hallucinationFilter | DONE | Реализовано | Реализация: Проверяет что suggestion ссылается на реальный код из context.files. LLM validation через ILLMProvider. discardReason = "hallucination". Готово, если: hallucination filter отклоняет предложения без привязки к реальному коду/диффу, сохраняет валидные предложения, и демонстрирует измеримое снижение ложноположительных на тестовом наборе; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-082 | Реализовать severityThresholdFilter | DONE | Реализовано | Реализация: Фильтрует ниже config.severityThreshold. Per-severity limits из config.maxSuggestionsPerSeverity. discardReason = "below_threshold". Готово, если: для CORE-082 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-083 | Реализовать prioritySortFilter | DONE | Реализовано | Реализация: Сортирует по rankScore (categoryWeight + severity.weight). Обрезает по config.maxSuggestionsPerCCR. discardReason = "low_priority". Готово, если: для CORE-083 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-084 | Реализовать implementationCheckFilter | DONE | Реализовано | Реализация: Пропускает suggestions для уже исправленного кода. Сравнивает suggestion.codeBlock с текущим файлом. discardReason = "already_implemented". Готово, если: implementation check корректно отбрасывает уже реализованные рекомендации по актуальному состоянию файла и не удаляет нерешённые suggestions при частичных совпадениях; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
