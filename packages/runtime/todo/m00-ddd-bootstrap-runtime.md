# M00 — DDD Bootstrap (Runtime)

> Источник: `docs/ddd/sprint-1-ddd-bootstrap.md`

> **Задач:** 2 | **Фокус:** composition root wiring + outbox relay runtime flow

> **Результат milestone:** runtime подключает core DDD-контур и обеспечивает минимальную доставку доменных событий.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|---|---|---|---|---|
| DDD-S1-012 | Реализовать wiring `CompleteReviewUseCase` в `review-worker` composition root | TODO | Не начато | Реализация: DI registration портов/репозиториев/шины событий без `new` в use case. Готово, если: worker поднимается и выполняет happy-path сценарий с тестовым payload, wiring покрыт integration тестом; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| DDD-S1-013 | Реализовать runtime consumer для outbox relay (минимальный контур) | TODO | Не начато | Реализация: publish событий из outbox в messaging topic + mark sent/fail. Готово, если: есть retry policy, failure-path переводит запись в fail state, тестируется идемпотентный повтор; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
