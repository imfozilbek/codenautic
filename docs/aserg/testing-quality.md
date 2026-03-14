# Testing & Test Quality — ASERG Research

> Тестирование — ещё одно сильное направление ASERG. Релевантно для нашего pipeline (CheckImplementation) и для оценки качества тестов в PR.

## Ключевые работы

### Test Quality & Coverage

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2022 | **Characterizing High-Quality Test Methods: A First Empirical Study** — Victor Veloso, Andre Hora | MSR | Эмпирические характеристики качественных тестов. Какие свойства отличают хорошие тесты от плохих. |
| 2021 | **What Code Is Deliberately Excluded from Test Coverage and Why?** — Andre Hora | MSR | **ACM Distinguished Paper Award**. Какой код намеренно исключают из coverage и почему. |
| 2023 | **Excluding Code from Test Coverage: Practices, Motivations, and Impact** — Andre Hora | ESE | Расширенный journal version — практики, мотивации, влияние исключения кода из coverage. |

### Testing Practices

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2023 | **Snapshot Testing in Practice: Benefits and Drawbacks** — Victor Gazzinelli Cruz et al. | JSS | Когда snapshot testing полезен, когда вреден. Паттерны использования в React-проектах. |
| 2023 | **How Developers Implement Property-Based Tests** — Arthur Corgozinho et al. | ICSME | Как разработчики пишут property-based тесты. Паттерны и антипаттерны. |
| 2020 | **Assessing Mock Classes: An Empirical Study** — Gustavo Pereira, Andre Hora | ICSME | Эмпирическая оценка mock-классов: когда мокирование помогает, когда вредит. |
| 2022 | **How and Why Developers Migrate Python Tests** — Lívia Almeida, Andre Hora | SANER | Миграция тестов: причины, паттерны, сложности. |

### BDD & Test Datasets

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2026 | **GivenWhenThen: A Dataset of BDD Test Scenarios Mined from Open Source Projects** — Luciano Belo et al. | MSR | Датасет BDD-сценариев из open source. Given/When/Then паттерны. |

### PhD/Master Theses

- **Victor Pezzi Gazzinelli Cruz** (2024) — "Understanding Snapshot Testing in Practice"
- **Isadora de Oliveira** (2026) — "Property-Based Testing in Python: Empirical Insights"

## Применимость к CodeNautic

1. **Качество тестов в PR** → Veloso 2022 определяет метрики качественных тестов. Наш pipeline (CheckImplementation) может оценивать тесты в PR: достаточно ли хороши, покрывают ли новый код
2. **Coverage exclusions** → Hora 2021/2023: понимание, какой код намеренно не покрыт. Наш pipeline не должен предлагать "добавь тесты" для кода, который разработчики сознательно исключили
3. **Snapshot testing предупреждения** → Cruz 2023: если PR добавляет snapshot тесты для сложной логики — CodeNautic может предупредить "snapshot тесты хрупкие, рассмотри unit tests"
4. **Mock assessment** → Pereira 2020: наш pipeline может оценивать качество моков в тестах — over-mocking снижает ценность тестов
5. **BDD dataset** → GivenWhenThen 2026: бенчмарк для оценки, следуют ли тесты в PR BDD-паттернам (when/then нейминг — наш стандарт)
6. **Property-based testing** → Corgozinho 2023: если PR содержит property-based тесты, pipeline может проверить их correctness
