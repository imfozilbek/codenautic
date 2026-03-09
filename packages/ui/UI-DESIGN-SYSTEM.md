# UI Design System Baseline

> Канонический baseline для генерации дизайна в Stitch/Figma и для реализации в `packages/ui`.
> Документ фиксирует минимум, который должен соблюдаться до генерации отдельных экранов.

## Источники истины

- Токены и базовые переменные: `src/app/globals.css`
- Режимы темы и пресеты: `src/lib/theme/theme-provider.tsx`
- UI-примитивы: `src/components/ui/*`
- Form primitives: `src/components/forms/*`
- Layout patterns: `src/components/layout/*`
- System states: `src/components/skeletons/*`, `src/components/infrastructure/system-state-card.tsx`

## 1. Токены

### 1.1 Типографика и радиусы

- `--font-display`: `"Space Grotesk", var(--font-sans)` — заголовки (pageTitle, sectionTitle)
- `--font-sans`: `"Geist Sans", "IBM Plex Sans", "Segoe UI", sans-serif` — body text
- `--font-mono`: `"Geist Mono", "IBM Plex Mono", "SFMono-Regular", "Consolas", monospace` — code
- `--radius-sm`: `0.375rem`
- `--radius-md`: `0.625rem`
- `--radius-lg`: `0.875rem`

### 1.1a Typography Scale (`src/lib/constants/typography.ts`)

| Token          | Classes                                                | Usage                     |
| -------------- | ------------------------------------------------------ | ------------------------- |
| `pageTitle`    | `font-display text-2xl font-semibold text-foreground`  | Заголовок страницы        |
| `sectionTitle` | `font-display text-base font-semibold text-foreground` | Заголовок секции/карточки |
| `body`         | `text-sm text-foreground`                              | Основной текст            |
| `bodyMuted`    | `text-sm text-text-secondary`                          | Вторичный текст           |
| `caption`      | `text-xs text-text-subtle`                             | Подписи, timestamps       |
| `label`        | `text-sm font-medium text-foreground`                  | Labels для form-полей     |

### 1.1b Spacing Tokens

| Token               | Value            | Usage                      |
| ------------------- | ---------------- | -------------------------- |
| `--spacing-xs`      | `0.25rem` (4px)  | Micro gaps                 |
| `--spacing-sm`      | `0.5rem` (8px)   | Element gaps               |
| `--spacing-md`      | `0.75rem` (12px) | Component internal padding |
| `--spacing-lg`      | `1rem` (16px)    | Card padding               |
| `--spacing-xl`      | `1.5rem` (24px)  | Section spacing            |
| `--spacing-2xl`     | `2rem` (32px)    | Page-level spacing         |
| `--spacing-section` | `1.5rem`         | Between sections           |
| `--spacing-card`    | `1rem`           | Inside cards               |

### 1.1c Shadow Tokens

| Token               | Value                            | Usage               |
| ------------------- | -------------------------------- | ------------------- |
| `--shadow-card`     | `0 1px 3px oklch(0 0 0 / 0.06)`  | Card elevation      |
| `--shadow-dropdown` | `0 4px 12px oklch(0 0 0 / 0.1)`  | Dropdowns, popovers |
| `--shadow-modal`    | `0 8px 24px oklch(0 0 0 / 0.14)` | Modal overlays      |

### 1.2 Семантическая палитра (базовый light)

- `--background`: `oklch(0.989 0.008 218)`
- `--foreground`: `oklch(0.238 0.026 256)`
- `--surface`: `oklch(0.998 0.004 220)`
- `--surface-muted`: `oklch(0.965 0.014 225)`
- `--border`: `oklch(0.905 0.014 234)`
- `--ring`: `oklch(0.673 0.171 243)`
- `--primary`: `oklch(0.653 0.181 253)`
- `--primary-foreground`: `oklch(0.982 0.01 253)`
- `--accent`: `oklch(0.838 0.129 175)`
- `--accent-foreground`: `oklch(0.274 0.033 186)`
- `--success`: `oklch(0.702 0.164 151)`
- `--warning`: `oklch(0.809 0.145 83)`
- `--danger`: `oklch(0.646 0.214 24)`

### 1.3 Семантическая палитра (базовый dark)

- `--background`: `oklch(0.2 0.03 256)`
- `--foreground`: `oklch(0.94 0.012 230)`
- `--surface`: `oklch(0.27 0.03 252)`
- `--surface-muted`: `oklch(0.33 0.028 247)`
- `--border`: `oklch(0.44 0.03 245)`
- `--ring`: `oklch(0.76 0.128 232)`
- `--primary`: `oklch(0.774 0.134 243)`
- `--primary-foreground`: `oklch(0.248 0.03 252)`
- `--accent`: `oklch(0.785 0.101 173)`
- `--accent-foreground`: `oklch(0.236 0.03 181)`
- `--success`: `oklch(0.784 0.109 154)`
- `--warning`: `oklch(0.81 0.132 80)`
- `--danger`: `oklch(0.73 0.172 25)`

### 1.4 Режимы и пресеты

- Режимы: `light | dark | system`
- Preset по умолчанию: `moonstone`
- Поддерживаемые пресеты: `moonstone`, `cobalt`, `forest`, `sunrise`, `graphite`, `aqua`

## 2. Типографика и плотность

- Основной UI-текст: `--font-sans`
- Код, метрики, token-значения: `--font-mono`
- Enterprise-плотность: компактные интервалы, приоритет информативности над декоративностью
- Иерархия: заголовок страницы -> секция -> карточка/таблица -> мета-текст

## 3. Каталог компонентов

### 3.1 Базовые UI-примитивы

- `alert`, `avatar`, `button`, `card`, `checkbox`, `chip`
- `drawer`, `dropdown`, `input`, `modal`, `radio-group`
- `select`, `skeleton`, `switch`, `table`, `tabs`, `textarea`, `tooltip`

### 3.2 Form primitives

- `form-text-field`, `form-textarea-field`, `form-select-field`, `form-number-field`
- `form-password-field`, `form-checkbox-field`, `form-switch-field`, `form-radio-group-field`
- `form-submit-button`

### 3.3 Layout primitives

- `dashboard-layout`, `sidebar`, `sidebar-nav`, `mobile-sidebar`
- `header`, `user-menu`, `settings-layout`, `settings-nav`, `theme-toggle`

## 4. Матрица состояний (обязательная для каждого route-level экрана)

- `default`
- `loading`
- `empty`
- `error`
- `degraded` (внешний провайдер/частичная недоступность)
- `permission-restricted` (hidden/disabled + reason hint)

Для интерактивных компонентов дополнительно:

- `hover`, `active`, `focus-visible`, `disabled`, `success`, `warning`, `danger`

## 5. HeroUI Wrapper Strategy

Each HeroUI component is wrapped with a specific strategy depending on the value we add:

| Strategy        | Components                            | Description                                                                                                       |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Passthrough** | Card, Tooltip, Avatar, Chip, Skeleton | Raw re-export, no custom logic                                                                                    |
| **Adapter**     | Checkbox, Switch, Modal               | Thin legacy bridge (`onValueChange` → `onChange`, `isInvalid` data-attr). Built via `createToggleWrapper` factory |
| **Extended**    | Button, Input, Table                  | Value-add beyond HeroUI: additional variants, compound patterns                                                   |

**Deprecated props migration:**

- `disabled` → `isDisabled` (HeroUI v3 convention)
- `onValueChange` → `onChange` (adapter bridge handles backwards compat)

## 6. Motion System

### Variant Selection

| Variant                    | When to use                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- |
| `FADE_VARIANTS`            | Alerts, toasts, notification banners — appear/disappear without spatial movement |
| `SCALE_FADE_VARIANTS`      | Modals, popovers — content that "grows" into view from a focal point             |
| `PAGE_TRANSITION_VARIANTS` | Route transitions (via `AnimatedMount`) — subtle horizontal slide + fade         |

### Duration Selection

- **150ms** — Micro-interactions (hover, active states)
- **200ms** — Element transitions (alerts, chips appear/disappear)
- **300ms** — Component transitions (modals, drawers)
- **400ms** — Page transitions, complex animations

### `useReducedMotion` Requirements

All animated components MUST respect `prefers-reduced-motion`. When reduced motion is preferred:

- Replace movement with opacity-only transitions
- Use `AnimatedMount` and `AnimatedAlert` which handle this automatically

### Component Usage

| Component       | Purpose                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `AnimatedMount` | Route-level page transition wrapper (keyed by `location.pathname`)         |
| `AnimatedAlert` | Notification banners with enter/exit animation (controlled by `isVisible`) |

## 7. Правила использования в Stitch

1. Сначала генерировать foundation (tokens + components + states), затем экраны.
2. Во всех промптах явно указывать:
    - multi-tenant scope bar (org + repo/team + date range),
    - deep-link CTA на целевые экраны,
    - полный набор состояний `loading/empty/error/degraded`.
3. Не генерировать новый визуальный язык поверх текущих токенов без отдельного решения.
4. Использовать только зафиксированные семантические роли цветов (`primary/accent/success/warning/danger`).
5. Для dashboard и operational экранов держать высокую информационную плотность и clear severity cues.

## 6. Минимальный чеклист перед генерацией батча экранов

- Выбран preset и режим (или `system`) для референса.
- Подтвержден набор компонентов, доступных для сценария.
- Подтверждены обязательные состояния для каждого экрана.
- Зафиксированы deep-link переходы между экранами в рамках сценария.
- Проверено, что microcopy и терминология консистентны (tenant/repo/CCR/issues/jobs).
