# M07 — First Providers

> Источник: `packages/adapters/TODO.md`

> **Задач:** 4 | **Проверка:** GitProviderFactory + GitHubProvider, LLMProviderFactory + OpenAIProvider

> **Результат milestone:** Готовы базовые Git/LLM providers для запуска e2e AI-ревью.

## Git v0.1.0 — Git Provider Foundation

> Factory + GitHub implementation. ~80K tokens.

> **Результат версии:** Завершена версия «Git v0.1.0 — Git Provider Foundation» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| GIT-001 | Реализовать GitProviderFactory | DONE | Реализовано | Реализация: Создает провайдер по типу. Возвращает IGitProvider. Инъекция токена. Готово, если: factory выбирает провайдера строго по конфигурации, неизвестный тип возвращает типизированную ошибку, контракт IGitProvider идентичен для всех поддерживаемых платформ; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| GIT-002 | Реализовать GitHubProvider | DONE | Реализовано | Реализация: Интеграция через Octokit SDK. Check Runs API. \`\`\`suggestion format. HMAC-SHA256 verify. Готово, если: GitHub adapter корректно обрабатывает happy-path и API ошибки (401/403/404/429/5xx), signature verification блокирует spoofed webhook, retry выполняется только для retryable статусов; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---

## LLM v0.1.0 — Фундамент LLM-провайдера

> Factory + OpenAI implementation. ~80K tokens.

> **Результат версии:** Завершена версия «LLM v0.1.0 — LLM Provider Foundation» в рамках M07; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| LLM-001 | Реализовать LLMProviderFactory | DONE | Реализовано | Реализация: Создает провайдер по типу. Возвращает ILLMProvider. Поддержка BYOK. Готово, если: factory поддерживает BYOK и fallback-конфигурацию без утечки секретов, неверный provider/model приводит к предсказуемой ошибке конфигурации; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| LLM-002 | Реализовать OpenAIProvider | TODO | Не начато | Реализация: Интеграция через OpenAI SDK. GPT-4o, GPT-4o-mini. Поддержка streaming SSE. Поддержка JSON mode. Tools. Готово, если: OpenAI adapter стабильно работает в sync/stream/json/tools режимах, token usage и finish reason корректно маппятся в domain DTO, retry/backoff применяется к 429/5xx; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
