## Инфраструктура: процессы, коммуникация, зависимости

### Процессы (PM2)

9 процессов из 4 пакетов. Все серверные процессы — в одном пакете `@codenautic/runtime`.

```mermaid
graph LR
    subgraph PM2["PM2 Process Manager — 9 процессов"]
        direction TB
        api["[0] api :3000\nNestJS"]
        webhooks["[1] webhooks :3001\nHTTP"]
        rw["[2] review-worker\npipeline"]
        sw["[3] scan-worker\nindexing"]
        aw["[4] agent-worker\nconversation"]
        nw["[5] notification-worker\nnotify"]
        anw["[6] analytics-worker\nmetrics"]
        sch["[7] scheduler\ncron"]
        mcp_proc["[8] mcp\nstdio/SSE"]
    end

    ui_client["ui :3002\nVite + React"]

    style PM2 fill:#374151,stroke:#1f2937,color:#fff
    style api fill:#2b7a4b,stroke:#1a5c36,color:#fff
    style webhooks fill:#c4841d,stroke:#96651a,color:#fff
    style rw fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style sw fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style aw fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style nw fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style anw fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style sch fill:#7b4ea3,stroke:#5c3a7d,color:#fff
    style ui_client fill:#c4841d,stroke:#96651a,color:#fff
    style mcp_proc fill:#b44c4c,stroke:#8c3333,color:#fff
```

| # | Процесс                 | Пакет    | Команда запуска                          | Что делает                                  |
|---|-------------------------|----------|-------------------------------------|---------------------------------------------|
| 0 | **api**                 | `runtime` | `bun run start:api`                 | HTTP API, NestJS, composition root          |
| 1 | **webhooks**            | `runtime` | `bun run start:webhooks`            | Приём webhooks, verify signature, publish   |
| 2 | **review-worker**       | `runtime` | `bun run start:review-worker`       | 20-stage pipeline, SafeGuard, Expert Panel  |
| 3 | **scan-worker**         | `runtime` | `bun run start:scan-worker`         | Repo indexing, AST, Code Graph, CodeCity    |
| 4 | **agent-worker**        | `runtime` | `bun run start:agent-worker`        | Conversation Agent, CCR Summary, @mentions  |
| 5 | **notification-worker** | `runtime` | `bun run start:notification-worker` | Notifications, Report delivery              |
| 6 | **analytics-worker**    | `runtime` | `bun run start:analytics-worker`    | Metrics, Feedback, Causal Analysis, Drift   |
| 7 | **scheduler**           | `runtime` | `bun run start:scheduler`           | Cron: reports, drift scans, health, sprints |
| 8 | **mcp**                 | `runtime` | `bun run start:mcp`                 | IDE integration (stdio/SSE)                 |

### Домены adapters

| Домен         | Роль                                          |
|---------------|-----------------------------------------------|
| **git**       | ACL для GitHub/GitLab/Azure/Bitbucket API     |
| **llm**       | ACL для OpenAI/Anthropic/Google/Groq          |
| **context**   | ACL для Jira/Linear/Sentry/Asana              |
| **notifications** | ACL для Slack/Discord/Teams/Email/Webhook |
| **ast**       | Tree-sitter парсинг, AST-анализ кода          |
| **messaging** | Outbox/Inbox, абстракция над Redis Streams    |
| **worker**    | Shared BullMQ infrastructure                  |
| **database**  | MongoDB schemas, repositories                 |

### Очереди (BullMQ / Redis Streams)

| Очередь              | Producer                                      | Consumer            | Данные                    |
|----------------------|-----------------------------------------------|---------------------|---------------------------|
| `review.trigger`     | webhooks, api                                 | review-worker       | MR id, config             |
| `review.retry`       | review-worker                                 | review-worker       | Retry failed stage        |
| `scan.repo`          | api, webhooks                                 | scan-worker         | Repository id             |
| `scan.update`        | webhooks                                      | scan-worker         | Incremental update (push) |
| `agent.conversation` | webhooks                                      | agent-worker        | @mention event            |
| `agent.summary`      | webhooks, api                                 | agent-worker        | CCR summary request       |
| `notify.send`        | review-worker, agent-worker, analytics-worker | notification-worker | Notification payload      |
| `report.deliver`     | scheduler                                     | notification-worker | Report config             |
| `analytics.metrics`  | review-worker                                 | analytics-worker    | Review metrics            |
| `analytics.feedback` | api                                           | analytics-worker    | User feedback             |
| `analytics.drift`    | scheduler                                     | analytics-worker    | Drift scan trigger        |

### Коммуникация между процессами

```mermaid
flowchart TD
    subgraph external["Внешний мир"]
        GIT["Git Platforms\nGitHub, GitLab, Azure, Bitbucket"]
        BROWSER["Браузер"]
        IDE_EXT["IDE"]
    end

    subgraph server_pkg["@codenautic/runtime"]
        API["api :3000\nNestJS DI"]
        WH["webhooks :3001\nContainer"]
        RW["review-worker"]
        SW["scan-worker"]
        AW["agent-worker"]
        NW["notification-worker"]
        ANW["analytics-worker"]
        SCH["scheduler"]
        MCP_SRV["mcp"]
    end

    WEB["@codenautic/ui :3002"]
    MSG["@codenautic/adapters\nmessaging (Redis)"]
    DB["MongoDB + Qdrant"]

    GIT -->|webhook POST| WH
    BROWSER -->|HTTP| WEB
    IDE_EXT -->|stdio / SSE| MCP_SRV

    WEB -->|HTTP| API

    WH & API & SCH -->|publish| MSG
    MSG -->|consume| RW & SW & AW & NW & ANW

    RW & SW & AW & ANW -->|publish| MSG
    RW & SW & ANW --> DB
    API --> DB

    style external fill:#6b7280,stroke:#4b5563,color:#fff
    style server_pkg fill:#2b7a4b,stroke:#1a5c36,color:#fff
    style WEB fill:#c4841d,stroke:#96651a,color:#fff
    style MSG fill:#7b4ea3,stroke:#5c3a7d,color:#fff
    style DB fill:#b44c4c,stroke:#8c3333,color:#fff
```

### Каналы коммуникации

| Откуда                                      | Куда            | Канал                                           | Что передаёт |
|---------------------------------------------|-----------------|-------------------------------------------------|--------------|
| **webhooks** → workers                      | Redis (BullMQ)  | review.trigger, scan.update, agent.conversation |
| **api** → workers                           | Redis (BullMQ)  | scan.repo, agent.summary, analytics.feedback    |
| **scheduler** → workers                     | Redis (BullMQ)  | report.deliver, analytics.drift                 |
| **review-worker** → **notification-worker** | Redis (BullMQ)  | notify.send (review done)                       |
| **review-worker** → **analytics-worker**    | Redis (BullMQ)  | analytics.metrics                               |
| workers → **MongoDB/Qdrant**                | Direct DB write | Результаты анализа                              |
| **ui** → **api**                            | HTTP (REST)     | Запросы от пользователя                         |
| **mcp** → **api**                           | HTTP (REST)     | IDE-интеграция                                  |
| **api** → **MongoDB/Redis**                 | Direct          | Чтение данных, кеш                              |

**Принципы:**

- **Синхронно (HTTP):** только `ui → api` и `mcp → api`
- **Асинхронно (BullMQ):** всё остальное — через очереди
- **Прямого общения между процессами нет** — всё через Redis или DB
- **webhooks** должен ответить GitHub за 10 секунд — только publish в очередь и 200
- **scheduler** только публикует задачи — не обрабатывает сам
- **api** не знает о workers напрямую — читает готовые результаты из БД
- Каждый процесс масштабируется **независимо** через PM2

### Граф зависимостей (пакеты)

```
core (0 зависимостей)
  ↓
adapters (зависит от core)
  ↓
runtime (зависит от core + adapters)

ui (HTTP → runtime)
```

### Какие домены adapters подключает каждый процесс

```
                     git  llm  ctx  notif  ast  msg  worker  db
api                   ✓    ✓    ✓     ✓     ✓    ✓     ✓     ✓
webhooks              ✓    ·    ·     ·     ·    ✓     ·     ·
review-worker         ✓    ✓    ✓     ·     ·    ✓     ✓     ✓
scan-worker           ✓    ·    ·     ·     ✓    ✓     ✓     ✓
agent-worker          ✓    ✓    ✓     ·     ·    ✓     ✓     ·
notification-worker   ·    ·    ·     ✓     ·    ✓     ✓     ·
analytics-worker      ·    ·    ✓     ·     ·    ✓     ✓     ·
scheduler             ·    ·    ·     ·     ·    ✓     ✓     ✓
mcp                   ·    ·    ·     ·     ·    ·     ·     ·
```

`✓` = подключает через DI, `·` = не использует

### Поток данных (review pipeline)

```mermaid
sequenceDiagram
    participant GH as GitHub / GitLab
    participant WH as webhooks
    participant INFRA as adapters/git
    participant MSG as adapters/messaging
    participant RW as review-worker
    participant LLM as adapters/llm
    participant CTX as adapters/context
    participant DB as MongoDB
    participant NW as notification-worker
    participant NF as adapters/notifications
    participant ANW as analytics-worker
    participant API as api
    participant WEB as ui

    GH->>WH: webhook POST (MR opened)
    WH->>INFRA: verify signature + parse payload
    WH->>MSG: publish review.trigger

    MSG->>RW: consume review.trigger
    RW->>INFRA: fetch diff (Git API)
    RW->>CTX: fetch context (Jira / Linear)
    RW->>LLM: analyze (OpenAI / Anthropic)
    RW->>DB: save review result
    RW->>INFRA: post comments to MR
    RW->>MSG: publish notify.send
    RW->>MSG: publish analytics.metrics

    MSG->>NW: consume notify.send
    NW->>NF: send (Slack / Discord)

    MSG->>ANW: consume analytics.metrics
    ANW->>DB: update metrics

    WEB->>API: HTTP request
    API->>DB: read review result
    API-->>WEB: response
```
