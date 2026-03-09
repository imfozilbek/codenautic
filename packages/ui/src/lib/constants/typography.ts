/**
 * Семантическая типографическая шкала для UI.
 * Новые компоненты должны использовать `TYPOGRAPHY.*` вместо raw Tailwind классов.
 *
 * @example
 * ```tsx
 * <h1 className={TYPOGRAPHY.pageTitle}>Dashboard</h1>
 * <p className={TYPOGRAPHY.pageSubtitle}>Overview of your workspace.</p>
 * <span className={TYPOGRAPHY.micro}>NEW</span>
 * ```
 */
export const TYPOGRAPHY = {
    /** Заголовок страницы (Space Grotesk, 2xl, semibold). */
    pageTitle: "font-display text-2xl font-semibold text-foreground",
    /** Подзаголовок страницы / контекст под pageTitle (sm, muted). */
    pageSubtitle: "text-sm text-text-secondary",
    /** Заголовок секции/карточки (Space Grotesk, base, semibold). */
    sectionTitle: "font-display text-base font-semibold text-foreground",
    /** Подзаголовок секции (sm, medium weight). */
    sectionSubtitle: "text-sm font-medium text-foreground",
    /** Основной текст (sm). */
    body: "text-sm text-foreground",
    /** Вторичный текст (sm, muted). */
    bodyMuted: "text-sm text-text-secondary",
    /** Подпись / caption (xs, subtle). */
    caption: "text-xs text-text-subtle",
    /** Label для form-полей (sm, medium weight). */
    label: "text-sm font-medium text-foreground",
    /** Микро-текст для badges, status indicators (10px, semibold, uppercase, tracking). */
    micro: "text-[10px] font-semibold uppercase tracking-wide",
    /** Микро-текст для inline hints, keyboard shortcuts (11px, subtle). */
    microHint: "text-[11px] text-text-subtle",
    /** Микро-текст для inline descriptions (11px, muted). */
    microMuted: "text-[11px] text-muted-foreground",
    /** Крупный числовой дисплей (4xl, bold). */
    display: "text-4xl font-bold",
    /** Uppercase section label / overline (xs, semibold, uppercase, tracking). */
    overline: "text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground",
    /** Крупный заголовок для центрированных splash-экранов (3xl, semibold, tight). */
    splash: "text-3xl font-semibold tracking-tight",
} as const
