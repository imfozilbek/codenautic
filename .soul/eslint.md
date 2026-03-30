## ESLint — ZERO TOLERANCE (ОБЯЗАТЕЛЬНО)

> **Каждая строка кода ОБЯЗАНА проходить lint без единой ошибки.**
> Нарушение любого правила — блокер. Код с lint-ошибками НЕ СЧИТАЕТСЯ написанным.
> Claude Code ОБЯЗАН знать эти правила наизусть и применять их ДО написания кода, а не после.

**Все правила — `error`. Исключений нет.**

| Правило                         | Что делать                                      |
|---------------------------------|-------------------------------------------------|
| `no-explicit-any`               | `unknown`, generics, proper types               |
| `explicit-function-return-type` | Всегда return type                              |
| `no-floating-promises`          | `await`, `.catch()` или `void`                  |
| `no-unused-vars`                | Prefix `_`: `_unused`                           |
| `strict-boolean-expressions`    | Нет implicit bool coercion                      |
| `no-non-null-assertion`         | Нет `!` — обрабатывай null явно                 |
| `no-empty-object-type`          | Пустые object types запрещены (interfaces — ок) |
| `naming-convention`             | Интерфейсы: `I` prefix                          |
| `prefer-const`                  | `const` если нет переприсвоения                 |
| `eqeqeq`                        | `===` и `!==`                                   |
| `curly`                         | Фигурные скобки всегда                          |
| `no-console`                    | Нет `console.log`                               |
| `max-params`                    | Max 5. Больше — config object                   |
| `max-lines-per-function`        | Max 100 строк (off в тестах)                    |
| `complexity`                    | Max cyclomatic complexity 10                    |
| `max-depth`                     | Max 4 уровня вложенности                        |

**Частые ошибки — запомни и НЕ ДОПУСКАЙ:**

```typescript
/** НЕПРАВИЛЬНО — strict-boolean-expressions */
if (value) { ... }
if (!array.length) { ... }
if (result.error) { ... }

/** ПРАВИЛЬНО */
if (value !== undefined) { ... }
if (array.length === 0) { ... }
if (result.error !== undefined) { ... }

/** НЕПРАВИЛЬНО — no-non-null-assertion */
const name = user!.name
const first = items![0]

/** ПРАВИЛЬНО */
if (user === undefined) { throw new Error("...") }
const name = user.name

/** НЕПРАВИЛЬНО — no-floating-promises */
someAsyncFunction()
promise.then(handler)

/** ПРАВИЛЬНО */
await someAsyncFunction()
void promise.then(handler)

/** НЕПРАВИЛЬНО — no-explicit-any */
function parse(data: any): any { ... }

/** ПРАВИЛЬНО */
function parse(data: unknown): ParseResult { ... }
```

**После завершения реализации — ОБЯЗАТЕЛЬНО запусти `bun run lint` и исправь все ошибки до обновления TODO.**
