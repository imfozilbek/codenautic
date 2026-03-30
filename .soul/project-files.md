## Файлы проекта

**Корневые файлы:**

| Файл              | Путь             |
|-------------------|------------------|
| Root package.json | `./package.json` |

**Организация пакетов:**

```
packages/core              → core (ядро)
packages/adapters          → adapters (провайдеры + библиотеки)
packages/runtime           → runtime (API + Workers + Webhooks + Scheduler + MCP)
packages/ui                → ui (frontend)
```

**Каждый пакет содержит:**

| Файл              | Путь                              |
|-------------------|-----------------------------------|
| README            | `packages/<name>/README.md`       |
| ESLint            | `packages/<name>/eslint.config.mjs` |
| Prettier config   | `packages/<name>/.prettierrc`     |
| Prettier ignore   | `packages/<name>/.prettierignore` |
| TypeScript config | `packages/<name>/tsconfig.json`   |
| Bun test config   | `packages/<name>/bunfig.toml` (кроме ui) |
| UI Vitest config  | `packages/ui/vitest.config.ts`   |
| UI test setup     | `packages/ui/tests/setup.ts`     |

Пути: всегда относительные от корня. Точная внутренняя структура пакетов может меняться до полной реализации.
