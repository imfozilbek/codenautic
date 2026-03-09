/**
 * Конфигурация Recharts animation props для smooth data morph при range change.
 * Применяется к Line, Bar, Area, Pie компонентам Recharts.
 *
 * @example
 * ```tsx
 * <Line {...CHART_DATA_TRANSITION} dataKey="value" />
 * ```
 */
export const CHART_DATA_TRANSITION = {
    animationDuration: 400,
    animationEasing: "ease-in-out",
    isAnimationActive: true,
} as const

/**
 * Конфигурация animation props с отключенной анимацией (для reduced motion).
 */
export const CHART_DATA_TRANSITION_NONE = {
    animationDuration: 0,
    isAnimationActive: false,
} as const
