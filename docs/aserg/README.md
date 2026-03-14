# ASERG Research — Релевантные темы для CodeNautic

> [Applied Software Engineering Research Group](https://aserg.labsoft.dcc.ufmg.br/) — UFMG, Бразилия.
> Руководитель: Marco Tulio Valente.

Лаборатория ASERG — одна из сильнейших в мире по эмпирическому исследованию software engineering.
Их работы напрямую пересекаются с ядром CodeNautic (code review, code intelligence, визуализация) и с трендом автономных coding agents (Minions).

## Карта релевантности

| Область ASERG | Релевантность для CodeNautic | Релевантность для Minions |
|---|---|---|
| **AI Coding Agents** | Косвенная (мы ревьюим код агентов) | Прямая (конфигурация, миграции) |
| **Code Smells & Refactoring** | Прямая (detection в pipeline) | Средняя (агент может рефакторить) |
| **Technical Debt** | Прямая (SATD mining, LTD) | Средняя (агент может фиксить) |
| **Truck Factor / Bus Factor** | Прямая (Knowledge Map, Bus Factor) | Нет |
| **Code Authorship & Experts** | Прямая (Suggested Reviewers) | Нет |
| **CodeCity / Visualization** | Прямая (GoCity = наш CodeCity) | Нет |
| **Co-Change / Temporal Coupling** | Прямая (Causal Analysis) | Нет |
| **Architecture Conformance** | Прямая (Architecture Drift) | Нет |
| **API Breaking Changes** | Прямая (pipeline detection) | Средняя (агент должен не ломать) |
| **Defect Prediction** | Прямая (Predictive Analytics) | Нет |
| **Refactoring-Aware Reviews** | Прямая (RAID = наш подход) | Нет |
| **Testing & Test Quality** | Прямая (CheckImplementation) | Средняя (агент должен писать тесты) |
| **JavaScript / Frontend** | Прямая (React smells, рефакторинги) | Средняя (агент пишет JS/TS) |
| **Developer Collaboration** | Прямая (Team Metrics, Knowledge Map) | Нет |
| **Software Metrics** | Прямая (ScoreRisk, CodeCity) | Нет |

## Файлы (14 тем)

| Файл | Тема |
|---|---|
| [ai-coding-agents.md](./ai-coding-agents.md) | AI Coding Agents — конфигурация, миграции, качество |
| [code-smells-refactoring.md](./code-smells-refactoring.md) | Code Smells, Refactoring Detection, Refactoring Graphs |
| [technical-debt.md](./technical-debt.md) | Self-Admitted Technical Debt, LTD Framework |
| [truck-factor-authorship.md](./truck-factor-authorship.md) | Truck Factor, Code Authorship, File Experts |
| [codecity-visualization.md](./codecity-visualization.md) | GoCity, Software Visualization |
| [co-change-temporal-coupling.md](./co-change-temporal-coupling.md) | Co-Change Patterns, Temporal Coupling |
| [architecture-conformance.md](./architecture-conformance.md) | Architecture Violations, Drift Detection |
| [api-evolution.md](./api-evolution.md) | API Breaking Changes, Deprecation, Migration |
| [defect-prediction.md](./defect-prediction.md) | Defect Prediction, Performance Regression |
| [code-review-tools.md](./code-review-tools.md) | RAID, Refactoring-Aware Code Reviews |
| [testing-quality.md](./testing-quality.md) | Test Quality, Coverage, Mocking, Snapshot Testing, BDD |
| [javascript-frontend.md](./javascript-frontend.md) | React Code Smells, JS Evolution, Framework Adoption |
| [developer-collaboration.md](./developer-collaboration.md) | Collaboration Networks, OS Maintenance, GitHub Dynamics |
| [software-metrics.md](./software-metrics.md) | Metric Thresholds, Complexity Evolution, Utility Functions |

## Статистика покрытия

- **~100+ публикаций** проанализировано (2003-2026)
- **14 тематических файлов** с маппингом на features CodeNautic
- **3 ACM Distinguished Paper Awards** в покрытых работах
- **15+ PhD/Master theses** процитировано
