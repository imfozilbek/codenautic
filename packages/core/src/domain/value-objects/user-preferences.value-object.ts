/**
 * Available UI themes for user profile.
 */
export const USER_THEME = {
    LIGHT: "LIGHT",
    DARK: "DARK",
    SYSTEM: "SYSTEM",
} as const

/**
 * Literal theme type.
 */
export type UserTheme = (typeof USER_THEME)[keyof typeof USER_THEME]

/**
 * Normalized input for user preferences.
 */
export interface IUserPreferencesInput {
    theme?: string
    language?: string
    receiveEmailNotifications?: boolean
}

/**
 * Internal persistence shape for user preferences.
 */
export interface IUserPreferencesProps {
    readonly theme: UserTheme
    readonly language: string
    readonly receiveEmailNotifications: boolean
}

/**
 * Immutable user preferences value object.
 */
export class UserPreferences {
    private readonly themeValue: UserTheme
    private readonly languageValue: string
    private readonly receiveEmailNotificationsValue: boolean

    /**
     * Creates user preferences value object.
     *
     * @param input Raw preferences input.
     */
    private constructor(input: IUserPreferencesProps) {
        this.themeValue = input.theme
        this.languageValue = input.language
        this.receiveEmailNotificationsValue = input.receiveEmailNotifications
        Object.freeze(this)
    }

    /**
     * Creates immutable preferences.
     *
     * @param input Raw preference input.
     * @returns Immutable preferences.
     */
    public static create(input: IUserPreferencesInput = {}): UserPreferences {
        return new UserPreferences({
            theme: normalizeTheme(input.theme),
            language: normalizeLanguage(input.language),
            receiveEmailNotifications: Boolean(input.receiveEmailNotifications ?? true),
        })
    }

    /**
     * Theme for UI rendering.
     *
     * @returns Theme constant.
     */
    public get theme(): UserTheme {
        return this.themeValue
    }

    /**
     * Preferred language code.
     *
     * @returns ISO language code.
     */
    public get language(): string {
        return this.languageValue
    }

    /**
     * Flag controlling whether to receive email notifications.
     *
     * @returns True when enabled.
     */
    public get receiveEmailNotifications(): boolean {
        return this.receiveEmailNotificationsValue
    }

    /**
     * Converts value object to plain object.
     *
     * @returns Serializable representation.
     */
    public toJSON(): IUserPreferencesProps {
        return {
            theme: this.themeValue,
            language: this.languageValue,
            receiveEmailNotifications: this.receiveEmailNotificationsValue,
        }
    }
}

/**
 * Normalizes theme field and validates supported variants.
 *
 * @param value Raw theme.
 * @returns Theme with default fallback.
 */
function normalizeTheme(value: string | undefined): UserTheme {
    const normalizedTheme = value === undefined ? USER_THEME.SYSTEM : value.trim().toUpperCase()

    if (normalizedTheme.length === 0) {
        return USER_THEME.SYSTEM
    }

    return isUserTheme(normalizedTheme) ? normalizedTheme : USER_THEME.SYSTEM
}

/**
 * Normalizes and validates language.
 *
 * @param value Raw language.
 * @returns Normalized language.
 */
function normalizeLanguage(value: string | undefined): string {
    if (value === undefined) {
        return "en"
    }

    const normalizedLanguage = value.trim().toLowerCase()

    if (normalizedLanguage.length === 0) {
        throw new Error("Language cannot be empty")
    }

    if (!isLanguageCandidate(normalizedLanguage)) {
        throw new Error(`Unsupported language: ${value}`)
    }

    return normalizedLanguage
}

/**
 * Checks theme literal.
 *
 * @param value Candidate theme.
 * @returns True when supported.
 */
function isUserTheme(value: string): value is UserTheme {
    return Object.values(USER_THEME).includes(value as UserTheme)
}

/**
 * Accepts ISO-style language with optional territory.
 *
 * @param value Language candidate.
 * @returns True when format looks valid.
 */
function isLanguageCandidate(value: string): boolean {
    return /^[a-z]{2}(-[a-z]{2})?$/.test(value)
}
