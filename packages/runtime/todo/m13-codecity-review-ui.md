# M13 — CodeCity & Review UI

> Источник: `packages/runtime/TODO.md`

> **Задач (runtime):** 6 | **Проверка:** CodeCity API endpoints

> **Результат milestone:** Готовы runtime API для CodeCity и review visualization.

## API v0.16.0 — CodeCity API

> HTTP endpoints для CodeCity визуализации. Treemap data, file metrics, issue heatmap, temporal diff, hotspots. ~80K tokens.

> **Результат версии:** Завершена версия «API v0.16.0 — CodeCity API» в рамках M13; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| API-CTRL-024 | Реализовать codeCityController | TODO | Не начато | Реализация: GET /api/code-city/:repoId. Возвращает CodeCityData DTO (treemap + heatmap + hotspots). Query: branch, metricType. Готово, если: CodeCity endpoint возвращает консистентные DTO для treemap/heatmap/hotspots, фильтры branch/metricType работают предсказуемо и покрыты e2e тестами; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-025 | Реализовать codeCityTemporalEndpoint | TODO | Не начато | Реализация: GET /api/code-city/:repoId/diff. Query: fromCommit, toCommit. Возвращает added/removed/changed nodes with metrics delta. Готово, если: temporal diff endpoint корректно считает added/removed/changed узлы между коммитами и обрабатывает несуществующие commit refs без 500; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-026 | Реализовать fileMetricsEndpoint | TODO | Не начато | Реализация: GET /api/code-city/:repoId/metrics. Query: filePaths[]. Возвращает FileMetrics[] per file. Batch support. Готово, если: для API-CTRL-026 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-027 | Реализовать issueHeatmapEndpoint | TODO | Не начато | Реализация: GET /api/code-city/:repoId/heatmap. Возвращает IssueHeatmapEntry[]. Filter: severity, category, dateRange. Готово, если: для API-CTRL-027 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-CTRL-028 | Реализовать hotspotsEndpoint | TODO | Не начато | Реализация: GET /api/code-city/:repoId/hotspots. Возвращает PageRank-based hotspots. Query: limit, minScore. Готово, если: hotspots endpoint выдаёт ранжирование, воспроизводимое для одинакового входа, и поддерживает limit/minScore без деградации latency при больших графах; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |
| API-DB-004 | Реализовать репозиторий агрегации issues | TODO | Не начато | Реализация: MongoDB aggregation pipeline: group review issues by filePath. реализует IIssueAggregationProvider. Готово, если: для API-DB-004 процесс проходит e2e/integration happy-path и failure-path, DI wiring и queue contracts подтверждены тестами, а retry/timeout/DLQ переходы завершаются наблюдаемым terminal статусом и логируются; DoD: `cd packages/runtime && bun run lint && bun run typecheck && bun test`. |

---
