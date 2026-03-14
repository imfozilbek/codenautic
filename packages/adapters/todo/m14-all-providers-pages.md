# M14 — All Providers & Pages

> Источник: `packages/adapters/TODO.md`

> **Задач (adapters):** 18 | **Проверка:** GitLab, Anthropic, Discord — все провайдеры

> **Результат milestone:** Готов полный набор провайдеров (Git, LLM, Context, Notifications).

## Git v0.2.0 — GitLab Provider

> GitLab implementation. ~40K tokens.

> **Результат версии:** Завершена версия «Git v0.2.0 — GitLab Provider» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-003 | Реализовать gitLabProvider | DONE | Реализовано | Реализация: Интеграция через Gitbeaker SDK. Pipeline API. Discussion threads. Token verify. Готово, если: GitLab provider корректно маппит MR/discussions/pipeline состояния в доменные DTO, обрабатывает 401/403/404/429/5xx и соблюдает retry policy; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Git v0.3.0 — Azure DevOps + Bitbucket

> Remaining Git providers. ~60K tokens.

> **Результат версии:** Завершена версия «Git v0.3.0 — Azure DevOps + Bitbucket» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-004 | Реализовать azureDevOpsProvider | DONE | Реализовано | Реализация: Интеграция через azure-devops-node-api. Pull request statuses. Thread comments. Typed unsupported blame path. Готово, если: Azure DevOps provider стабильно работает с thread/build API, корректно обрабатывает paging и throttling, и сохраняет консистентность комментариев; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-005 | Реализовать bitbucketProvider | DONE | Реализовано | Реализация: Интеграция через Bitbucket SDK. Pipeline status. Inline comments в рамках текущего `core`-контракта без отдельного task API. Готово, если: Bitbucket provider корректно поддерживает inline comments и pipeline status mapping, включая failure-path при ограничениях прав; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Git v0.4.0 — Shared Инфраструктура

> Rate limiting, retry, health checks for Git APIs. ~70K tokens.

> **Результат версии:** Завершена версия «Git v0.4.0 — Shared Infrastructure» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-006 | Реализовать rate limiting wrapper | DONE | Реализовано | Реализация: Per-org tracking. Tiers: Free 100/15min, Pro 1000/15min. 429 handling. Готово, если: rate limiter соблюдает org-tier quotas и предотвращает burst spikes, при превышении выдаёт наблюдаемый throttling без потери запроса в очереди; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-007 | Реализовать retry with exponential backoff | DONE | Реализовано | Реализация: Delay = baseDelay \* 4^attempt. Max 5 attempts. DLQ after failure. Готово, если: retry/backoff применяются только к retryable ошибкам и завершаются DLQ после лимита попыток с сохранением контекста последней ошибки; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-008 | Реализовать провайдер health checks | DONE | Реализовано | Реализация: Periodic ping. Circuit breaker. Status reporting. Готово, если: для GIT-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.2.0 — Anthropic + Google

> Additional core LLM providers. ~80K tokens.

> **Результат версии:** Завершена версия «LLM v0.2.0 — Anthropic + Google» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-003 | Реализовать anthropicProvider | DONE | Реализовано | Реализация: Интеграция через @anthropic-ai/sdk. Claude 3/4. Streaming. Поддержка tool use. Voyage for embeddings. Готово, если: для LLM-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-004 | Реализовать googleProvider | DONE | Реализовано | Реализация: Интеграция через @google/genai. Gemini 2.x. Streaming. text-embedding-004. Готово, если: для LLM-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.3.0 — Shared Инфраструктура

> Rate limiting, retry, health checks for LLM APIs. ~70K tokens.

> **Результат версии:** Завершена версия «LLM v0.3.0 — Shared Infrastructure» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-005 | Реализовать rate limiting wrapper | DONE | Реализовано | Реализация: Per-org tracking. Tiers: Free 100/15min, Pro 1000/15min. 429 handling. Готово, если: для LLM-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-006 | Реализовать retry with exponential backoff | DONE | Реализовано | Реализация: Delay = baseDelay \* 4^attempt. Max 5 attempts. DLQ after failure. Готово, если: для LLM-006 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-007 | Реализовать провайдер health checks | DONE | Реализовано | Реализация: Periodic ping. Circuit breaker. Status reporting. Готово, если: для LLM-007 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.4.0 — Groq + OpenRouter

> Fast inference providers. ~60K tokens.

> **Результат версии:** Завершена версия «LLM v0.4.0 — Groq + OpenRouter» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-008 | Реализовать groqProvider | DONE | Реализовано | Реализация: Groq fast inference API. Готово, если: для LLM-008 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-009 | Реализовать openRouterProvider | DONE | Реализовано | Реализация: OpenRouter model aggregation. Готово, если: для LLM-009 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Notifications v0.2.0 — Webhook Обработчик

> Unified webhook handler for messenger platforms. ~40K tokens.

> **Результат версии:** Завершена версия «Notifications v0.2.0 — Webhook Handler» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-003 | Реализовать messengerWebhookHandler | TODO | Не начато | Реализация: Unified webhook handler for messengers. Готово, если: для NOTIF-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Notifications v0.3.0 — Discord + Teams

> Additional messenger platforms. ~60K tokens.

> **Результат версии:** Завершена версия «Notifications v0.3.0 — Discord + Teams» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| NOTIF-004 | Реализовать discordProvider | TODO | Не начато | Реализация: Discord Bot API integration. Готово, если: для NOTIF-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| NOTIF-005 | Реализовать teamsProvider | TODO | Не начато | Реализация: Microsoft Teams Bot Framework. Готово, если: для NOTIF-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## Context v0.2.0 — Project Management Providers

> Asana + ClickUp. ~60K tokens.

> **Результат версии:** Завершена версия «Context v0.2.0 — Project Management Providers» в рамках M14; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CTX-004 | Реализовать asanaProvider | TODO | Не начато | Реализация: Интеграция через REST API. Task details, project hierarchy. Готово, если: для CTX-004 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| CTX-005 | Реализовать clickUpProvider | TODO | Не начато | Реализация: Интеграция через REST API. Task details, custom fields. Готово, если: для CTX-005 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
