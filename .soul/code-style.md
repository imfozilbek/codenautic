## Стиль кода

### Prettier

- **Отступы:** 4 пробела (tabWidth: 4)
- **Строка:** max 100 символов
- **Кавычки:** двойные (`"text"`)
- **Точка с запятой:** нет
- **Запятые:** trailing в multiline
- **Конец строки:** LF

```typescript
/** Правильно — 4 пробела, без точки с запятой, двойные кавычки */
function review(diff: IDiffFile): ReviewResult {
    if (diff.hasChanges) {
        return this.analyze(diff)
    }
    return ReviewResult.empty()
}
```

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`
- Runtime: **Bun**
- Нет `any` — `unknown` + type guards
- Нет `enum` — `as const` или union types
- Нет default exports
- Всегда explicit return types
- `const` по умолчанию, `let` только при переприсвоении
- Только `===` и `!==`
- Фигурные скобки всегда, даже для однострочных блоков
- Явные модификаторы доступа (`public`, `private`, `protected`, `readonly`) на всех методах и свойствах классов. Никогда
  не полагайся на implicit public
- Файлы: kebab-case (`review-issue.ts`), один класс/интерфейс на файл
- Imports: относительные внутри пакета, `@codenautic/*` между пакетами
- Порядок импортов: 1) node built-ins, 2) external packages, 3) `@codenautic/*`, 4) relative. Пустая строка между
  группами

### Нейминг

| Что                | Конвенция   | Пример                                               |
|--------------------|-------------|------------------------------------------------------|
| Интерфейсы         | `I` prefix  | `IGitProvider`, `IReviewRepository`                  |
| Value Objects      | PascalCase  | `FilePath`, `Severity`, `RiskScore`                  |
| Entities           | PascalCase  | `Review`, `ReviewIssue`                              |
| Use Cases          | +`UseCase`  | `ReviewMergeRequestUseCase`, `PipelineRunnerUseCase` |
| Сервисы            | +`Service`  | `ReviewService`                                      |
| Фабрики            | +`Factory`  | `GitProviderFactory`                                 |
| Domain Events      | Past tense  | `ReviewCompleted`, `IssueFound`                      |
| Константы          | UPPER_SNAKE | `MAX_RETRIES`                                        |
| Переменные/функции | camelCase   | `reviewResult`, `calculateScore`                     |

### Обработка ошибок

- `Result<T, E>` из `@codenautic/core` — ожидаемые ошибки
- `throw` — только programmer errors (баги, невозможные состояния)
- Domain errors наследуют `DomainError` с уникальным `code`
- Пустые `catch` — запрещены

### Логирование

- Продакшн-код: **только через `ILogger` port**
- `console.warn` / `console.error` — допустимы только в infrastructure-скриптах и тестах
- `console.log` — запрещён везде
