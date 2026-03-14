# Software Metrics & Complexity — ASERG Research

> Метрики кода — фундамент для CodeCity visualization, Predictive Analytics и ScoreRisk.

## Ключевые работы

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2015 | **Validating Metric Thresholds with Developers** — Paloma Oliveira et al. | ICSME | Валидация пороговых значений метрик с реальными разработчиками. Какие threshold'ы осмысленны, какие произвольны. |
| 2022 | **How and Why We End Up with Complex Methods** — Mateus Lopes, Andre Hora | ESE | Исследование: как и почему методы становятся сложными. Multi-language (Java, Python, JS). Эволюция complexity со временем. |
| 2020 | **Characteristics of Method Extractions in Java** — Andre Hora, Romain Robbes | ESE | Характеристики Extract Method рефакторингов. Какие методы извлекают, когда, почему. |
| 2016 | **Identifying Utility Functions using Random Forests** — Tamara Mendes et al. | SANER | ML для идентификации utility функций — разделение utility от business logic. |
| 2020 | **What Are the Characteristics of Popular APIs?** — Caroline Lima, Andre Hora | SQJ | Метрики популярных API: размер, документация, стабильность, examples. |
| 2018 | **Assessing the Threat of Untracked Changes** — Andre Hora et al. | ICSE | Угрозы от untracked changes (не в VCS): конфигурации, env, инфраструктура. |

### PhD/Master Thesis

- **Paloma Oliveira** (2015) — "Extracting Relative Thresholds for Source Code Metrics"

## Применимость к CodeNautic

1. **Metric thresholds** → Oliveira 2015: наш ScoreRisk stage использует метрики (complexity, churn, LOC). Какие пороги осмысленны? Oliveira показывает что relative thresholds лучше absolute — мы должны калибровать пороги per-project
2. **Method complexity evolution** → Lopes 2022: как методы становятся сложными. Наш Predictive Analytics может предсказывать: "этот метод растёт — через 3 спринта станет проблемным"
3. **Extract Method characteristics** → Hora 2020: когда предлагать Extract Method в GenerateSuggestions — не для любого длинного метода, а с учётом характеристик из исследования
4. **Utility functions** → Mendes 2016: различение utility/business logic. Наш AST-анализ может классифицировать функции и применять разные правила ревью
5. **Untracked changes** → Hora 2018 (ICSE!): изменения вне VCS. Наш pipeline фокусируется на diff, но Hora показывает что конфиги/env тоже критичны. Потенциал для расширения
