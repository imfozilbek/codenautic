## Команды

**Корневых scripts нет.** Все команды запускаются из директории конкретного пакета или через `--filter`.

### Корень

```bash
bun install                                              # Установка зависимостей (единственная корневая команда)
bun run --filter '@codenautic/<pkg>' <script>           # Запуск script конкретного пакета из корня
bun run --filter '*' <script>                            # Запуск script всех пакетов из корня
```

### Структура пакетов

```
packages/core              → core (ядро)
packages/adapters          → adapters (провайдеры + библиотеки)
packages/runtime           → runtime (API + Workers + Webhooks + Scheduler + MCP)
packages/ui                → ui (frontend)
```

### Пакеты (единый набор команд)

Все пакеты имеют одинаковый набор (кроме `ui`):

```bash
cd packages/<pkg> && bun run build                 # tsc --project tsconfig.build.json
cd packages/<pkg> && bun run clean                 # rm -rf dist
cd packages/<pkg> && bun run format                # prettier --write .
cd packages/<pkg> && bun run format:check          # prettier --check .
cd packages/<pkg> && bun run lint                  # eslint .
cd packages/<pkg> && bun test                      # bun test
cd packages/<pkg> && bun test tests/file.test.ts   # один файл
cd packages/<pkg> && bun run typecheck             # tsc --noEmit
```

Примеры:

```bash
cd packages/core && bun test                        # тесты core
cd packages/adapters && bun run lint                 # линт adapters
cd packages/runtime && bun run build                 # сборка runtime
```

### runtime (дополнительные команды)

```bash
cd packages/runtime && bun run dev:api               # API dev (watch mode)
cd packages/runtime && bun run start:api             # API продакшн
cd packages/runtime && bun run start:webhooks        # Webhooks
cd packages/runtime && bun run start:review-worker   # Review pipeline
cd packages/runtime && bun run start:scan-worker     # Repo indexing
cd packages/runtime && bun run start:agent-worker    # Conversation agent
cd packages/runtime && bun run start:notification-worker # Notifications
cd packages/runtime && bun run start:analytics-worker # Analytics
cd packages/runtime && bun run start:scheduler       # Cron jobs
cd packages/runtime && bun run start:mcp             # MCP server
cd packages/runtime && bun run migrate:seed          # сидирование БД
```

### ui (Vitest, Vite)

```bash
cd packages/ui && bun run dev                        # vite dev server
cd packages/ui && bun run build                      # vite build
cd packages/ui && bun run clean                      # rm -rf dist coverage
cd packages/ui && bun run preview                    # vite preview
cd packages/ui && bun run test                       # vitest run (happy-dom)
cd packages/ui && npx vitest run tests/file.test.tsx # один файл
cd packages/ui && bun run typecheck                  # tsc --noEmit
cd packages/ui && bun run lint                       # eslint . --fix
cd packages/ui && bun run format                     # prettier --write .
cd packages/ui && bun run format:check               # prettier --check .
cd packages/ui && bun run codegen                    # openapi-typescript → generated types
```

### ЗАПРЕЩЕНО (не работает с workspaces)

```bash
bun test packages/ui/tests/file.test.tsx              # НЕ работает — bun не найдёт файл
bun test ./packages/ui/tests/                         # НЕ работает — cwd не совпадает
```

> **Почему?** Bun workspaces маршрутизируют `bun test` в `cwd` пакета. Прямой путь из корня не резолвится.
