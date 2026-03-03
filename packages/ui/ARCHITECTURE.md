# UI Integration Boundary

## Правило связки пакетов

`@codenautic/ui` связывается с остальными пакетами только через `@codenautic/runtime/api` по HTTP.

- `ui` не импортирует `@codenautic/core`
- `ui` не импортирует `@codenautic/adapters`
- бизнес-правила не переносятся в `ui`
- `ui` работает с DTO/контрактами API

## Минимальный шаблон контракта

- `src/lib/api/config.ts` — конфигурация API URL и базовых заголовков
- `src/lib/api/http-client.ts` — типизированный HTTP-клиент
- `src/lib/api/endpoints/*.endpoint.ts` — endpoint-слой (по bounded context)
- `src/lib/api/generated/*` — generated DTO (OpenAPI codegen)
- `src/lib/query/query-keys.ts` — единый factory ключей для React Query

## OpenAPI Codegen Workflow

1. Источник контракта: `openapi/schema.yaml`.
2. Генерация DTO: `bun run codegen` -> `src/lib/api/generated/index.ts`.
3. Drift-check в CI: `bun run codegen:check` (job `UI OpenAPI Codegen Sync`).
4. Автообновление на локальной разработке: `dev` и `build` запускают `codegen` перед стартом.

## Поток вызова

`Route / Component -> Query Hook -> Endpoint -> FetchHttpClient -> runtime/api`

## Strategy: Eager/Lazy & Suspense

### Eager загрузка (initial bundle)

| Слой        | Что грузим eagerly                                      | Причина                                    |
| ----------- | ------------------------------------------------------- | ------------------------------------------ |
| Bootstrap   | `src/main.tsx`, `src/app/app.tsx`, router, query client | Нужно для первого рендера приложения       |
| Stability   | `error-fallback`, `route-suspense-fallback`             | Fallback UI должен быть доступен мгновенно |
| Core styles | `src/app/globals.css`                                   | Базовая типографика и layout без FOUC      |

### Lazy загрузка (route/feature split)

| Уровень     | Что грузим lazy                               | Правило                                             |
| ----------- | --------------------------------------------- | --------------------------------------------------- |
| Route-level | Компоненты экранов из `src/pages/*`           | Каждый route лениво импортирует page-компонент      |
| Heavy libs  | `three`, `@xyflow/react`, `recharts`, `shiki` | Импорт только внутри соответствующего feature route |

### Suspense границы

1. Route-level граница ставится в route-файле (`src/routes/*.tsx`) и оборачивает lazy page-компонент.
2. Fallback компоненты должны быть легковесными и не содержать тяжёлых зависимостей.
3. Для тяжёлых блоков внутри страницы допускаются вложенные `Suspense` границы с локальными fallback UI.

## Эволюция

При подключении новых API:

1. Добавить/обновить OpenAPI схему
2. Сгенерировать типы в `src/lib/api/generated`
3. Добавить endpoint-класс в `src/lib/api/endpoints`
4. Добавить query keys для новых запросов
5. Добавить тесты контракта в `tests/lib/api`
