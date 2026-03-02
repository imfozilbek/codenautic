# M02 — Review Domain & Pipeline Architecture

> Источник: `packages/core/TODO.md`

> **Задач:** 35 | **Проверка:** Review aggregate, pipeline runner с mock stages

> **Результат milestone:** Готов доменный контур review и архитектура pipeline для автоматического анализа MR/PR.

## Архитектурная фиксация (2026-03-02)

> Единый контракт для задач core/runtime, где фигурируют pipeline, stage и orchestrator.

1. Каждый stage реализуется как отдельный Use Case (`IUseCase`), а `IPipelineStage` остаётся thin-adapter для обратной совместимости.
2. Выполнение управляется `PipelineOrchestratorUseCase` (orchestrated event-driven), а не свободной choreography.
3. Порядок stage задаётся через `PipelineDefinition` с версией (`definitionVersion`), а не хардкодом внутри runner.
4. Каждый `PipelineRun` фиксирует версию определения (`definitionVersion`) при старте; in-flight run не мигрирует на новую версию автоматически.
5. После каждого stage сохраняется checkpoint (`currentStage`, `lastCompletedStage`, `attempt`, `status`) для resume/retry.
6. Обязательные события: `PipelineStarted`, `StageStarted`, `StageCompleted`, `StageFailed`, `PipelineCompleted`, `PipelineFailed`.

## v0.6.0 — Review Entities

> Ядро code review: Review aggregate, ReviewIssue entity, DiffFile VO.

> **Результат версии:** Завершена версия «v0.6.0 — Review Entities» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-028 | Реализовать review aggregate | DONE | Реализовано | Реализация: AggregateRoot. Status: PENDING -> IN_PROGRESS -> COMPLETED/FAILED. issues: ReviewIssue[]. start() -> IN_PROGRESS + ReviewStarted event. addIssue(issue) + IssueFound event. complete(metrics) -> COMPLETED + ReviewCompleted event. fail(FailureReason) -> FAILED + ReviewCompleted event. Готово, если: для CORE-028 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-029 | Реализовать reviewIssue entity | DONE | Реализовано | Реализация: Entity. filePath: FilePath, lineRange: LineRange, severity: Severity, category: IssueCategory, message: string, suggestion?: string, codeBlock?: string. calculateRankScore(): number = categoryWeight + severity.weight. Готово, если: для CORE-029 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-030 | Реализовать diffFile value object | DONE | Реализовано | Реализация: FilePath: FilePath, status: "added" / "modified" / "deleted" / "renamed", hunks: string[], patch: string, oldPath?: FilePath (для renamed). matchesIgnorePattern(patterns: string[]): boolean. Готово, если: для CORE-030 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.7.0 — Review Events

> Domain events для review lifecycle.

> **Результат версии:** Завершена версия «v0.7.0 — Review Events» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-031 | Реализовать reviewStarted | DONE | Реализовано | Реализация: Extends BaseDomainEvent. eventName = "ReviewStarted". Payload: reviewId, mergeRequestId, startedAt. Готово, если: для CORE-031 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-032 | Реализовать reviewCompleted | DONE | Реализовано | Реализация: Extends BaseDomainEvent. eventName = "ReviewCompleted". Payload: reviewId, status (COMPLETED/FAILED), issueCount, duration. Готово, если: для CORE-032 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-033 | Реализовать issueFound | DONE | Реализовано | Реализация: Extends BaseDomainEvent. eventName = "IssueFound". Payload: issueId, reviewId, severity, filePath, lineRange. Готово, если: для CORE-033 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-034 | Реализовать metricsCalculated | DONE | Реализовано | Реализация: Extends BaseDomainEvent. eventName = "MetricsCalculated". Payload: reviewId, tokenUsage, costEstimate, duration. Готово, если: для CORE-034 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-035 | Реализовать feedbackReceived | DONE | Реализовано | Реализация: Extends BaseDomainEvent. eventName = "FeedbackReceived". Payload: issueId, reviewId, feedbackType: FeedbackType, userId. Готово, если: для CORE-035 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.8.0 — Review Types

> Типы для конфигурации и результатов review.

> **Результат версии:** Завершена версия «v0.8.0 — Review Types» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-036 | Реализовать reviewConfig | TODO | Не начато | Реализация: Interface: severityThreshold: string, ignorePaths: string[], maxSuggestionsPerFile, maxSuggestionsPerCCR, cadence, customRuleIds[], promptOverrides?. Только примитивы, без domain imports. Готово, если: для CORE-036 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-037 | Реализовать reviewResult | TODO | Не начато | Реализация: Interface: reviewId, status: string, issues: IReviewIssueDTO[], metrics: {duration: number} &#124; null. Только примитивы, без domain imports. Готово, если: для CORE-037 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-038 | Реализовать suggestion | TODO | Не начато | Реализация: Interface: id, filePath: string, lineStart: number, lineEnd: number, severity: string, category, message, codeBlock?, committable: boolean, rankScore: number. Только примитивы. Готово, если: для CORE-038 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-039 | Реализовать discardedSuggestion | TODO | Не начато | Реализация: Extends Suggestion + discardReason: string, filterName: string. Для аналитики отфильтрованных. Готово, если: для CORE-039 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-040 | Реализовать tokenUsage | TODO | Не начато | Реализация: Interface: ITokenUsageDTO (input, output, total), ITokenUsageBreakdown extends IDTO (byModel, byStage). Только примитивы, без domain imports. Готово, если: для CORE-040 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.9.0 — Git & LLM Types

> Типы для Git-платформ и LLM-провайдеров.

> **Результат версии:** Завершена версия «v0.9.0 — Git & LLM Types» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-041 | Реализовать mergeRequest type | TODO | Не начато | Реализация: Interface: id, number, title, description, sourceBranch, targetBranch, author, state, commits[], diffFiles[]. Platform-agnostic. Готово, если: для CORE-041 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-042 | Реализовать comment / InlineComment types | TODO | Не начато | Реализация: Comment: id, body, author, createdAt. InlineComment extends Comment + filePath, line, side ("LEFT"/"RIGHT"). Для posting и чтения. Готово, если: для CORE-042 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-043 | Реализовать checkRun type | TODO | Не начато | Реализация: Interface: id, name, status ("queued"/"in_progress"/"completed"), conclusion ("success"/"failure"/"neutral"/"cancelled"), summary?, detailsUrl?. Готово, если: для CORE-043 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-044 | Реализовать webhookEvent type | TODO | Не начато | Реализация: Interface: eventType, payload: unknown, signature: string, platform: string, timestamp: Date. Для webhook verification. Готово, если: для CORE-044 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-045 | Реализовать чатRequest / ЧатResponse | TODO | Не начато | Реализация: ЧатRequest: messages: Message[], model, temperature?, maxTokens?, tools?: ToolDefinition[]. ЧатResponse: content, toolCalls?: ToolCall[], usage. Готово, если: для CORE-045 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-046 | Реализовать message / ToolCall types | TODO | Не начато | Реализация: Message: role ("system"/"user"/"assistant"/"tool"), content, name?, toolCallId?. ToolCall: id, name, arguments: string. ToolDefinition: name, description, parameters. Готово, если: для CORE-046 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-047 | Реализовать streaming types | TODO | Не начато | Реализация: StreamingChatResponse: AsyncIterable<ЧатChunk>. ЧатChunk: delta: string, finishReason?: string, usage?: TokenUsage. Готово, если: для CORE-047 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.10.0 — Core Ports (Driven)

> Интерфейсы для внешних зависимостей.

> **Результат версии:** Завершена версия «v0.10.0 — Core Ports (Driven)» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-048 | Реализовать iGitProvider | TODO | Не начато | Реализация: GetMergeRequest(id), getChangedFiles(mrId), postComment(mrId, body), postInlineComment(mrId, comment), createCheckRun(mrId, name), updateCheckRun(checkId, status, conclusion). Готово, если: для CORE-048 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-049 | Реализовать iLLMProvider | TODO | Не начато | Реализация: Чат(request: ЧатRequest): Promise<ЧатResponse>. stream(request: ЧатRequest): AsyncIterable<ЧатChunk>. embed(texts: string[]): Promise<number[][]>. Готово, если: для CORE-049 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-050 | Реализовать iReviewRepository | TODO | Не начато | Реализация: Extends IRepository<Review>. findByMergeRequestId(mrId). findByStatus(status). findByDateRange(from, to). findByRepositoryId(repoId). Готово, если: для CORE-050 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-051 | Реализовать iVectorRepository | TODO | Не начато | Реализация: Upsert(chunks: {id, vector, metadata}[]). search(query: number[], filters?, limit?): Promise<{id, score, metadata}[]>. delete(ids: string[]). Готово, если: для CORE-051 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-052 | Реализовать iCache | TODO | Не начато | Реализация: Get<T>(key: string): Promise<T / null>. set<T>(key, value, ttl?: number): Promise<void>. delete(key). has(key): Promise<boolean>. Готово, если: для CORE-052 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-053 | Реализовать iLogger | DONE | Реализовано | Реализация: Info(message, context?), warn(message, context?), error(message, context?), debug(message, context?). child(context): ILogger (child logger). Структурированный JSON-формат. Готово, если: для CORE-053 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.11.0 — Pipeline Architecture

> Архитектура pipeline: context, stage, runner.

> **Результат версии:** Завершена версия «v0.11.0 — Pipeline Architecture» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-054 | Реализовать reviewPipelineState | DONE | Реализовано | Реализация: Immutable state + run metadata. mergeRequest, config, files[], suggestions[], discardedSuggestions[], metrics?, checkId?, commentId?, externalContext?, runId, definitionVersion, currentStageId?, lastCompletedStageId?, stageAttempts: Record<string, number>. `with(updates)` возвращает новый `ReviewPipelineState`. Готово, если: `ReviewPipelineState` хранит версию pipeline-определения и прогресс run, переходы состояния детерминированы и покрыты unit-тестами (включая resume после checkpoint), контракты DTO/ports совместимы; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-055 | Реализовать iPipelineStage | DONE | Реализовано | Реализация: Базовый stage-контракт как Use Case (`IUseCase<StageCommand, StageTransition, StageError>`), плюс adapter `IPipelineStage` для совместимости. Каждый stage получает `ReviewPipelineState` и возвращает transition с новым state и метаданными stage execution. Готово, если: каждый stage исполняется как отдельный use case, adapter-слой покрыт тестами совместимости, а контракты stage-входа/выхода типобезопасны и стабильны; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-056 | Реализовать pipelineRunner | DONE | Реализовано | Реализация: `PipelineOrchestratorUseCase` (совместимый alias: `PipelineRunner`) читает `PipelineDefinition`, фиксирует `definitionVersion` в run, исполняет stage последовательно по definition, публикует lifecycle events и сохраняет checkpoint после каждого stage. Готово, если: смена порядка stage делается через новую `PipelineDefinition` без поломки in-flight run, есть тесты на pinning версии, resume/retry и failure-path на середине pipeline; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-057 | Реализовать stageError | DONE | Реализовано | Реализация: Extends DomainError. code = "STAGE_ERROR". Поля: runId, definitionVersion, stageId, attempt, recoverable, originalError?. Поддержка сериализации для событий и retry-policy. Готово, если: `StageError` однозначно связывает ошибку со stage/run/версией pipeline, сериализуется без потерь данных и покрыт тестами на recoverable/non-recoverable ветки; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-058 | Реализовать pipelineResult | DONE | Реализовано | Реализация: Interface: runId, definitionVersion, context, stageResults: {stageId, stageName, durationMs, status: "ok" / "fail" / "skipped", attempt}[], totalDurationMs, success, stoppedAtStageId?, failureReason?. Готово, если: `PipelineResult` позволяет восстановить точку остановки и версию определения, содержит полный trace stage execution и подтверждён тестами на success/fail/partial completion; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.11.1 — Entity Factories

> Базовый интерфейс IEntityFactory и фабрики для существующих entities.

> **Результат версии:** Завершена версия «v0.11.1 — Entity Factories» в рамках M02; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-054a | Реализовать iEntityFactory | DONE | Реализовано | Реализация: Interface: `IEntityFactory<TEntity, TCreateProps, TReconProps>`. `create(props: TCreateProps): TEntity`. `reconstitute(props: TReconProps, id: UniqueId): TEntity`. Базовый контракт для всех entity/aggregate фабрик. Готово, если: для CORE-054a полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-054b | Реализовать reviewFactory | DONE | Реализовано | Реализация: Реализует `IEntityFactory`. `create(mergeRequestId)` — создание нового Review. `reconstitute(props, id)` — восстановление из persistence. Убрать `static create()` из Review. Обновить. Готово, если: для CORE-054b полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-054c | Реализовать reviewIssueFactory | DONE | Реализовано | Реализация: Реализует `IEntityFactory`. `create({filePath, lineRange, severity,.})` — создание нового ReviewIssue. `reconstitute(props, id)` — восстановление из persistence. Убрать `static create()` из ReviewIssue. Обновить. Готово, если: для CORE-054c полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-054d | Реализовать barrel exports | DONE | Реализовано | Реализация: Экспорт IEntityFactory из `domain/factories/index.ts` → `domain/index.ts`. Экспорт ReviewFactory, ReviewIssueFactory. Обновить `domain/index.ts`. Готово, если: для CORE-054d полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
