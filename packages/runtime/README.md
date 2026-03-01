# @codenautic/runtime

Server layer for CodeNautic — API, Webhooks, Workers, Scheduler, MCP.

## Processes (PM2)

> Список ниже фиксирует состав процессов и команды запуска. Конкретные внутренние пути/файлы считаются деталями реализации и могут меняться.

| # | Process | Run Script | Description |
|---|---------|------------|-------------|
| 0 | **api** | `bun run start:api` | HTTP API, NestJS, composition root |
| 1 | **webhooks** | `bun run start:webhooks` | Webhook receiver, verify signature, publish to queue |
| 2 | **review-worker** | `bun run start:review-worker` | 20-stage pipeline, SafeGuard, Expert Panel |
| 3 | **scan-worker** | `bun run start:scan-worker` | Repository indexing, AST, Code Graph, CodeCity |
| 4 | **agent-worker** | `bun run start:agent-worker` | Conversation Agent, CCR Summary, @mentions |
| 5 | **notification-worker** | `bun run start:notification-worker` | Notification delivery, Report delivery |
| 6 | **analytics-worker** | `bun run start:analytics-worker` | Metrics, Feedback, Causal Analysis, Drift |
| 7 | **scheduler** | `bun run start:scheduler` | Cron: reports, drift scans, health, sprints |
| 8 | **mcp** | `bun run start:mcp` | IDE integration (stdio/SSE) |

## Architecture

- **api** uses NestJS DI (composition root for all providers)
- **workers** use Container from `@codenautic/core`
- Each process scales independently via PM2

```
@codenautic/core → @codenautic/adapters → @codenautic/runtime
```

## Commands

```bash
cd packages/runtime && bun run dev:api            # API dev server
cd packages/runtime && bun run start:api           # API production
cd packages/runtime && bun run start:review-worker # Review pipeline
cd packages/runtime && bun run start:scan-worker   # Repo indexing
cd packages/runtime && bun run lint
cd packages/runtime && bun test
cd packages/runtime && bun run format
cd packages/runtime && bun run typecheck
```

## Task Tracking

- Milestone index: [`TODO.md`](./TODO.md)
- Split milestones: [`todo/`](./todo/)
