## Запрещено (сводка)

> Архитектурные и неавтоматизируемые запреты. Prettier/ESLint-правила опущены — они ловятся автоматически.

- Бизнес-логика в controllers/adapters
- Импорт domain → infrastructure
- `new ConcreteClass()` внутри use cases
- Мутация domain objects вне определённых методов
- Внешние типы в domain layer
- Anemic entities
- Циклические зависимости между пакетами
- Hardcoded secrets
- Мёртвый код
- Заглушки / частичная реализация
- AI-атрибуция в коммитах
