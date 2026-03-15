/**
 * Семантические spacing-токены для вертикальных отступов.
 * Маппятся на Tailwind `space-y-*` утилиты.
 *
 * @example
 * ```tsx
 * <section className={SPACING.section}>
 *     <Card />
 *     <Card />
 * </section>
 * ```
 */
export const SPACING = {
    /** Отступ между крупными секциями страницы (space-y-8). */
    page: "space-y-8",
    /** Отступ между секциями внутри страницы (space-y-6). */
    section: "space-y-6",
    /** Отступ между элементами внутри карточки/секции (space-y-4). */
    card: "space-y-4",
    /** Отступ между элементами списка (space-y-3). */
    list: "space-y-3",
    /** Компактный отступ для тесных контекстов (space-y-2). */
    compact: "space-y-2",
    /** Минимальный отступ между inline элементами (space-y-1.5). */
    tight: "space-y-1.5",
} as const

/**
 * Стандартные layout-варианты для корневого элемента страницы.
 *
 * @example
 * ```tsx
 * <section className={PAGE_LAYOUT.standard}>
 *     <h1 className={TYPOGRAPHY.pageTitle}>Settings</h1>
 *     <Card>...</Card>
 * </section>
 * ```
 */
export const PAGE_LAYOUT = {
    /** Стандартная полноширинная страница (settings, help, reports). */
    standard: "space-y-6",
    /** Полноширинная с увеличенными отступами (mission control). */
    spacious: "space-y-8",
    /** Fluid — edge-to-edge для table/list страниц. Minimal vertical spacing. */
    fluid: "space-y-4",
    /** Центрированная узкая (system-health, session-recovery). */
    centered: "mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8",
} as const

/**
 * Семантические gap-токены для горизонтальных и grid отступов.
 * Маппятся на Tailwind `gap-*` утилиты.
 *
 * @example
 * ```tsx
 * <div className={`flex items-center ${GAP.compact}`}>
 *     <Icon />
 *     <span>Label</span>
 * </div>
 * ```
 */
export const GAP = {
    /** Icon + label, breadcrumb сегменты (gap-1.5). */
    tight: "gap-1.5",
    /** Inline кнопки, chip группы, form rows (gap-2). */
    compact: "gap-2",
    /** Внутри карточек, дети секций (gap-3). */
    card: "gap-3",
    /** Колонки grid, крупные секции (gap-4). */
    section: "gap-4",
} as const

/**
 * Семантические padding-токены для внутренних отступов.
 * Маппятся на Tailwind `p-*` / `px-* py-*` утилиты.
 *
 * @example
 * ```tsx
 * <div className={`rounded-lg border ${PADDING.section}`}>
 *     <h2>Section</h2>
 * </div>
 * ```
 */
export const PADDING = {
    /** Мелкие inline элементы, badges (px-2 py-1). */
    chip: "px-2 py-1",
    /** Form inputs, compact cards (px-3 py-2). */
    input: "px-3 py-2",
    /** Стандартное тело карточки (p-3). */
    card: "p-3",
    /** Крупные секции, content area (p-4). */
    section: "p-4",
    /** Page-level padding, empty states (p-6). */
    page: "p-6",
} as const

/**
 * Стилизация нативных form-элементов для визуальной консистентности.
 * Используется для `<select>` и `<input>`, которые не обёрнуты в HeroUI.
 */
export const NATIVE_FORM = {
    /** Нативный `<select>` с HeroUI-совместимым оформлением. */
    select: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
    /** Нативный `<input type="text">` с HeroUI-совместимым оформлением. */
    input: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted",
    /** Компактный input для graph-embedded контекстов (xs, rounded). */
    compact: "w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground",
} as const

/**
 * Визуальные стили поверхностей карточек.
 * Определяют border, shadow и background для разных типов карточек.
 *
 * @example
 * ```tsx
 * <Card className={`h-full ${CARD_SURFACE.elevated}`}>
 *     <CardBody>Important content</CardBody>
 * </Card>
 * ```
 */
export const CARD_SURFACE = {
    /** Default — left accent border, subtle shadow. */
    default: "border-l-2 border-l-accent shadow-sm",
    /** Elevated — full border, hover shadow lift. */
    elevated: "border border-border shadow-sm transition-shadow hover:shadow-md",
    /** Flat — subtle background, no border/shadow. */
    flat: "bg-surface-tertiary",
    /** Section — border-box для группировки контента (form sections). */
    section: "rounded-lg border border-border/50 bg-surface-tertiary p-4",
} as const
