# Ubiquitous Language v1

> Source of truth для доменных терминов CodeNautic.

## Словарь терминов

| Term | Определение | Owner | Change Policy |
|---|---|---|---|
| `Review` | Aggregate проверки MR/PR с lifecycle и severity budget | Core Domain Team | Изменения через ADR + обновление aggregate/tests |
| `Rule` | Aggregate пользовательского правила с lifecycle `draft/active/inactive/archived` | Core Domain Team | Изменения через policy + migration note |
| `Severity Budget` | Лимиты по `high/medium/low` для конкретного review | Core Domain Team | Любое изменение модели требует backward-compatibility review |
| `Domain Event` | Immutable событие в past tense о факте изменения aggregate | Platform Architecture | Новое событие добавляется в `domain-events-catalog.md` |
| `ACL` | Anti-corruption слой между внешним API и доменными контрактами | Adapters Team | Любая интеграция обязана иметь ACL-mapping contract tests |
| `Use Case` | Application orchestrator без бизнес-логики условий; pipeline stage реализуется как отдельный use case | Application Team | Бизнес-правила только в domain; use case меняется через test-first |
| `PipelineDefinition` | Версионированное описание порядка и состава stage в review pipeline | Core + Runtime Architecture | Изменение порядка stage только через новую версию definition |
| `DefinitionVersion` | Версия `PipelineDefinition`, которая pin-ится на старте `PipelineRun` | Core + Runtime Architecture | In-flight run не переключается на новую версию автоматически |
| `PipelineRun` | Экземпляр выполнения pipeline с `runId`, `definitionVersion`, текущим stage и trace | Runtime Team | Любой retry/resume обязан сохранять ссылку на исходную `definitionVersion` |
| `StageCheckpoint` | Снимок прогресса после stage (`lastCompletedStage`, `attempt`, `status`) для resume/retry | Runtime Team | Checkpoint обязателен после каждого stage transition |
| `Outbox` | Персистентный буфер событий для надёжной публикации | Runtime Team | Изменения только с idempotency strategy |
| `Inbox Deduplication` | Проверка повторной обработки сообщения по ключу идемпотентности | Runtime Team | Запрещены изменения, нарушающие repeat-safe semantics |
| `CCR` | Change Context Radius — доменный контекст влияния изменения | Product + Architecture | Изменения формулы/смысла фиксируются в product ADR |
| `SafeGuard` | Контур фильтрации ложноположительных/галлюцинационных сигналов | Product + Core Domain | Любой критерий требует измеримого acceptance baseline |

## Нейминг и язык

1. Domain events именуются в past tense (`ReviewCompleted`, `RuleActivated`).
2. Aggregate и Value Object именуются как существительные (`Review`, `Rule`, `UniqueId`).
3. Use case именуется как действие + `UseCase` (`CompleteReviewUseCase`).
4. Термин не вводится в код, пока не добавлен в этот словарь.

## Процесс обновления

1. Автор изменения обновляет этот файл в том же PR.
2. Owner термина валидирует семантику.
3. При breaking-изменениях фиксируется ADR и migration note.
