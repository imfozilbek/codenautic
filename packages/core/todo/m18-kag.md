# M18 — KAG

> Источник: `packages/core/TODO.md`

> **Задач (core):** 17 | **Проверка:** KAG семантический слой, graph reasoning, knowledge writer

> **Результат milestone:** Готов KAG-домен: семантический слой, reasoning-контуры и knowledge-интерфейсы.

## v0.64.0 — KAG: Семантический слой графа

> Расширение типов узлов/рёбер Code Graph для Knowledge Augmented Generation. Prerequisite: Фаза 1 (Launch) завершена.

> **Результат версии:** Завершена версия «v0.64.0 — KAG: Семантический слой графа» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-370 | Реализовать семантические типы узлов | TODO | Не начато | Реализация: 8 новых типов: pattern, convention, decision, concept, rule, issue_pattern, ownership, evolution. Типы в core, индексы в MongoDB. Готово, если: для CORE-370 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-371 | Реализовать семантические типы рёбер | TODO | Не начато | Реализация: 7 новых типов: USES_PATTERN, VIOLATES, DECIDED_BY, OWNED_BY, EVOLVED_FROM, RELATES_TO, CAUSES. Типы в core. Готово, если: для CORE-371 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.65.0 — KAG: Graph Reasoning & Hybrid Retrieval Ports

> Порты для логического вывода и гибридного поиска по Knowledge Graph.

> **Результат версии:** Завершена версия «v0.65.0 — KAG: Graph Reasoning & Hybrid Retrieval Ports» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-372 | Реализовать iGraphReasoner port | TODO | Не начато | Реализация: Порт в core: inferImpactChain(), queryByPattern(), explainDecision(), findAnalogies(), detectViolations(). Готово, если: порт покрывает все заявленные операции reasoning, контракты входа/выхода стабильны для адаптеров, failure-path (пустой граф, недоступный backend) описан и протестирован; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-373 | Реализовать iHybridRetriever port | TODO | Не начато | Реализация: Порт в core: retrieve(query) → vector search → graph expansion → re-ranking → enriched results. Готово, если: pipeline hybrid retrieval (vector -> graph expansion -> rerank) воспроизводим и детерминирован, на контрольных запросах релевантность выше baseline vector-only по зафиксированному набору тестов; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.66.0 — KAG: Knowledge Graph Writer Port

> Порт для записи/обновления семантических узлов в Knowledge Graph. ast реализует адаптер.

> **Результат версии:** Завершена версия «v0.66.0 — KAG: Knowledge Graph Writer Port» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-387 | Реализовать iKnowledgeGraphWriter port | TODO | Не начато | Реализация: Порт в outbound/analysis/: upsertNodes(input), deleteNodes(input), upsertEdges(input). Типы: IKGUpsertNodesInput, IKGDeleteNodesInput, IKGUpsertEdgesInput. Готово, если: операции upsert/delete/upsertEdges идемпотентны, поддерживают батчевые payload и частичные ошибки без потери консистентности графа; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-388 | Реализовать iKnowledgeGraphWriter DTOs | TODO | Не начато | Реализация: DTOs в dto/analysis/: input/output типы для Knowledge Graph write операций. Используют SemanticNodeType, ISemanticNodeMetadata из domain/types. Готово, если: для CORE-388 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.67.0 — Doc Generation Use Case

> Use Case для автоматической генерации документации: scope → KG query → Hybrid Retrieval → LLM → document.

> **Результат версии:** Завершена версия «v0.67.0 — Doc Generation Use Case» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> Перенесён из scan-worker/SCAN-013 — use case принадлежит core по Clean Architecture.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-389 | Реализовать iDocGenerator outbound port | TODO | Не начато | Реализация: Порт в outbound/analysis/: generate(input) → generated document. LLM-провайдер реализует. Готово, если: порт doc generation принимает валидированный scope/template и возвращает структурированный результат с метаданными, ошибки провайдера типизированы и не теряют контекст; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-390 | Реализовать docGeneration DTOs | TODO | Не начато | Реализация: IDocGenerationInput (scope, templateType, repoId), IDocGenerationOutput (content, format, metadata). 7 template types. Готово, если: для CORE-390 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-391 | Реализовать docGenerationUseCase | TODO | Не начато | Реализация: Use case: resolveScope → IHybridRetriever.retrieve() → IDocGenerator.generate() → Result<IDocGenerationOutput>. Готово, если: use case проходит полный контур resolveScope -> retrieve -> generate, при пустом retrieval возвращается безопасный fallback-ответ без падения процесса; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.68.0 — Mention Command Use Cases

> Use Cases для обработки @codenautic команд: review, explain, fix, summary, help, config.

> **Результат версии:** Завершена версия «v0.68.0 — Mention Command Use Cases» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> Перенесены из agent-worker/AGNT-015–020 — бизнес-логика команд принадлежит core.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-379 | Реализовать reviewCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic review`: валидация прав, создание review trigger. IUseCase<In, Out, Err>. Готово, если: для CORE-379 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-380 | Реализовать explainCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic explain`: контекст файла/функции → LLM explanation. Готово, если: для CORE-380 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-381 | Реализовать fixCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic fix`: suggestion → code fix → comment с предложенным изменением. Готово, если: для CORE-381 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-382 | Реализовать summaryCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic summary`: CCR summary generation. Готово, если: для CORE-382 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-383 | Реализовать helpCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic help`: список доступных команд и их описание. Готово, если: для CORE-383 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-384 | Реализовать конфигурацияCommandUseCase | TODO | Не начато | Реализация: Обработка `@codenautic config`: просмотр/изменение конфигурации. Проверка прав (maintainers). Готово, если: для CORE-384 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.69.0 — Очередь Payload Schemas

> Shared Zod-схемы для валидации payload перед publish в очереди.

> **Результат версии:** Завершена версия «v0.69.0 — Queue Payload Schemas» в рамках M18; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> Перенесено из api/API-QUEUE-005 — схемы нужны всем producers (api, webhooks, scheduler).

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-385 | Реализовать iQueuePayloadSchema interface | TODO | Не начато | Реализация: Generic interface для queue payload validation. Zod-based. Готово, если: для CORE-385 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-386 | Реализовать очередь payload schemas | TODO | Не начато | Реализация: Zod-схемы для: review.trigger, scan.repo, scan.update, agent.conversation, agent.summary, notify.send, report.deliver, analytics.metrics, analytics.feedback, analytics.drift. Готово, если: для CORE-386 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## Version Summary

| Версия    | Группа                                  | Задач   |
|-----------|-----------------------------------------|---------|
| v0.1.0    | Foundation Tests                        | 8       |
| v0.2.0    | Domain Errors                           | 5       |
| v0.3.0    | Core Value Objects                      | 6       |
| v0.4.0    | Extended Value Objects                  | 4       |
| v0.5.0    | Shared Utils                            | 4       |
| v0.6.0    | Review Entities                         | 3       |
| v0.7.0    | Review Events                           | 5       |
| v0.8.0    | Review Types                            | 5       |
| v0.9.0    | Git & LLM Types                         | 7       |
| v0.10.0   | Core Ports (Driven)                     | 6       |
| v0.11.0   | Pipeline Architecture                   | 5       |
| v0.11.1   | Entity Factories                        | 4       |
| v0.12.0   | Pipeline: Validation Stages (1-4)       | 4       |
| v0.13.0   | Pipeline: Preparation Stages (5-9)      | 5       |
| v0.14.0   | Pipeline: Analysis Stages (10-14)       | 5       |
| v0.15.0   | Pipeline: Output Stages (15-20)         | 6       |
| v0.16.0   | SafeGuard Filters                       | 6       |
| v0.17.0   | Organization Domain                     | 4       |
| v0.18.0   | Project & Config                        | 8       |
| v0.19.0   | Custom Rules                            | 4       |
| v0.20.0   | Feedback System                         | 3       |
| v0.21.0   | Prompt System                           | 6       |
| v0.22.0   | Rules Library                           | 6       |
| v0.23.0   | Messaging Patterns                      | 6       |
| v0.24.0   | Analytics Domain                        | 6       |
| v0.25.0   | Graph Domain                            | 5       |
| v0.26.0   | Mention Commands & External Context     | 6       |
| v0.27.0   | Notification System                     | 5       |
| v0.28.0   | CCR Summary & Review Modes              | 4       |
| v0.29.0   | Audit & Logging                         | 3       |
| v0.30.0   | Continuous Learning                     | 5       |
| v0.31.0   | Suggestion Processing                   | 4       |
| v0.32.0   | Architecture Analysis                   | 4       |
| v0.33.0   | MCP Protocol & Task Management          | 7       |
| v0.34.0   | IoC Tokens Registry                     | 1       |
| v0.35.0   | Expert Panel Domain                     | 4       |
| v0.36.0   | Prompt Seed Data                        | 6       |
| v0.37.0   | Rule & Category Seed Data               | 3       |
| v0.38.0   | Seeder Use Cases                        | 3       |
| v0.39.0   | Rule Context Formatting                 | 3       |
| v0.40.0   | Stage-Prompt Integration                | 5       |
| v0.40.1   | Shared Utilities Refactoring            | 17      |
| v0.41.0   | RuleCategory Weights & System Settings  | 10      |
| v0.42.0   | Admin CRUD Use Cases                    | 7       |
| v0.43.0   | Admin API Endpoints                     | 6       |
| v0.44.0   | Migration Script & Default Data         | 4       |
| v0.44.1   | ExpertPanel Stage Wiring                | 1       |
| v0.44.2   | Seed Cleanup                            | 2       |
| v0.45.0   | Rule Inheritance (team-level)           | 4       |
| v0.45.1   | Review Depth Modes                      | 3       |
| v0.45.2   | Directory-level Config                  | 4       |
| v0.46.0   | Issue Tracking from Suggestions         | 5       |
| v0.47.0   | Conversation Agent                      | 6       |
| v0.48.0   | CodeCity Domain                         | 8       |
| v0.49.0   | Repository Onboarding: Ports & DTOs     | 8       |
| v0.50.0   | Repository Onboarding: Events & Ports   | 8       |
| v0.51.0   | Repository Onboarding: Use Cases        | 6       |
| v0.52.0   | Causal Analysis: Temporal Coupling      | 7       |
| v0.53.0   | Causal Analysis: Root Cause & Trends    | 9       |
| v0.54.0   | Causal Overlays: DTOs for CodeCity      | 5       |
| v0.55.0   | Developer Onboarding Domain             | 5       |
| v0.56.0   | Refactoring Planning Domain             | 7       |
| v0.57.0   | Impact Planning Domain                  | 5       |
| v0.58.0   | Knowledge Map & Bus Factor Domain       | 9       |
| v0.59.0   | AI Predictive Analytics Domain          | 7       |
| v0.60.0   | Sprint Gamification Domain              | 8       |
| v0.61.0   | Architecture Drift Domain               | 9       |
| v0.62.0   | Executive Reports Domain                | 8       |
| v0.63.0   | Review Context Domain                   | 8       |
| v0.63.1   | Comment Batching & Re-Review Tracking   | 5       |
| v0.64.0   | KAG: Семантический слой графа           | 2       |
| v0.65.0   | KAG: Graph Reasoning & Hybrid Retrieval | 2       |
| v0.66.0   | KAG: Knowledge Graph Writer Port        | 2       |
| v0.67.0   | Doc Generation Use Case                 | 3       |
| v0.68.0   | Mention Command Use Cases               | 6       |
| v0.69.0   | Queue Payload Schemas                   | 2       |
| **Итого** | **75 версий**                           | **407** |
