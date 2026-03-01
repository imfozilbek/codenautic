# @codenautic/adapters

Infrastructure layer for CodeNautic — providers, adapters, and shared infrastructure.

## Domains

> Домены перечислены как логические модули. Точные внутренние пути могут меняться по мере реализации.

| Domain | Description |
|--------|-------------|
| **Git** | GitHub, GitLab, Azure DevOps, Bitbucket ACL adapters |
| **LLM** | OpenAI, Anthropic, Google, Groq, OpenRouter, Cerebras adapters |
| **Context** | Jira, Linear, Sentry, Asana, ClickUp adapters |
| **Notifications** | Slack, Discord, Teams, Email, Webhook delivery |
| **AST** | Tree-sitter parsing, Code Graph, PageRank, Impact Analysis |
| **Messaging** | Outbox/Inbox pattern, Redis Streams |
| **Worker** | BullMQ adapters, Redis, DLQ, graceful shutdown |
| **Database** | MongoDB schemas, repository implementations |

## Architecture

All domains implement the **Anti-Corruption Layer** pattern — external types never penetrate the domain layer.

```
@codenautic/core (ports, interfaces)
       ↓
@codenautic/adapters (implementations)
       ↓
@codenautic/runtime (composition roots)
```

## Imports

```typescript
import { registerGitModule } from "@codenautic/adapters/git"
import { registerLlmModule } from "@codenautic/adapters/llm"
import { registerWorkerModule } from "@codenautic/adapters/worker"
```

## Commands

```bash
cd packages/adapters && bun run build
cd packages/adapters && bun run lint
cd packages/adapters && bun test
cd packages/adapters && bun run format
cd packages/adapters && bun run typecheck
```

## Task Tracking

- Milestone index: [`TODO.md`](./TODO.md)
- Split milestones: [`todo/`](./todo/)
