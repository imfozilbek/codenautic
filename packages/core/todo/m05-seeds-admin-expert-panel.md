# M05 — Seeds, Admin, Expert Panel

> Источник: `packages/core/TODO.md`

> **Задач:** 95 | **Проверка:** Admin CRUD, seed data, stage-prompt wiring, Expert Panel

> **Результат milestone:** Готов операционный доменный слой: seed-данные, admin-потоки, экспертные и prompt-сценарии.

## v0.29.0 — Audit & Logging

> Аудит изменений настроек.

> **Результат версии:** Завершена версия «v0.29.0 — Audit & Logging» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-146 | Реализовать auditLog entity | DONE | Реализовано | Реализация: Entity. action: string, actor: UniqueId, target: {type: string, id: string}, changes: {field, oldValue: unknown, newValue: unknown}[], timestamp: Date. Append-only (no update). Готово, если: для CORE-146 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-147 | Реализовать auditLogService | DONE | Реализовано | Реализация: Domain service. log(action, actor, target, changes): creates AuditLog, saves через IAuditLogRepository. Валидация: action не пустой, actor существует. Готово, если: для CORE-147 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-148 | Реализовать iAuditLogRepository | DONE | Реализовано | Реализация: Append(log: AuditLog). findByTarget(type, id). findByActor(actorId). findByDateRange(from, to). Pagination. NO update/delete methods (append-only). Готово, если: для CORE-148 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.30.0 — Continuous Learning

> Feedback-driven learning и улучшение качества.

> **Результат версии:** Завершена версия «v0.30.0 — Continuous Learning» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-149 | Реализовать analyzeFeedbackUseCase | DONE | Реализовано | Реализация: IUseCase. Анализирует feedback patterns по rule/severity/team. Выявляет false positive rates. Возвращает {ruleId, helpfulRate, falsePositiveRate, total}[]. Готово, если: для CORE-149 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-150 | Реализовать ruleEffectivenessService | DONE | Реализовано | Реализация: Domain service. Tracks: helpfulRate, falsePositiveRate, implementedRate per ruleId. Exponential decay для старых данных. getEffectiveness(ruleId). Готово, если: для CORE-150 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-151 | Реализовать detectFalsePositivesUseCase | DONE | Реализовано | Реализация: IUseCase. Детектирует rules с falsePositiveRate > threshold (configurable). Рекомендует деактивацию. Возвращает {ruleId, rate, recommendation}[]. Готово, если: для CORE-151 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-152 | Реализовать learnTeamPatternsUseCase | TODO | Не начато | Реализация: IUseCase. Обучается на team coding patterns. Adjusts suggestion weights per team. Возвращает team-specific adjustments. Готово, если: для CORE-152 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-153 | Реализовать iLearningService | TODO | Не начато | Реализация: CollectFeedback(feedbacks[]). adjustWeights(teamId, adjustments). getEffectiveness(ruleId). getTeamPatterns(teamId). Готово, если: для CORE-153 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.31.0 — Suggestion Processing

> Кластеризация, приоритизация, проверка committability.

> **Результат версии:** Завершена версия «v0.31.0 — Suggestion Processing» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-154 | Реализовать suggestionCluster type | TODO | Не начато | Реализация: Interface: type ("parent"/"related"), relatedSuggestionIds: string[], parentSuggestionId?: string, problemDescription: string, actionStatement: string. Готово, если: для CORE-154 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-155 | Реализовать clusterSuggestionsUseCase | TODO | Не начато | Реализация: IUseCase. Modes: MINIMAL (no grouping), SMART (cluster by similarity), FULL (parent/child). Использует Embedding.similarity(). Возвращает clustered suggestions[]. Готово, если: для CORE-155 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-156 | Реализовать checkCommittabilityUseCase | TODO | Не начато | Реализация: IUseCase<Suggestion, {committable: boolean, reason?}>. Проверяет: код синтаксически корректен, codeBlock заменяем, нет конфликтов с другими suggestions. Готово, если: для CORE-156 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-157 | Реализовать iSuggestionClusteringService | TODO | Не начато | Реализация: Cluster(suggestions: Suggestion[], mode: "MINIMAL"/"SMART"/"FULL"): Promise<SuggestionCluster[]>. Готово, если: для CORE-157 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.32.0 — Architecture Analysis

> DDD compliance, layer validation, health scoring.

> **Результат версии:** Завершена версия «v0.32.0 — Architecture Analysis» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-158 | Реализовать architectureHealthScore type | TODO | Не начато | Реализация: Interface: overall (0-100), dimensions: {coupling, cohesion, layerCompliance, dddCompliance}, violations: LayerViolation[], anemicModelIndex: number. Готово, если: для CORE-158 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-159 | Реализовать dDDComplianceReport type | TODO | Не начато | Реализация: Interface: violations: {type, entity, description}[], aggregateHealth: {name, eventCount, methodCount}[], boundedContexts: string[]. Готово, если: для CORE-159 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-160 | Реализовать layerViolation type | TODO | Не начато | Реализация: Interface: sourceLayer ("domain"/"application"/"infrastructure"), targetLayer, sourceFile: string, targetFile: string, importPath: string. Готово, если: для CORE-160 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-161 | Реализовать iArchitectureAnalyzer | TODO | Не начато | Реализация: AnalyzeHealth(repoId): Promise<ArchitectureHealthScore>. detectViolations(repoId): Promise<LayerViolation[]>. getDDDCompliance(repoId): Promise<DDDComplianceReport>. Готово, если: для CORE-161 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.33.0 — MCP Protocol & Task Management

> Model Context Protocol server + async task tracking.

> **Результат версии:** Завершена версия «v0.33.0 — MCP Protocol & Task Management» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-162 | Реализовать MCPTool type | TODO | Не начато | Реализация: Interface: name, description, inputSchema: object (JSON Schema), outputSchema?: object. Готово, если: для CORE-162 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-163 | Реализовать MCPResource type | TODO | Не начато | Реализация: Interface: uri: string, name, description?, mimeType: string. Готово, если: для CORE-163 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-164 | Реализовать iMCPServer | TODO | Не начато | Реализация: RegisterTool(tool: MCPTool, handler). registerResource(resource: MCPResource, provider). handleRequest(request): Promise<MCPToolResult>. MCP compliant. Готово, если: для CORE-164 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-165 | Реализовать MCP Use Cases | TODO | Не начато | Реализация: RegisterMCPToolUseCase, DiscoverMCPToolsUseCase, ValidateMCPToolInputUseCase. Tool discovery. Готово, если: для CORE-165 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-166 | Реализовать taskEntity | TODO | Не начато | Реализация: Entity. type: string, status: "PENDING"/"RUNNING"/"COMPLETED"/"FAILED", progress: number (0-100), metadata: Record<string, unknown>, result?, error?. Готово, если: для CORE-166 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-167 | Реализовать task Use Cases | TODO | Не начато | Реализация: CreateTaskUseCase, UpdateTaskProgressUseCase, CompleteTaskUseCase, FailTaskUseCase, GetTaskStatusUseCase. Готово, если: для CORE-167 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-168 | Реализовать iTaskRepository | TODO | Не начато | Реализация: Extends IRepository<TaskEntity>. findByStatus(status). findByType(type). findStale(olderThan: Date). Готово, если: для CORE-168 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.34.0 — IoC Tokens Registry

> Централизованный реестр типобезопасных IoC-токенов для всех портов.

> **Результат версии:** Завершена версия «v0.34.0 — IoC Tokens Registry» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-169 | Реализовать централизованные IoC-токены | TODO | Не начато | Реализация: Файл `infrastructure/ioc/tokens.ts`. Один `createToken<T>()` на каждый outbound port (IGitProvider, ILLMProvider, IReviewRepository, ICache, ILogger, IEventBus и т.д.). Экспорт объекта `TOKENS` с namespace группировкой (TOKENS.Git, TOKENS.LLM, TOKENS.Review.). Все пакеты-потребители используют эти токены вместо создания своих. Готово, если: для CORE-169 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.35.0 — Expert Panel Domain

> Domain concepts для multi-expert panel и расширение PromptCategory.

> **Результат версии:** Завершена версия «v0.35.0 — Expert Panel Domain» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-170 | Реализовать expert VO | TODO | Не начато | Реализация: `domain/value-objects/prompt/expert.ts`. Props: name: string, role: string, responsibilities: string[], priority: number. Валидация: name/role не пустые, priority >= 0. Метод `formatForPrompt(): string` — форматирует эксперта для инъекции в промпт. Готово, если: для CORE-170 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-171 | Реализовать expertPanel VO | TODO | Не начато | Реализация: Undefined, formatForPrompt(): string, size: number. Готово, если: для CORE-171 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-172 | Расширить PromptCategory | TODO | Не начато | Реализация: категории `rules`, `analysis`, `output`, `safeguard`, `cross-file`. Обновить enum/union и маппинг в prompt pipeline. Готово, если: для CORE-172 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-173 | Реализовать expert Panel Presets | TODO | Не начато | Реализация: `domain/factories/prompt/expert-panel-presets.ts`. createSafeguardPanel(): ExpertPanel — 5 экспертов (Edward VETO / Alice Syntax / Bob Logic / Charles Style / Diana Referee). createClassifierPanel(): ExpertPanel — 3 эксперта (Alice / Bob / Charles peer-review). Готово, если: для CORE-173 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.36.0 — Prompt Seed Data

> Импорт промптов как PromptTemplate seed data. Контент as-is, только ${var} → {{var}}.

> **Результат версии:** Завершена версия «v0.36.0 — Prompt Seed Data» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-174 | Реализовать iPromptSeedData interface + registry | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/prompt-seed-registry.ts`. Interface IPromptSeedData: name, category: PromptCategory, type: PromptType, content: string, variables: string[]. PROMPT_SEED_REGISTRY: IPromptSeedData[]. Готово, если: для CORE-174 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-175 | Реализовать seed: Code Review промпты (4 шаблона) | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/review/`. code-review-system, code-review-user, cross-file-analysis-system, severity-analysis-system. ${} конвертированы в {{}}. Готово, если: для CORE-175 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-176 | Реализовать seed: Rules промпты (10 шаблонов) | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/rules/`. 6 system + 4 user: classifier, update-suggestions, suggestion-generation, guardian, ccr-level-analyzer, ccr-level-group. Готово, если: для CORE-176 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-177 | Реализовать seed: SafeGuard промпты (4 шаблона) | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/safeguard/`. safeguard-5experts-panel, detect-breaking-changes, validate-code-semantics, validate-implemented-suggestions. Готово, если: для CORE-177 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-178 | Реализовать seed: Output промпты (3 шаблона) | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/output/`. remove-repeated-suggestions, check-suggestion-simplicity-system, check-suggestion-simplicity-user. Готово, если: для CORE-178 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-179 | Реализовать seed: Default review overrides | TODO | Не начато | Реализация: `infrastructure/data/seed/prompts/defaults/default-review-overrides.ts`. Severity flags: critical/high/medium/low описания. Category descriptions: bug/performance/security. Из YAML config as-is. Экспорт как IPromptConfigurationSeedData. Готово, если: для CORE-179 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.37.0 — Rule & Category Seed Data

> Импорт 794 библиотечных правил и 45 категорий.

> **Результат версии:** Завершена версия «v0.37.0 — Rule & Category Seed Data» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-180 | Реализовать seed: 46 Rule Categories | TODO | Не начато | Реализация: `infrastructure/data/seed/rules/rule-category-seeds.ts`. RULE_CATEGORY_SEEDS: 46 записей (slug, name, description). Все slug уникальны, проходят KEBAB_CASE_REGEX. Готово, если: для CORE-180 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-181 | Реализовать seed: 808 Library Rules | TODO | Не начато | Реализация: `infrastructure/data/seed/rules/library-rules.json`. Полный JSON. Scope маппинг: "file" → "FILE", "pull-request" → "CCR". Language "" → "\*". Готово, если: для CORE-181 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-182 | Реализовать iRuleSeedData + IRuleCategorySeedData types | TODO | Не начато | Реализация: `infrastructure/data/seed/rules/rule-seed-data.ts`. TypeScript interfaces для типизации seed данных. Функции маппинга: mapScope(scope: string): CustomRuleScope, mapLanguage(lang: string): string. Готово, если: для CORE-182 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.38.0 — Seeder Use Cases

> Use cases для idempotent загрузки seed данных в persistence.

> **Результат версии:** Завершена версия «v0.38.0 — Seeder Use Cases» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-183 | Реализовать seedRuleCategoriesUseCase | TODO | Не начато | Реализация: `application/use-cases/rules/seed-rule-categories.use-case.ts`. IUseCase<ISeedRuleCategoryItem[], ISeedResult>. RuleCategoryFactory.create() → IRuleCategoryRepository.save(). Idempotent: skip если slug существует (findBySlug). Готово, если: для CORE-183 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-184 | Реализовать seedLibraryRulesUseCase | TODO | Не начато | Реализация: `application/use-cases/rules/seed-library-rules.use-case.ts`. IUseCase<ISeedLibraryRuleItem[], ISeedResult>. RuleFactory.create() с OrganizationId.global(). IRuleRepository.saveMany() batch. Idempotent по uuid (findByUuid). Input DTO содержит доменные типы — маппинг делает driving adapter. Готово, если: для CORE-184 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-185 | Реализовать seedPromptTemplatesUseCase | TODO | Не начато | Реализация: `application/use-cases/prompt/seed-prompt-templates.use-case.ts`. IUseCase<ISeedPromptTemplateItem[], ISeedResult>. PromptTemplateFactory.create() → IPromptTemplateRepository.save(). Idempotent по name (findByName). Validates content через PromptEngineService. Готово, если: для CORE-185 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.39.0 — Rule Context Formatting

> Domain services для форматирования правил и сборки промптов из секций.

> **Результат версии:** Завершена версия «v0.39.0 — Rule Context Formatting» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-186 | Реализовать ruleContextFormatterService | TODO | Не начато | Реализация: `domain/services/rule-context-formatter.service.ts`. Domain service. formatForPrompt(rules: Rule[]): string — конвертирует Rule[] в текст для инъекции в промпт (title, rule, severity, examples). formatCategorySection(rules: Rule[], category: string): string — фильтрует по bucket и форматирует. Готово, если: для CORE-186 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-187 | Реализовать reviewPromptAssemblerService | TODO | Не начато | Реализация: `domain/services/review-prompt-assembler.service.ts`. Domain service. assembleSections(overrides, defaults): string — собирает финальный промпт из секций: categories (bug/perf/security), severity flags (critical/high/medium/low), generation instructions, rule context. Override приоритет: overrides > defaults. Готово, если: для CORE-187 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-188 | Реализовать iPromptOverrides в IReviewConfig | TODO | Не начато | Реализация: Расширить `IReviewConfig` DTO. Добавить `v2PromptOverrides?: { categories?: { descriptions?: { bug?: string, performance?: string, security?: string } }, severity?: { flags?: { critical?: string, high?: string, medium?: string, low?: string } }, generation?: { main?: string } }`. Обратная совместимость: поле optional. Готово, если: для CORE-188 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.40.0 — Stage-Prompt Интеграция

> Замена hardcoded промптов в stages на PromptTemplate-driven с fallback chain.

> **Результат версии:** Завершена версия «v0.40.0 — Stage-Prompt Integration» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-189 | Реализовать processFilesReviewStage → PromptTemplate | TODO | Не начато | Реализация: Рефакторинг: getSystemPrompt() использует GeneratePromptUseCase. Fallback chain: PromptTemplate (org → global) → config.promptOverrides → hardcoded DEFAULT_SYSTEM_PROMPT. Constructor DI: добавить GeneratePromptUseCase. Inject ReviewPromptAssemblerService для сборки секций. Готово, если: для CORE-189 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-190 | Реализовать processCcrLevelReviewStage → PromptTemplate | TODO | Не начато | Реализация: Аналогично CORE-189 для CCR-level. Template name: "ccr-level-review". Inject RuleContextFormatterService для правил. Готово, если: для CORE-190 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-191 | Реализовать generateSummaryStage → PromptTemplate | TODO | Не начато | Реализация: Добавить PROMPT_OVERRIDE_KEY = "summary". Заменить hardcoded на GeneratePromptUseCase. Template name: "summary". Fallback на hardcoded. Готово, если: для CORE-191 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-192 | Реализовать hallucinationFilter → PromptTemplate | TODO | Не начато | Реализация: Заменить hardcoded SYSTEM_PROMPT на GeneratePromptUseCase. Template name: "hallucination-check". Category: "safeguard". Fallback на текущий hardcoded. Готово, если: для CORE-192 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-193 | Реализовать rules integration в review stages | TODO | Не начато | Реализация: ProcessFilesReviewStage + ProcessCcrLevelReviewStage: загрузить enabled rules через GetEnabledRulesUseCase → форматировать через RuleContextFormatterService → inject в template variable {{rules}}. Пустые rules → секция rules отсутствует в промпте. Готово, если: для CORE-193 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.40.1 — Shared Utilities Refactoring

> Рефакторинг: вынос дублированного кода в `application/shared/`, unified CATEGORY_WEIGHTS, Level 2 для

> **Результат версии:** Завершена версия «v0.40.1 — Shared Utilities Refactoring» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> HallucinationFilter, удаление мёртвого кода.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-194 | Реализовать extract severity normalization to shared | TODO | Не начато | Реализация: `application/shared/severity-normalization.ts`. normalizeSeverity() с logger.warn при невалидном severity. 6 тестов. Готово, если: для CORE-194 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-195 | Реализовать extract category weights to shared | TODO | Не начато | Реализация: `application/shared/category-weights.ts`. Единый CATEGORY_WEIGHTS: 13 LLM + 45 seed slug + 7 stack категорий. 4 теста. Готово, если: для CORE-195 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-196 | Реализовать extract prompt override variables to shared | TODO | Не начато | Реализация: `application/shared/prompt-override-variables.ts`. OVERRIDE_VARIABLE_MAP + mapOverridesToVariables. 4 теста. Готово, если: для CORE-196 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-197 | Реализовать extract suggestion parsing to shared | TODO | Не начато | Реализация: `application/shared/suggestion-parsing.ts`. parseSuggestions, parseFromToolCalls, parseFromContent, extractJsonArray. 10 тестов. Готово, если: для CORE-197 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-198 | Реализовать extract suggestion enrichment to shared | TODO | Не начато | Реализация: `application/shared/suggestion-enrichment.ts`. enrichSuggestions, parseRawSuggestionFields, resolveFilePath, resolveLineRange. 13 тестов. Готово, если: для CORE-198 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-199 | Реализовать extract prompt resolution to shared | TODO | Не начато | Реализация: `application/shared/prompt-resolution.ts`. resolveSystemPrompt, resolveRuleContext, appendRuleContext. 11 тестов. Готово, если: для CORE-199 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-200 | Реализовать add hallucinationCheck to IPromptOverrides.templates | TODO | Не начато | Реализация: Расширение `IPromptOverrides.templates` в `review-config.dto.ts`. Typecheck проходит. Готово, если: для CORE-200 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-201 | Реализовать refactor ProcessFilesReviewStage to use shared | TODO | Не начато | Реализация: Удалено ~240 строк дублированного кода. 25 существующих тестов проходят без изменений. Готово, если: для CORE-201 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-202 | Реализовать refactor ProcessCcrLevelReviewStage to use shared | TODO | Не начато | Реализация: Удалено ~250 строк дублированного кода. 23 существующих тестов проходят без изменений. Готово, если: для CORE-202 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-203 | Реализовать refactor GenerateSummaryStage to use shared | TODO | Не начато | Реализация: Заменён private resolveSystemPrompt на shared. 12 существующих тестов проходят без изменений. Готово, если: для CORE-203 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-204 | Реализовать refactor HallucinationFilter to use shared + Level 2 | TODO | Не начато | Реализация: Трёхуровневый fallback (PromptTemplate → hallucinationCheck config → hardcoded). +1 новый тест. 16 тестов. Готово, если: для CORE-204 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-205 | Реализовать remove dead ReviewPromptAssemblerService | TODO | Не начато | Реализация: Удалён service + Очищены экспорты из `domain/services/index.ts`. Готово, если: для CORE-205 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-206 | Реализовать barrel exports и TODO.md | TODO | Не начато | Реализация: `application/shared/index.ts`. Обновлён TODO.md. Готово, если: для CORE-206 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-207 | Реализовать extract SUGGESTION_TOOL в shared | TODO | Не начато | Реализация: `application/shared/suggestion-tool.ts`. Убраны дубликаты из обоих stages. Экспорт через shared/index.ts. Готово, если: для CORE-207 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-208 | Удалить inline fallback промпты из 4 файлов | TODO | Не начато | Реализация: Удалены DEFAULT_SYSTEM_PROMPT из ProcessCcrLevelReview, ProcessFilesReview, GenerateSummary, HallucinationFilter. `defaultPrompt` в IPromptResolutionConfig → optional. Level 3 бросает ошибку. Готово, если: для CORE-208 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-209 | Реализовать iCategoryWeightProvider порт + GetCategoryWeightsUseCase | TODO | Не начато | Реализация: Порт `application/ports/outbound/rules/category-weight-provider.ts`. UseCase `application/use-cases/rules/get-category-weights.use-case.ts`. DTO. Токен `TOKENS.Rules.CategoryWeightProvider`. CATEGORY_WEIGHTS → seed `infrastructure/data/seed/rules/category-weight-seeds.ts`. Готово, если: для CORE-209 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-210 | Реализовать iReviewStageDeps + рефакторинг конструкторов stages | TODO | Не начато | Реализация: `application/shared/review-stage-deps.ts`. ProcessCcrLevelReviewStage и ProcessFilesReviewStage принимают один `deps: IReviewStageDeps`. 0 lint warnings. Готово, если: для CORE-210 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.41.0 — RuleCategory Weights & System Settings

> Поле weight на RuleCategory entity. ISystemSettingsProvider порт для key-value конфигурации. CCR summary промпты →

> **Результат версии:** Завершена версия «v0.41.0 — RuleCategory Weights & System Settings» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> seed. Stages получают данные из БД.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-211 | Реализовать weight field на RuleCategory entity | TODO | Не начато | Реализация: `weight: number` (default 0) в IRuleCategoryProps. Валидация weight >= 0. Getter. RuleCategoryFactory: create + reconstitute. Seed data: merge CATEGORY_WEIGHT_SEEDS → RULE_CATEGORY_SEEDS (41 из 46 с weight > 0). Тесты entity (+5), factory (+3), seeds (+3). Готово, если: для CORE-211 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-212 | Обновить IRuleCategoryRepository | TODO | Не начато | Реализация: `findAllWithWeights(): Promise<{slug: string, weight: number}[]>`. Готово, если: для CORE-212 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-213 | Реализовать iSystemSettingsProvider порт | TODO | Не начато | Реализация: `application/ports/outbound/common/system-settings-provider.ts`. Interface: `get<T>`, `getMany`. Токен `TOKENS.Common.SystemSettingsProvider`. Готово, если: для CORE-213 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-214 | Реализовать getSystemSettingUseCase | TODO | Не начато | Реализация: `application/use-cases/common/get-system-setting.use-case.ts`. IUseCase<IGetSystemSettingInput, IGetSystemSettingOutput>. Готово, если: для CORE-214 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-215 | Реализовать system settings seed data | TODO | Не начато | Реализация: `infrastructure/data/seed/settings/system-setting-seeds.ts`. 5 seeds: review.defaults, review.binary_extensions, review.blocking_severities, detection.false_positive_thresholds, llm_category_weights. Готово, если: для CORE-215 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-216 | Реализовать refactor GetCategoryWeightsUseCase | TODO | Не начато | Реализация: Merge: RuleCategory weights (findAllWithWeights) + LLM weights (ISystemSettingsProvider `llm_category_weights`). Готово, если: для CORE-216 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-217 | Реализовать CCR summary промпты → prompt_templates seed | TODO | Не начато | Реализация: 2 seed шаблона: `ccr-summary-default-system`, `ccr-summary-complement-system`. PROMPT_SEED_REGISTRY 21→23. GenerateCCRSummaryUseCase: wire через GeneratePromptUseCase с fallback. Готово, если: для CORE-217 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-218 | Реализовать wire stages/use-cases на system settings | TODO | Не начато | Реализация: FileContextGateStage, RequestChangesOrApproveStage, ResolveConfigStage, DetectFalsePositivesUseCase — все подключены к ISystemSettingsProvider с fallback на hardcoded. Тесты каждого (+10 тестов). Готово, если: для CORE-218 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-219 | Реализовать seedSystemSettingsUseCase | TODO | Не начато | Реализация: `application/use-cases/common/seed-system-settings.use-case.ts`. IUseCase<ISeedSystemSettingItem[], ISeedResult>. ISystemSettingsWriter порт (ISP). Idempotent по key. 5 тестов. Готово, если: для CORE-219 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-220 | Реализовать barrel exports и TODO.md | TODO | Не начато | Реализация: ISeedSystemSettingItem, ISystemSettingsWriter, SeedSystemSettingsUseCase → barrel exports. Мёртвый код не обнаружен. TODO.md обновлён. Готово, если: для CORE-220 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.42.0 — Admin CRUD Use Cases

> CRUD use cases для управления всеми настройками через Admin API. Заменяет seed use cases — данные

> **Результат версии:** Завершена версия «v0.42.0 — Admin CRUD Use Cases» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> создаются/обновляются через API, не через код. Бог-админ управляет через админ-панель.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-221 | Реализовать cRUD use cases для PromptTemplates | TODO | Не начато | Реализация: CreatePromptTemplateUseCase, UpdatePromptTemplateUseCase, DeletePromptTemplateUseCase, ListPromptTemplatesUseCase, GetPromptTemplateByIdUseCase. DTO: input/output для каждого. Порты: расширить IPromptTemplateRepository (update, delete, findAll). TDD. Готово, если: для CORE-221 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-222 | Реализовать cRUD use cases для RuleCategories | TODO | Не начато | Реализация: CreateRuleCategoryUseCase, UpdateRuleCategoryUseCase, DeleteRuleCategoryUseCase, ListRuleCategoriesUseCase. Включая weight field. Порты: расширить IRuleCategoryRepository (update, delete, findAll). TDD. Готово, если: для CORE-222 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-223 | Реализовать cRUD use cases для Rules (Library Rules) | TODO | Не начато | Реализация: CreateRuleUseCase, UpdateRuleUseCase, DeleteRuleUseCase, ListRulesUseCase, GetRuleByIdUseCase. Порты: расширить IRuleRepository (update, delete, findAll с фильтрацией). TDD. Готово, если: для CORE-223 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-224 | Реализовать cRUD use cases для SystemSettings | TODO | Не начато | Реализация: UpsertSystemSettingUseCase, GetSystemSettingUseCase, ListSystemSettingsUseCase, DeleteSystemSettingUseCase. Порты: ISystemSettingsRepository (CRUD). Отличие от ISystemSettingsProvider (read-only): полный CRUD. TDD. Готово, если: для CORE-224 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-225 | Реализовать bulk import use cases | TODO | Не начато | Реализация: ImportPromptTemplatesUseCase, ImportRulesUseCase, ImportRuleCategoriesUseCase, ImportSystemSettingsUseCase. Принимают массив, идемпотентный upsert. DTO: batch input + IImportResult output. Используются migration script. TDD. Готово, если: для CORE-225 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-226 | Удалить seed use cases из core | TODO | Не начато | Реализация: Удалены SeedRuleCategoriesUseCase, SeedLibraryRulesUseCase, SeedPromptTemplatesUseCase, SeedSystemSettingsUseCase. Удалены seed DTO. Заменены на Import use cases из CORE-225. Очищены barrel exports. Готово, если: для CORE-226 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-227 | Реализовать barrel exports и документация | TODO | Не начато | Реализация: Обновлены все index.ts. Экспорт новых CRUD + Import use cases. Удалён мёртвый код. TODO.md обновлён. Готово, если: для CORE-227 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.43.0 — Admin API Endpoints

> HTTP endpoints для Admin Panel. Driving adapter в `@codenautic/runtime` (api). Полный CRUD на все seed-управляемые сущности.

> **Результат версии:** Завершена версия «v0.43.0 — Admin API Endpoints» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> Аутентификация: бог-админ роль.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-001 | Реализовать admin PromptTemplate endpoints | TODO | Не начато | Реализация: POST/PUT/DELETE/GET /api/admin/prompts. NestJS controller. Валидация входных данных (zod). Вызов CRUD use cases из core. Guard: admin role. Тесты e2e. Готово, если: для API-001 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| API-002 | Реализовать admin RuleCategory endpoints | TODO | Не начато | Реализация: POST/PUT/DELETE/GET /api/admin/categories. Включая weight. Тесты e2e. Готово, если: для API-002 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| API-003 | Реализовать admin Rules endpoints | TODO | Не начато | Реализация: POST/PUT/DELETE/GET /api/admin/rules. Фильтрация по language, scope, bucket. Пагинация. Тесты e2e. Готово, если: для API-003 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| API-004 | Реализовать admin SystemSettings endpoints | TODO | Не начато | Реализация: PUT/GET/DELETE /api/admin/settings. List с фильтрацией по prefix. Тесты e2e. Готово, если: для API-004 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| API-005 | Реализовать bulk import endpoints | TODO | Не начато | Реализация: POST /api/admin/import/prompts, /import/rules, /import/categories, /import/settings. Принимают JSON массив. Вызывают Import use cases. Response: {created, skipped, errors}. Тесты e2e. Готово, если: для API-005 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| API-006 | Реализовать admin auth guard | TODO | Не начато | Реализация: AdminRoleGuard. Проверка роли god-admin. 403 для обычных пользователей. Готово, если: для API-006 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.44.0 — Migration Script & Default Data

> CLI migration script для первоначальной загрузки данных. Вызывает Admin API /import endpoints. JSON файлы с defaults

> **Результат версии:** Завершена версия «v0.44.0 — Migration Script & Default Data» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.
> хранятся в репо.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| MIG-001 | Реализовать default data JSON файлы | TODO | Не начато | Реализация: Перенести seed данные из `core/infrastructure/data/seed/` в `migrations/defaults/`. JSON формат: prompts.json, rules.json, categories.json, settings.json. Включая все текущие seeds. Готово, если: для MIG-001 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| MIG-002 | Реализовать cLI migration script | TODO | Не начато | Реализация: `bun run migrate:seed` — читает JSON из migrations/defaults/, вызывает Admin API /import endpoints. Idempotent. Отчёт: created/skipped/errors. Конфиг: API_URL, ADMIN_TOKEN из env. Готово, если: для MIG-002 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| MIG-003 | Удалить seed data из core | TODO | Не начато | Реализация: Удалить `core/infrastructure/data/seed/`. Очистить barrel exports. Тесты core проходят без seed data. Seed data живёт только в migrations/defaults/. Готово, если: для MIG-003 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| MIG-004 | Реализовать cI/CD integration | TODO | Не начато | Реализация: Документация: как запускать migration при деплое. Docker entrypoint или CI step. Health check: API доступно перед migration. Retry логика. Готово, если: для MIG-004 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.44.1 — ExpertPanel Stage Wiring

> Подключение ExpertPanel из persistence в review стейджи через prompt-resolution.

> **Результат версии:** Завершена версия «v0.44.1 — ExpertPanel Stage Wiring» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-228 | Реализовать wire ExpertPanel в ProcessFiles/CcrLevel stages | TODO | Не начато | Реализация: IReviewStageDeps: optional expertPanelRepository. ProcessFilesReviewStage + ProcessCcrLevelReviewStage: expertPanelName "safeguard" в PROMPT_CONFIG, expertPanelRepository в promptDeps. Тесты проходят (optional dep, undefined = skip). 0 lint ошибок. Готово, если: для CORE-228 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.44.2 — Seed Cleanup

> Удаление последних hardcoded данных из core: fallback-промпты CCR Summary и дублированные mention-команды.

> **Результат версии:** Завершена версия «v0.44.2 — Seed Cleanup» в рамках M05; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-229 | Удалить fallback промпты из GenerateCCRSummaryUseCase | TODO | Не начато | Реализация: Удалить `FALLBACK_DEFAULT_SYSTEM_PROMPT` и `FALLBACK_COMPLEMENT_SYSTEM_PROMPT` из `generate-ccr-summary.use-case.ts`. Шаблоны `ccr-summary-default-system` и `ccr-summary-complement-system` уже в seed (CORE-217). Level 3 fallback → бросает ошибку (аналогично CORE-208). Готово, если: для CORE-229 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-230 | Реализовать дедупликация mention-команд → system settings seed | TODO | Не начато | Реализация: Вынести `["review", "explain", "fix", "summary", "help", "config"]` в `migrations/defaults/settings.json` под ключ `mention.available_commands`. Добавить загрузку через `ISystemSettingsProvider.get<string[]>("mention.available_commands")` в `MentionParserService` и `ExecuteMentionCommandUseCase`. Удалить `VALID_COMMANDS` и `ALL_COMMANDS` hardcoded массивы. Fallback на hardcoded при недоступности settings. Готово, если: для CORE-230 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
