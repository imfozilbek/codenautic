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
    /** Центрированная узкая (system-health, session-recovery). */
    centered: "mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8",
} as const

/**
 * Стилизация нативных form-элементов для визуальной консистентности.
 * Используется для `<select>` и `<input>`, которые не обёрнуты в HeroUI.
 */
export const NATIVE_FORM = {
    /** Нативный `<select>` с HeroUI-совместимым оформлением. */
    select: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
    /** Нативный `<input type="text">` с HeroUI-совместимым оформлением. */
    input: "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
} as const
