# Context Map v1

> Source of truth для границ контекстов и ACL-переходов в CodeNautic.

## Bounded Contexts

| Context | Назначение | Upstream | Downstream | ACL Boundary |
|---|---|---|---|---|
| `Core Domain` (`@codenautic/core`) | Aggregate, Value Objects, Domain Events, Use Cases, Ports | Нет (источник доменной модели) | `Adapters`, `Runtime` | Не принимает внешние SDK-типы |
| `Adapters` (`@codenautic/adapters`) | Provider integrations и anti-corruption mapping | `Git/LLM/Context/Notification external APIs` | `Core Domain`, `Runtime` | Каждый провайдер маппит external DTO -> core contracts |
| `Runtime` (`@codenautic/runtime`) | Composition roots, workers, API, event orchestration, pipeline run execution | `Core Domain`, `Adapters`, messaging storage | `UI`, external webhook consumers | Только через порты/контракты core |
| `UI` (`@codenautic/ui`) | Dashboard, review/workflow interfaces | `Runtime API` | Конечные пользователи | HTTP boundary, без прямых импортов core/adapters |

## Upstream/Downstream Graph

```mermaid
flowchart LR
    EXT["External Systems
(Git, LLM, Jira, Slack)"]
    ADP["Adapters Context"]
    CORE["Core Domain Context"]
    RUNTIME["Runtime Context"]
    UI["UI Context"]
    USERS["Users / Teams"]

    EXT --> ADP
    ADP --> CORE
    CORE --> RUNTIME
    ADP --> RUNTIME
    RUNTIME --> UI
    UI --> USERS
```

## ACL Rules

1. Внешние SDK-типы не проходят в `core` напрямую.
2. Каждый integration adapter обязан иметь отдельный ACL-мэппинг слой.
3. `runtime` использует только контракты `@codenautic/core`, а не external provider SDK.
4. Любой новый upstream интегрируется через `@codenautic/adapters`, а не напрямую в `core` или `ui`.

## Pipeline Responsibility Boundary

1. `core` определяет `PipelineDefinition`, stage contracts и `definitionVersion`-совместимость.
2. `runtime` исполняет `PipelineRun` через orchestrator, сохраняет checkpoint и обеспечивает resume/retry.
3. Порядок stage не хардкодится в runtime worker; используется версия definition из core-контракта.
4. In-flight run остаётся на версии definition, с которой был запущен (pinning).

## Change Policy

1. Изменение границ контекстов требует ADR.
2. Изменение ACL-правил требует обновления `packages/core/todo/*` и `packages/adapters/todo/*` ссылок.
3. Breaking change контракта между контекстами требует migration plan и versioning note.
