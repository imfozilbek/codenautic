# M01 — Core Foundation

> Источник: `packages/core/TODO.md`

> **Задач:** 27 | **Проверка:** `cd packages/core && bun test` — Entity, VO, Result, Errors, Utils

> **Результат milestone:** Готов базовый доменный фундамент (Entity, VO, Result, Errors, IoC), на котором строятся все сценарии продукта.

## v0.1.0 — Foundation Tests

> Покрытие тестами существующих базовых классов. Код реализован, тесты отсутствуют.

> **Результат версии:** Завершена версия «v0.1.0 — Foundation Tests» в рамках M01; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-001 | Реализовать тесты Entity | TODO | Не начато | Реализация: Создание с авто-id (UUID). Создание с заданным UniqueId. isEqual() true для одного id, false для разных id/null/undefined/другого типа. props frozen (shallow immutable). Готово, если: для CORE-001 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-002 | Реализовать тесты ValueObject | TODO | Не начато | Реализация: Validate() вызывается при конструировании. Невалидные props -> ошибка. props frozen. isEqual() true для одинаковых значений, false для разных/null/другого типа VO. Готово, если: для CORE-002 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-003 | Реализовать тесты UniqueId | TODO | Не начато | Реализация: Create() -> UUID v4 формат. create("custom") -> значение "custom". create("") -> InvalidUniqueIdError. create(" ") -> InvalidUniqueIdError. value getter. isEqual(). Готово, если: для CORE-003 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-004 | Реализовать тесты AggregateRoot | TODO | Не начато | Реализация: Наследует Entity. addDomainEvent() накапливает события. domainEvents -> readonly копия. clearDomainEvents() возвращает и очищает. Повторный clearDomainEvents() -> []. Готово, если: для CORE-004 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-005 | Реализовать тесты BaseDomainEvent | TODO | Не начато | Реализация: EventId уникален для каждого события. occurredAt -> Date автоматически. aggregateId из конструктора. eventName abstract, реализуется наследником. Готово, если: для CORE-005 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-006 | Реализовать тесты DomainError + InvalidUniqueIdError | TODO | Не начато | Реализация: DomainError: наследует Error, name = имя класса, abstract code. InvalidUniqueIdError: code = "INVALID_UNIQUE_ID", message непустой. Готово, если: для CORE-006 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-007 | Реализовать тесты Container | TODO | Не начато | Реализация: Bind/resolve transient (каждый раз новый экземпляр). bindSingleton (один экземпляр). resolve незарегистрированного -> throw. has() true/false. unbind() удаляет. createToken<T>() возвращает строку. Готово, если: для CORE-007 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-008 | Реализовать тесты Result | TODO | Не начато | Реализация: Ok(value) -> isOk, value доступен. fail(error) -> isFail, error доступен. value на fail -> throw. error на ok -> throw. map трансформирует ok, пропускает fail. flatMap цепочка. unwrapOr. Discriminated union (без type assertions). Готово, если: для CORE-008 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.2.0 — Domain Errors

> Доменные ошибки. Расширение DomainError + новые классы.

> **Результат версии:** Завершена версия «v0.2.0 — Domain Errors» в рамках M01; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-009 | Реализовать domainError: timestamp, cause, serialize | TODO | Не начато | Реализация: Timestamp: Date (автоматически в конструкторе). cause?: Error (Error chaining). serialize(): {code, message, timestamp, cause?}. Обратная совместимость с InvalidUniqueIdError. Готово, если: для CORE-009 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-010 | Реализовать validationError | TODO | Не начато | Реализация: Extends DomainError. code = "VALIDATION_ERROR". fields: {field: string, message: string}[]. Конструктор(message, fields). serialize() включает fields. Готово, если: для CORE-010 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-011 | Реализовать notFoundError | TODO | Не начато | Реализация: Extends DomainError. code = "NOT_FOUND". entityType: string, entityId: string. Message авто: "${entityType} with id ${entityId} not found". Готово, если: для CORE-011 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-012 | Реализовать conflictError | TODO | Не начато | Реализация: Extends DomainError. code = "CONFLICT". conflictReason: string. Message описывает конфликт. Готово, если: для CORE-012 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-013 | Реализовать unauthorizedError | TODO | Не начато | Реализация: Extends DomainError. code = "UNAUTHORIZED". requiredPermission?: string. Message описывает требуемое разрешение. Готово, если: для CORE-013 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.3.0 — Core Value Objects

> Базовые value objects для домена code review.

> **Результат версии:** Завершена версия «v0.3.0 — Core Value Objects» в рамках M01; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-014 | Реализовать severity | DONE | Реализовано | Реализация: 5 уровней: INFO(0), LOW(10), MEDIUM(20), HIGH(30), CRITICAL(50). weight getter. compareTo(other). isHigherThan(other). isAtLeast(other). toString(). Готово, если: для CORE-014 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-015 | Реализовать filePath | DONE | Реализовано | Реализация: Immutable. Нормализация слэшей (\ -> /). Валидация (не пустой). extension(), fileName(), directory(). matchesGlob(pattern): boolean. Готово, если: для CORE-015 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-016 | Реализовать lineRange | DONE | Реализовано | Реализация: Start, end. Валидация start >= 1, end >= start. contains(line: number). overlaps(other: LineRange). length getter. toString() -> "L{start}-L{end}". Готово, если: для CORE-016 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-017 | Реализовать riskScore | DONE | Реализовано | Реализация: Range 0-100. Factors: {issues, size, complexity, hotspots, history}. calculate(factors) static method. level getter -> LOW/MEDIUM/HIGH/CRITICAL. Thresholds. Готово, если: для CORE-017 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-018 | Реализовать репозиторийId | DONE | Реализовано | Реализация: Platform prefix (gh/gl/az/bb) + id. parse("gh:123") static. toString() -> "gh:123". platform getter. id getter. Валидация формата. Готово, если: для CORE-018 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-019 | Реализовать memberRole | TODO | Не начато | Реализация: OWNER(1), ADMIN(2), MEMBER(3), VIEWER(4). priority getter. hasPermission(required: MemberRole): boolean (priority <= required). isHigherThan(other). Готово, если: для CORE-019 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.4.0 — Extended Value Objects

> Value objects для embedding, кода, мультитенантности, языков.

> **Результат версии:** Завершена версия «v0.4.0 — Extended Value Objects» в рамках M01; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-020 | Реализовать codeChunk | TODO | Не начато | Реализация: Content: string, filePath: FilePath, lineRange: LineRange, language: string. Для генерации embeddings. Валидация: content не пустой. Готово, если: для CORE-020 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-021 | Реализовать embedding | TODO | Не начато | Реализация: Vector: number[], dimensions: number, model: string, metadata?: Record<string, unknown>. similarity(other): number (cosine). Валидация: dimensions === vector.length. Готово, если: для CORE-021 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-022 | Реализовать organizationId | TODO | Не начато | Реализация: Extends ValueObject. Для hybrid tenancy. isGlobal(): boolean (null = global). Валидация формата если не null. Готово, если: для CORE-022 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-023 | Реализовать programmingLanguage | TODO | Не начато | Реализация: Union type: jsts, python, go, java, csharp, ruby, rust, php, kotlin, dart, scala, dockerfile, unknown. fromExtension(ext) static. fromShebang(line) static. toString(). Готово, если: для CORE-023 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---

## v0.5.0 — Shared Utils

> Чистые утилитарные функции без внешних зависимостей.

> **Результат версии:** Завершена версия «v0.5.0 — Shared Utils» в рамках M01; инкремент готовит продукт к стабильному end-to-end сценарию в своем слое.

| ID | Задача | Статус | Результат | Acceptance Criteria |
|----------|--------------------|--------|-----------|---------------------|
| CORE-024 | Реализовать hash() | DONE | Реализовано | Реализация: SHA256 хеширование строки -> hex string. Deterministic (одинаковый вход -> одинаковый выход). Пустая строка -> валидный hash. Готово, если: для CORE-024 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-025 | Реализовать serialize/deserialize | DONE | Реализовано | Реализация: JSON сериализация с поддержкой Date (ISO string <-> Date). Round-trip: deserialize(serialize(x)) === x. Ошибка при невалидном JSON. Готово, если: для CORE-025 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-026 | Реализовать similarity() | DONE | Реализовано | Реализация: Cosine similarity для двух number[]. Range [-1, 1]. Одинаковые векторы -> 1. Ортогональные -> 0. Разная длина -> ошибка. Готово, если: для CORE-026 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |
| CORE-027 | Реализовать deduplicate() | DONE | Реализовано | Реализация: Удаление дубликатов по ключу (функция-экстрактор). Generic T. Сохраняет порядок первого вхождения. Пустой массив -> []. Готово, если: для CORE-027 полностью выполнены пункты блока «Реализация», поведение подтверждено unit/integration тестами (happy-path, negative, edge-case), контракты DTO/ports совместимы, регрессии в смежных use case отсутствуют; DoD: `cd packages/core && bun run lint && bun run typecheck && bun test`. |

---
