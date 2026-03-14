# JavaScript & Frontend — ASERG Research

> ASERG активно исследует JavaScript экосистему и React. Релевантно для нашего UI (React) и для анализа JS-кода клиентов.

## Ключевые работы

### React

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2023 | **Detecting Code Smells in React-based Web Apps** — Fabio Ferreira, Marco Tulio Valente | IST | Каталог code smells специфичных для React: Large Component, Complex State, Prop Drilling и др. |
| 2024 | **Refactoring React-based Web Apps** — Fabio Ferreira et al. | JSS | Каталог рефакторингов для React: Extract Component, Lift State Up, Replace State с Context и др. |

### JavaScript Evolution

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2015 | **Does Javascript Software Embrace Classes?** — Leonardo Silva et al. | SANER | Первое исследование adoption ES6 классов в JavaScript. |
| 2017 | **Identifying Classes in Legacy JavaScript Code** — Leonardo Silva et al. | JSEP | Идентификация класс-подобных структур в legacy JS (до ES6). |
| 2017 | **Refactoring Legacy JavaScript Code to Use Classes** — Leonardo Silva et al. | ICSR | Рефакторинг прототипного JS в ES6 классы: плюсы, минусы, подводные камни. |
| 2023 | **On the Usage of New JavaScript Features through Transpilers: The Babel Case** — Thiago Nicolini et al. | IEEE Software | Как Babel влияет на adoption новых JS-фич. |
| 2026 | **PromiseAwait: A Dataset of JavaScript Migrations from Promises to Async/Await** — Rafael Magesty et al. | FORGE | Датасет миграций Promise → async/await. |

### JavaScript API Deprecation

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2020 | **JavaScript API Deprecation in the Wild: A First Assessment** — Romulo Nascimento et al. | SANER | Первая оценка deprecation в JS. |
| 2021 | **JavaScript API Deprecation Landscape: A Survey and Mining Study** — Romulo Nascimento et al. | IEEE Software | Обзор deprecation практик в JavaScript экосистеме. |
| 2022 | **Exploring API Deprecation Evolution in JavaScript** — Romulo Nascimento et al. | SANER | Эволюция deprecation в JS пакетах. |

### Frontend Frameworks

| Год | Работа | Venue | Суть |
|-----|--------|-------|------|
| 2022 | **On the (Un-)Adoption of JavaScript Front-end Frameworks** — Fabio Ferreira et al. | SPE | Исследование adoption и abandonment JS-фреймворков (React, Angular, Vue). |
| 2018 | **AngularJS Performance: A Survey Study** — Miguel Ramos et al. | IEEE Software | Performance проблемы AngularJS. |

### PhD/Master Theses

- **Fabio da Silva Ferreira** (2023 PhD) — "Assisting JavaScript Front-End Developers in Maintaining and Evolving React-Based Applications"
- **Leonardo Humberto Silva** (2017 PhD) — "Identifying Classes in Legacy JavaScript Code"

## Применимость к CodeNautic

1. **React code smells каталог** → Ferreira 2023 — прямой вход для нашего DetectPatterns stage при анализе React-кода. Мы можем детектировать: Large Component, Complex State, Prop Drilling, неправильное использование useEffect
2. **React рефакторинги** → Ferreira 2024 — наш GenerateSuggestions может предлагать конкретные React-рефакторинги из каталога: "Extract this into a separate component", "Lift this state up"
3. **Самоприменимость** → Наш UI написан на React. Каталоги Ferreira можно применить для self-review нашего кода
4. **Promise → async/await** → PromiseAwait 2026: датасет для оценки, насколько хорошо наш pipeline детектирует устаревшие Promise-паттерны
5. **Framework adoption** → Ferreira 2022: понимание, почему команды мигрируют между фреймворками. Информирует наш анализ при обнаружении фреймворк-миграции в PR
