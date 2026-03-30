## Базовые классы core

| Что создаёшь  | Наследуй/реализуй               |
|---------------|---------------------------------|
| Entity        | `Entity<TProps>`                |
| Value Object  | `ValueObject<T>`                |
| Aggregate     | `AggregateRoot<TProps>`         |
| Factory       | `IEntityFactory<T, C, R>`       |
| Domain Event  | `BaseDomainEvent`               |
| Domain Error  | `DomainError`                   |
| Use Case      | `IUseCase<In, Out, Err>`        |
| Repository    | `IRepository<T>`                |
| Event Handler | `IEventHandler<T>`              |
| ACL           | `IAntiCorruptionLayer<E, D>`    |
| Идентификатор | `UniqueId.create()`             |
| Результат     | `Result.ok()` / `Result.fail()` |
| IoC-токен     | `createToken<T>("name")`        |
