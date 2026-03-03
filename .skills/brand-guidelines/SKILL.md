# Brand Guidelines — UI (CodeNautic / OpenPayment baseline)

> Источник: merged в рамках `WEB-MIG-001` (выполнение миграции на HeroUI v3).

Документ используется как единый справочник визуальной системы для UI-пакета.

## 1) Color system

### 1.1 OKLch-палитра темы

- Переход на `oklch(...)` для всех новых и migrated компонентов.
- Поддерживать тёмную и светлую ветки через режим темы.
- Базовая связка переменных:
    - `--background`
    - `--foreground`
    - `--surface`
    - `--surface-muted`
    - `--border`
    - `--ring`
    - `--primary`
    - `--primary-foreground`
    - `--accent`
    - `--accent-foreground`
    - `--success`
    - `--warning`
    - `--danger`

### 1.2 Пресеты HeroUI-like

Поддерживаются пресеты: `moonstone`, `cobalt`, `forest`, `sunrise`, `graphite`, `aqua`.
Смена пресета не требует перезагрузки и применяет обе ветки (`light`/`dark`).

### 1.3 Status colors

- Успех: `--success`
- Предупреждение: `--warning`
- Ошибка: `--danger`

## 2) Component conventions

### 2.1 Кнопка (Button)

- Основной акцент: `--primary`.
- Второстепенный акцент: `--accent`.
- Радиус: умеренный (не больше `0.75rem`).
- Высота: минимум `2rem` для плотных таблиц и `2.5rem` для форм.
- Контраст: обязательный fallback `outline`/`hover` для keyboard focus (минимум 3:1 на фоне).

### 2.2 Карточка (Card)

- Внешний контур: `--border`.
- Поверхностный фон: `--surface`.
- Фоновая зона с пониженной контрастностью: `--surface-muted` для метрик, блоков статусов, hint-секций.

### 2.3 Таблица/грид (Table)

- Header:
  - фон `--surface`.
  - разделители `--border`.
- Строки: alternation через `--surface-muted` only on secondary emphasis.
- Ключевые статусы отображать через `Chip`/`Badge` с цветами из `status colors`.

### 2.4 Chips / status badges

- Для статусов используем:
  - `success` (green-ok),
  - `warning` (amber/warn),
  - `danger` (red/error),
  - neutral on `--surface-muted`/`--foreground`.
- Иконка/метка обязательны для лучшей доступности.

## 3) Typography and spacing

- Шрифты:
    - Заголовки: `var(--font-sans)`.
    - Код: `var(--font-mono)` для payload/JSON.
- Использовать системную иерархию `h1..h3`, затем `body`, `small`.
- Базовая вертикальная rhythm: кратность 4px / 8px / 16px.

## 4) UX + motion

- Анимация без лишних эффектов:
    - `fade`/`slide` на раскрытии меню.
    - `scale` только для фокуса interactive-компонентов.
- Нет "тяжёлых" глобальных transition.

## 5) Dashboard/metrics visual language

- Metric formatting:
    - Числа с локализованными разделителями (использовать `Intl.NumberFormat`).
    - Сравнение трендов с контрастным текстом и semantic color.
- Cards для метрик должны использовать `--surface` + `--surface-muted` акцент и явный статус.

## 6) Провайдеры и presets controls

- Theme toggle содержит:
    - `light` / `dark` / `system` режим.
    - сетку пресетов с быстрым превью.
- Пресет-смена и режим-тоггл:
    - должна работать без редиректов и без перезагрузки страницы.
    - поддержка клавиатурного управления.

