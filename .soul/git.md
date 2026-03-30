## Git

### Формат коммитов

Conventional Commits: `<type>(<package>): <subject>`

```bash
feat(core): add ReviewService with dependency injection
fix(adapters): handle Git API rate limiting
test(core): add unit tests for Severity
refactor(runtime): extract review pipeline stages
chore: update eslint config                    # корневой, без scope
```

**Типы:** feat, fix, docs, style, refactor, perf, test, chore

- Imperative mood, lowercase, max 50 символов
- **НЕ** добавляй "Co-Authored-By" или AI-атрибуцию
- Atomic commits: один commit = одно логическое изменение

**TDD порядок коммитов:**

1. types/interfaces
2. тесты → реализация
3. рефакторинг (тесты зелёные)
4. exports (index.ts)
5. документация, version bump

### Именование веток

`<package>/<description>` в kebab-case:

```bash
core/review-service
runtime/auth-middleware
ui/issues-table
adapters/git-rate-limiting
```

### Версионирование

- Prefixed tags: `core-v0.1.0`
- SemVer: `MAJOR.MINOR.PATCH`. До 1.0 — minor может ломать
