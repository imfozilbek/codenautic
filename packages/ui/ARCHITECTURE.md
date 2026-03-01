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

## Поток вызова

`Route / Component -> Query Hook -> Endpoint -> FetchHttpClient -> runtime/api`

## Эволюция

При подключении новых API:

1. Добавить/обновить OpenAPI схему
2. Сгенерировать типы в `src/lib/api/generated`
3. Добавить endpoint-класс в `src/lib/api/endpoints`
4. Добавить query keys для новых запросов
5. Добавить тесты контракта в `tests/lib/api`
