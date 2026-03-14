# Developer Collaboration & Open Source — ASERG Research

> ASERG исследует как разработчики сотрудничают, что делает проекты успешными/провальными. Релевантно для Team Metrics и Knowledge Map.

## Ключевые работы

### Developer Collaboration Networks

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2022 | **How do developers collaborate? Investigating GitHub heterogeneous networks** — Gabriel Oliveira et al. | SQJ | Анализ гетерогенных сетей сотрудничества на GitHub: issues, PRs, commits, reviews. |
| 2021 | **Mining the Technical Roles of GitHub Users** — João Montandon et al. | IST | Классификация ролей разработчиков: committer, reviewer, issue reporter, по активности. |
| 2019 | **Identifying Experts in Software Libraries and Frameworks** — João Montandon et al. | MSR | Алгоритмы идентификации экспертов по библиотекам на основе contribution patterns. |
| 2020 | **What Skills do IT Companies look for in New Developers?** — João Montandon et al. | IST | Анализ Stack Overflow Jobs: какие навыки ищут компании. |

### Open Source Maintenance & Survival

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2017 | **Why Modern Open Source Projects Fail** — Jailton Coelho, Marco Tulio Valente | FSE | Причины провала open source проектов. |
| 2018 | **Identifying Unmaintained Projects in GitHub** — Jailton Coelho et al. | ESEM | Автоматическое определение unmaintained проектов: метрики и алгоритмы. |
| 2020 | **Is this GitHub Project Maintained?** — Jailton Coelho et al. | IST | Измерение уровня maintenance activity. |
| 2019 | **On the Abandonment and Survival of Open Source Projects** — Guilherme Avelino et al. | ESEM | Факторы выживания: truck factor, community size, response time. |
| 2020 | **Turnover in Open-Source Projects: The Case of Core Developers** — Fabio Ferreira et al. | SBES | Что происходит когда уходят core developers. |

### GitHub Dynamics

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2016 | **Understanding the Factors that Impact the Popularity of GitHub Repositories** — Hudson Borges et al. | ICSME | Факторы популярности: stars, forks, contributors. |
| 2018 | **What's in a GitHub Star?** — Hudson Silva, Marco Tulio Valente | JSS | Что значат GitHub stars: мотивации starring, корреляция с качеством. |
| 2019 | **How do Developers Promote Open Source Projects?** — Hudson Borges, Marco Tulio Valente | IEEE Computer | Стратегии продвижения open source проектов. |
| 2021 | **Googling for Software Development** — Andre Hora | MSR | Что ищут разработчики и что находят: паттерны поиска информации. |

### Developer Search & Learning

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2021 | **APISonar: Mining API usage examples** — Andre Hora | SPE | Автоматический майнинг примеров использования API из open source. |
| 2021 | **Characterizing Top Ranked Code Examples in Google** — Andre Hora | JSS | Характеристики лучших примеров кода в поиске Google. |
| 2022 | **How Are Framework Code Samples Maintained?** — Gabriel Menezes et al. | JSS | Как поддерживаются code samples для фреймворков (Android, Spring Boot). |
| 2015 | **Automatic Detection of System-Specific Conventions** — Andre Hora et al. | JSS | Автоматическое обнаружение неписаных конвенций кодовой базы, неизвестных разработчикам. |

### PhD Theses

- **Hudson Borges** (2018) — "Characterizing and Predicting the Popularity of GitHub Projects"
- **Jailton Coelho** (2019) — "Identifying and Characterizing Unmaintained Projects in GitHub"
- **João Eduardo Montandon** (2021) — "Mining the Technical Skills of Open Source Developers"

## Применимость к CodeNautic

1. **Collaboration networks** → Oliveira 2022: граф сотрудничества разработчиков → наш Contributor Collaboration Graph в CodeCity
2. **Technical roles** → Montandon 2021: классификация ролей → наш Knowledge Map может показывать кто reviewer, кто committer, кто issue reporter
3. **Project health** → Coelho 2018/2020: метрики maintenance activity → наш System Health dashboard для мониторинга репозиториев клиентов
4. **Turnover impact** → Ferreira 2020: влияние ухода core developers → наш Bus Factor prediction: "если X уйдёт, модуль Y останется без maintainer"
5. **System-specific conventions** → Hora 2015: автоматическое обнаружение конвенций, которые не задокументированы. Это прямо наш ApplyCustomRules stage — мы можем автоматически обнаруживать и предлагать правила на основе паттернов кодовой базы
6. **API usage examples** → APISonar: контекст для GenerateSuggestions — предлагать исправления с примерами правильного использования API
