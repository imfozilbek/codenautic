/**
 * Опция для select-поля.
 */
export interface IFormSelectOption {
    /** Значение опции. */
    readonly value: string
    /** Лейбл опции. */
    readonly label: string
    /** Дополнительный подпоясняющий текст. */
    readonly description?: string
    /** Блокирован ли выбор пункта. */
    readonly isDisabled?: boolean
}

/**
 * Опция для radio-group.
 */
export interface IFormRadioOption {
    /** Значение радиокнопки. */
    readonly value: string
    /** Отображаемый текст. */
    readonly label: string
    /** Отключена ли опция. */
    readonly isDisabled?: boolean
}
