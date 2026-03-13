# M13 — CodeCity & Review UI

> Источник: `packages/adapters/TODO.md`

> **Задач (adapters):** 4 | **Проверка:** Graph storage & query для CodeCity

> **Результат milestone:** Готов graph storage/query слой для CodeCity и визуальной аналитики.

## AST v0.4.0 — Хранение и запросы

> Graph persistence and querying. ~80K tokens.

> **Результат версии:** Завершена версия «AST v0.4.0 — Storage & Query» в рамках M13; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| AST-STORE-001 | Реализовать graph repository | DONE | Реализован `MongoCodeGraphRepository`: хранит полный snapshot code graph в одном Mongo-совместимом документе на `repositoryId+branch`, делает идемпотентный `replaceOne(..., { upsert: true })`, валидирует узлы и рёбра до записи, отсекает orphan edges по ссылочной целостности и поддерживает детерминированный `queryNodes()` поверх сохранённых snapshot-ов. `core` top-level export дополнен `CodeGraphNodeType` для package-consistent type consumption из adapters. | Реализация: MongoDB storage for code graphs. Готово, если: graph repository обеспечивает идемпотентный upsert nodes/edges и consistency checks ссылочной целостности при batch write; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-STORE-002 | Реализовать graph query service | DONE | `MongoCodeGraphRepository` расширен детерминированными `queryNodes/queryEdges/queryPaths`: поддерживает filters по `repositoryId/branch/type/filePath/nodeId`, bounded BFS для paths, стабильный порядок результатов и пустой результат для missing/disconnected snapshots без exception. Happy-path и failure-path покрыты тестами, включая typed errors для invalid bounds. | Реализация: Query nodes, edges, paths. Готово, если: graph query service выдаёт корректные paths/queries на больших графах с предсказуемой сложностью и обработкой пустых/частичных результатов; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-STORE-003 | Реализовать embedding generation | DONE | Добавлен явный `core`-порт генерации embeddings из `CodeChunk[]`, а `AstCodeChunkEmbeddingGenerator` в adapters реализует deterministic batching, dedupe по payload, стабильное отображение результатов назад в исходные чанки и typed failure-path для invalid config/provider mismatch/vector validation. Happy-path, batching/idempotency и failure-path покрыты контрактными тестами. | Реализация: Generate embeddings for code chunks. Готово, если: для AST-STORE-003 adapter сохраняет стабильный external -> domain контракт, корректно обрабатывает retry/backoff/error/idempotency сценарии, а интеграционные контрактные тесты фиксируют поведение на happy/failure-path; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |
| AST-STORE-004 | Реализовать vector storage integration | DONE | Добавлен `QdrantVectorRepository` как общий adapter поверх существующего `IVectorRepository`: он лениво создаёт collection, валидирует размерность векторов, нормализует metadata/filter payload в Qdrant-safe shape, сохраняет stable ids через upsert и тем самым делает reindex идемпотентным без дублирования точек. Поиск поддерживает nested metadata filters, пустой missing-collection path и typed failure-path для invalid metadata/filter/vector-size/Qdrant request errors; behaviour закреплён stateful repository тестами. | Реализация: Store and query embeddings in Qdrant. Готово, если: vector storage integration гарантирует sync between metadata и embedding payload, а reindex не создаёт дублирующих векторов; DoD: `cd packages/adapters && bun run lint && bun run typecheck && bun test`. |

---
