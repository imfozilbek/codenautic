# CodeNautic

**AI-powered code intelligence platform** — automated code review, architecture analysis, codebase visualization, and
problem zone prediction.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2-black)](https://bun.sh/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## Overview

CodeNautic automatically analyzes merge requests using LLMs and provides developers with contextual feedback. The system
integrates with GitHub, GitLab, Azure DevOps, and Bitbucket, supports multiple AI providers (OpenAI, Anthropic, Google,
Groq), and enriches review context with data from Jira, Linear, Sentry, and other sources.

### How It Works

```mermaid
flowchart LR
    MR["MR/PR\ncreated"] --> WH["Webhook"]
    WH --> CTX["Context\ncollection"]
    CTX --> PIPE["Definition-driven\nAI Pipeline (v1: 20 aliases)"]
    PIPE --> SG["SafeGuard\nfiltering"]
    SG --> COMMENTS["MR/PR\ncomments"]

    CTX -.- CTX_D["Jira / Linear\nSentry context"]
    PIPE -.- PIPE_D["Multi-LLM\nanalysis"]
    SG -.- SG_D["Deduplication\nanti-hallucination"]

    style MR fill:#1a2332,stroke:#334155,color:#94a3b8
    style WH fill:#2d2a1a,stroke:#92400e,color:#fcd34d
    style CTX fill:#1a2440,stroke:#1e40af,color:#93c5fd
    style PIPE fill:#1a2d1a,stroke:#14532d,color:#86efac
    style SG fill:#2d1a1a,stroke:#7f1d1d,color:#fca5a5
    style COMMENTS fill:#1a2332,stroke:#334155,color:#94a3b8
    style CTX_D fill:#1a2332,stroke:#334155,color:#6b7280
    style PIPE_D fill:#1a2332,stroke:#334155,color:#6b7280
    style SG_D fill:#1a2332,stroke:#334155,color:#6b7280
```

1. Git platform sends a webhook when an MR/PR is created
2. CodeNautic collects the diff, linked tasks, and error history
3. Code passes through an orchestrated definition-driven pipeline (v1 has 20 stage aliases)
4. SafeGuard filters hallucinations, duplicates, and irrelevant findings
5. Results are published as comments on the MR/PR
6. The system learns from developer feedback

---

## Features

### Core

- **Definition-Driven Review Pipeline** — orchestrated execution from `PipelineDefinition` (v1 has 20 stage aliases), run version pinning, checkpoint/resume support
- **SafeGuard** — 5 filters to combat AI artifacts: deduplication, anti-hallucination, severity threshold,
  prioritization, relevance check
- **Expert Panel** — multiple LLMs analyze code in parallel, results are aggregated
- **Continuous Learning** — the system learns from team feedback and tracks rule effectiveness
- **Custom Rules** — user-defined review rules with inheritance (organization > project > repository)

### Code Analysis

- **AST Analysis** — Tree-sitter parsing, dependency graph, PageRank, Impact Analysis
- **Architecture Analysis** — cyclic dependency detection, coupling analysis
- **CCR Summary** — automatic AI-generated code change request descriptions

### Interactivity

- **Conversation Agent** — AI agent in CCR comments via @mentions
- **Review Depth Modes** — configurable review depth (quick / standard / deep)
- **Directory-level Config** — different settings for different parts of the codebase

### Platform

- **Multi-Tenancy** — data isolation via OrganizationId
- **RBAC** — 4 roles with CASL authorization
- **Audit Logs** — complete action logging
- **Encryption** — AES-GCM secret encryption

---

## Integrations

| Category      | Available                                                     | Planned                           |
|---------------|---------------------------------------------------------------|-----------------------------------|
| Git Platforms | GitHub, GitLab, Azure DevOps, Bitbucket                       | —                                 |
| LLM Providers | OpenAI, Anthropic, Google, Groq, OpenRouter, Cerebras, Novita | —                                 |
| Context       | Jira, Linear, Sentry, Asana, ClickUp                          | Datadog, Bugsnag, PostHog, Trello, Notion |
| Notifications | Slack, Discord, Teams                                         | —                                 |
| AST Parsers   | TypeScript, JavaScript, Python, Go, Java, Rust, PHP, C#, Ruby | Kotlin                            |

---

## Architecture

Clean Architecture + Hexagonal (Ports & Adapters) + DDD in a monorepo with 4 packages:

```mermaid
flowchart TD
    subgraph packages["packages/ — 4 packages"]
        CORE["core\nDomain + Application + Ports\n0 external dependencies"]

        INFRA["adapters\ngit, llm, context, notifications\nast, messaging, worker, database"]

        SERVER["runtime — 10 PM2 processes\napi (NestJS) · settings-service (config registry) · webhooks\nreview-worker · scan-worker · agent-worker\nnotification-worker · analytics-worker\nscheduler · mcp"]

        WEB["ui\nVite 7, React 19\nTanStack Router"]
    end

    CORE --> INFRA
    INFRA --> SERVER
    SERVER -->|"HTTP"| WEB

    style packages fill:#1a2332,stroke:#334155,color:#94a3b8
    style CORE fill:#2b7a4b,stroke:#1a5c36,color:#fff
    style INFRA fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style SERVER fill:#2b7a4b,stroke:#1a5c36,color:#fff
    style WEB fill:#c4841d,stroke:#96651a,color:#fff
```

**Dependency rule:** Infrastructure -> Application -> Domain. Never the other way around.

### System Overview — 10 PM2 Processes

```mermaid
flowchart TD
    subgraph EXTERNAL["External Systems"]
        direction LR
        GIT["GitHub / GitLab\nAzure DevOps / Bitbucket"]
        BROWSER["Browser"]
        IDE_EXT["IDE\nVS Code / WebStorm / Cursor"]
    end

    subgraph SERVER["@codenautic/runtime — 10 processes"]
        API["api :3000\nNestJS 11"]
        SS["settings-service :3040\nNestJS 11\nconfig registry"]
        WH["webhooks :3001\nverify + route"]
        RW["review-worker\nversioned pipeline execution"]
        SW["scan-worker\nAST + Code Graph"]
        AW["agent-worker\n@mention + CCR summary"]
        NW["notification-worker\nSlack / Discord / Teams"]
        ANW["analytics-worker\nmetrics + drift"]
        SCH["scheduler\ncron producer"]
        MCP_SRV["mcp\nstdio / SSE"]
    end

    INFRA["@codenautic/adapters\ngit · llm · context · notifications\nast · messaging · worker · database"]
    CORE["@codenautic/core\nDomain + Application + Ports"]
    WEB["@codenautic/ui :3002\nVite + React 19"]

    subgraph STORAGE["Data Storage"]
        direction LR
        MONGO[("MongoDB 8")]
        QDRANT[("Qdrant 1.13")]
        REDIS[("Redis 7.4\nStreams + BullMQ")]
    end

    GIT -->|"webhook POST"| WH
    BROWSER -->|"HTTP"| WEB
    IDE_EXT -->|"stdio / SSE"| MCP_SRV

    WEB -->|"HTTP REST"| API

    WH & API & SCH -->|"publish"| REDIS
    REDIS -->|"consume"| RW & SW & AW & NW & ANW

    RW & SW & AW & ANW -->|"publish"| REDIS
    API & RW & SW & ANW --> MONGO
    SW --> QDRANT

    SERVER --> INFRA
    INFRA --> CORE

    style EXTERNAL fill:#1a2332,stroke:#6b7280,color:#d1d5db
    style SERVER fill:#1a2d1a,stroke:#14532d,color:#86efac
    style INFRA fill:#1a2440,stroke:#1e40af,color:#93c5fd
    style CORE fill:#b44c4c,stroke:#8c3333,color:#fff
    style WEB fill:#2d2a1a,stroke:#92400e,color:#fcd34d
    style STORAGE fill:#1a2332,stroke:#334155,color:#94a3b8
```

### Package Dependency Graph

```mermaid
flowchart TD
    core["core\n0 dependencies"]:::phase1
    adapters["adapters\ngit · llm · context · notifications\nast · messaging · worker · database"]:::phase2
    runtime["runtime\n10 PM2 processes"]:::phase3
    ui["ui\nHTTP client"]:::phase4

    core --> adapters
    adapters --> runtime
    runtime -->|"HTTP"| ui

    classDef phase1 fill:#b44c4c,stroke:#8c3333,color:#fff
    classDef phase2 fill:#2b6cb0,stroke:#1a4c80,color:#fff
    classDef phase3 fill:#2b7a4b,stroke:#1a5c36,color:#fff
    classDef phase4 fill:#c4841d,stroke:#96651a,color:#fff
```

> Phase 1 (core) -> Phase 2 (adapters) -> Phase 3 (runtime — 10 PM2 processes) -> Phase 4 (ui)

For more on the architecture, see [PRODUCT.md](./PRODUCT.md).

---

## Tech Stack

| Category    | Technologies                                                                                 |
|-------------|----------------------------------------------------------------------------------------------|
| Runtime     | Bun 1.2, TypeScript 5.7                                                                      |
| Backend     | NestJS 11, Pino, PM2                                                                         |
| Frontend    | Vite 7, React 19, TanStack Router, Tailwind CSS 4, HeroUI v3 (migration target), Recharts, Sonner |
| Database    | MongoDB 8 (mongoose), Qdrant 1.13                                                            |
| Queue/Cache | Redis 7.4 (Redis Streams), BullMQ                                                            |
| Validation  | Zod                                                                                          |
| Security    | Helmet, CORS, CASL, AES-GCM                                                                  |
| LLM         | openai, @anthropic-ai/sdk, @google/genai, Vercel AI SDK                                      |
| Git         | @octokit/rest, @gitbeaker/rest                                                               |
| AST         | tree-sitter                                                                                  |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.2
- [MongoDB](https://www.mongodb.com/) >= 8.0
- [Redis](https://redis.io/) >= 7.4
- [Qdrant](https://qdrant.tech/) >= 1.13

### Installation

```bash
git clone https://github.com/samiyev/codenautic.git
cd codenautic
bun install
```

### Configuration

```bash
cp packages/runtime/.env.example packages/runtime/.env
cp packages/ui/.env.example packages/ui/.env
```

Fill in the `.env` files with your API keys for Git platforms, LLM providers, and external services.

### Build and Run

```bash
cd packages/<pkg> && bun run build       # Build a package
cd packages/<pkg> && bun run typecheck   # Type check
cd packages/<pkg> && bun run lint        # Lint
cd packages/<pkg> && bun test            # Tests
```

---

## Commands

```bash
bun install                                             # Install dependencies
cd packages/<pkg> && bun run build                      # Build a package
bun run --filter @codenautic/<pkg> build               # Build via filter from root
cd packages/<pkg> && bun run clean                      # Clean dist/
cd packages/<pkg> && bun run typecheck                  # Type check
cd packages/<pkg> && bun test                           # Run tests
cd packages/<pkg> && bun run format                     # Format (Prettier)
cd packages/<pkg> && bun run lint                       # ESLint
```

> **Note:** Running `bun test path/to/file` from the monorepo root does not work with Bun workspaces. Always `cd` into
> the package directory first.

---

## Project Structure

> Diagram below is conceptual and reflects layer/package boundaries. Internal folders and file paths may evolve.

```mermaid
flowchart TD
    subgraph ROOT["codenautic/"]
        subgraph packages["packages/ — 4 packages"]
            CORE_S["core\nDomain, use cases, ports\n0 external dependencies"]
            INFRA_S["adapters\ngit · llm · context · notifications\nast · messaging · worker · database"]
            SERVER_S["runtime — 10 PM2 processes\napi · settings-service (config registry) · webhooks\nreview-worker · scan-worker · agent-worker\nnotification-worker · analytics-worker\nscheduler · mcp"]
            WEB_S["ui\nVite 7, React 19, TanStack Router"]
        end

        CLAUDE_S["CLAUDE.md — Development rules"]
        PRODUCT_S["PRODUCT.md — Full product description"]
        CONTRIB_S["CONTRIBUTING.md — Contribution guide"]
        PKG_S["package.json — Root workspace config"]
    end

    style ROOT fill:#1a2332,stroke:#334155,color:#94a3b8
    style packages fill:#1a2440,stroke:#1e40af,color:#93c5fd
    style CORE_S fill:#b44c4c,stroke:#8c3333,color:#fff
    style INFRA_S fill:#2b6cb0,stroke:#1a4c80,color:#fff
    style SERVER_S fill:#2b7a4b,stroke:#1a5c36,color:#fff
    style WEB_S fill:#c4841d,stroke:#96651a,color:#fff
```

---

## Development

### Principles

- **TDD** — tests first, then code (Red > Green > Refactor)
- **Clean Architecture** — Domain knows nothing about Infrastructure
- **DDD** — Entities with behavior, Value Objects, Domain Events
- **SOLID** — one file = one class, small interfaces
- **Result pattern** — `Result.ok()` / `Result.fail()` instead of exceptions

### Code Style

- 4 spaces, no semicolons, double quotes
- `strict: true`, `noUncheckedIndexedAccess: true`
- Only `/** JSDoc */` comments, never `//`
- `unknown` instead of `any`, union types instead of `enum`
- Test coverage: 99% lines, 99% functions

### Commits

Conventional Commits: `<type>(<scope>): <subject>`

```
feat(core): add review service wiring for pipeline orchestration and deterministic result handling across use case boundaries
fix(git-providers): handle api rate limiting with retry backoff strategy and explicit error mapping for stable adapter behavior
test(core): add unit tests for severity value object validation and deterministic comparison across edge case inputs
```

Commit header policy:

- Use imperative mood and lowercase style
- Keep header length at least 80 characters
- Include a commit body with at least 20 words explaining context and intent
- Keep commits atomic: one logical change per commit
- Enforcement is automatic via local `commit-msg` hook, CI `Commit Policy`, and PR `Policy Guard`
- For hard push blocking in all branches, enable GitHub rulesets with required checks

For detailed rules, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Roadmap

The project is planned for 33+ versions. Current progress: **0%** (0 of 1112 tasks).
This reflects implementation status by package TODOs; structural product coverage is tracked separately in
[PRODUCT_COVERAGE.md](./PRODUCT_COVERAGE.md).

| Phase | Packages                                                   | Status |
|-------|------------------------------------------------------------|--------|
| 1     | core                                                       | 0%     |
| 2     | adapters (providers, ast, messaging, worker-infra)        | 0%     |
| 3     | runtime (api, webhooks, workers, scheduler, mcp)          | 0%     |
| 4     | ui                                                         | 0%     |

Current priorities:

- Causal Analysis Overlays — DTOs for CodeCity visualization
- Repository Onboarding — scanning and indexing repositories
- API Controllers — Projects, Analytics, Graph endpoints
- Worker — BullMQ background processing
- UI — dashboard and main pages

Full roadmap per package is split into:

- `packages/<name>/TODO.md` (index)
- `packages/<name>/todo/*.md` (detailed milestones and tasks)

---

## Documentation

| Document                                      | Description                             |
|-----------------------------------------------|-----------------------------------------|
| [PRODUCT.md](./PRODUCT.md)                    | Full product description                |
| [ROADMAP.md](./ROADMAP.md)                    | Strategic roadmap and milestone order   |
| [PRODUCT_COVERAGE.md](./PRODUCT_COVERAGE.md)  | Product-to-task coverage and risk gates |
| [CONTRIBUTING.md](./CONTRIBUTING.md)          | Contribution guide                      |
| `packages/<name>/TODO.md` + `todo/*.md`       | Per-package task index and split tasks  |

---

## License

[MIT](./LICENSE)
