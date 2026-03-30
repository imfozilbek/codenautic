## Тестирование

- **Фреймворк:** `bun test` (все пакеты кроме `ui`), **Vitest** (`ui`)
- **Порог покрытия:** 99% lines, 99% functions **per-package** (`ui` — v8 coverage). Падение ниже порога — блокер релиза.
  Coverage всегда включён
- **Файлы:** `*.test.ts` или `*.spec.ts`
- **Расположение:** `packages/<name>/tests/`
- **TDD обязателен:** Red → Green → Refactor
- **Нейминг тестов:** when/then стиль — `"when input is empty, then throws DomainError"`,
  `"when review has issues, then returns high severity"`

### Запуск тестов (ОБЯЗАТЕЛЬНО к прочтению)

**Монорепо использует Bun workspaces.** Корневой `bun test` вызывает `bun run --filter '*' test`, который запускает
скрипт `test` **каждого пакета** в его собственном `cwd`.

Все команды запуска тестов и ограничения workspaces — см. секцию «Команды».

**Конфигурация тестов по пакетам:**

| Пакет     | Тест-раннер | Конфиг                               | Окружение                        |
|-----------|-------------|--------------------------------------|----------------------------------|
| `ui`      | Vitest      | `packages/ui/vitest.config.ts`   | happy-dom (нативно через Vitest) |
| Остальные | `bun test`  | `./bunfig.toml` (корневой)        | Node-like (Bun runtime)          |

**DOM-окружение (ui):**

Пакет `ui` использует Vitest с `environment: "happy-dom"` (настроено в `vitest.config.ts`). DOM globals подключаются
нативно — ручной setup Window не нужен. Setup файл (`tests/setup.ts`) содержит только `cleanup()` и подавление React
warnings.

**Мокирование в ui (Vitest):**

- `vi.fn()` — создание mock-функции (аналог `mock()` в Bun)
- `vi.mock("module", factory)` — мокирование модуля (аналог `mock.module()` в Bun)
- `vi.hoisted()` — объявление переменных, используемых внутри `vi.mock()` factory (vi.mock hoisting)
- Импорт: `import { describe, it, expect, vi } from "vitest"`

**Мокирование в остальных пакетах (Bun):**

```typescript
import { describe, it, expect, beforeEach } from "bun:test"

describe("ReviewService", () => {
    let service: ReviewService
    let mockGitProvider: IGitProvider

    beforeEach(() => {
        mockGitProvider = createMockGitProvider()
        service = new ReviewService(mockGitProvider)
    })

    describe("review", () => {
        it("should return issues for problematic code", async () => {
            const result = await service.review(mockMergeRequest)

            expect(result.issues).toHaveLength(2)
            expect(result.issues[0].severity).toBe(Severity.HIGH)
        })
    })
})
```
