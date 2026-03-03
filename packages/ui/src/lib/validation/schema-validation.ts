import DOMPurify from "isomorphic-dompurify"
import {type SafeParseError, z, type ZodError, type ZodTypeAny} from "zod"

/**
 * Результат валидации с нормализованным описанием ошибки.
 */
export interface IZodParseResult<TData> {
    /** Прошла ли валидация. */
    readonly success: boolean
    /** Данные после парсинга. */
    readonly data?: TData
    /** Сообщение ошибки (если есть). */
    readonly error?: string
}

/**
 * Результат валидации массива enum из неизвестного значения.
 */
export interface IEnumValidationResult<TValue extends string> {
    /** Валидный enum value или undefined. */
    readonly value?: TValue
    /** Сообщение ошибки валидации. */
    readonly message?: string
}

/**
 * Результат очистки пользовательской строки.
 */
export interface ITextSanitizerResult {
    /** Исходное значение. */
    readonly source: string
    /** Очищенное значение после sanitize. */
    readonly value: string
}

/**
 * Проверяет значение через любой zod schema.
 *
 * @param schema Схема валидации.
 * @param payload Данные для валидации.
 * @returns Нормализованный результат.
 */
export function parseSchemaOrError<TSchema extends ZodTypeAny>(
    schema: TSchema,
    payload: unknown,
): IZodParseResult<z.infer<TSchema>> {
    const parseResult = schema.safeParse(payload)
    if (parseResult.success === true) {
        return {
            success: true,
            data: parseResult.data,
        }
    }

    return {
        success: false,
        error: extractFirstIssueMessage(parseResult),
    }
}

/**
 * Строит строгую zod-схему enum для списка значений.
 *
 * @param values Допустимые значения.
 * @returns zod enum schema.
 */
export function createEnumSchema<TValues extends readonly [string, ...string[]]>(
    values: TValues,
): ReturnType<typeof z.enum<TValues>> {
    return z.enum(values)
}

/**
 * Проверяет enum значение через runtime список.
 *
 * @param values Допустимые значения.
 * @param rawValue Значение из UI/URL.
 * @returns Result с нормализованным значением.
 */
export function parseEnumValue<TValues extends readonly string[]>(
    values: TValues,
    rawValue: unknown,
): IEnumValidationResult<TValues[number]> {
    if (typeof rawValue !== "string") {
        return {}
    }

    if (values.includes(rawValue) === false) {
        return {
            message: `Недопустимое значение "${rawValue}".`,
        }
    }

    return {
        value: rawValue as TValues[number],
    }
}

/**
 * Проверяет, является ли значение валидным enum-значением.
 *
 * @param values Набор допустимых значений.
 * @param value Проверяемое значение.
 * @returns true, если значение входит в values.
 */
export function isEnumValue<TValues extends readonly string[]>(
    values: TValues,
    value: unknown,
): value is TValues[number] {
    return typeof value === "string" && values.includes(value)
}

/**
 * Возвращает строку без HTML-тегов и с trim.
 *
 * @param value Исходная строка.
 * @returns Очищенная строка.
 */
export function sanitizeText(value: string): string {
    const source = value.trim()
    if (source.length === 0) {
        return source
    }

    if (typeof window === "undefined") {
        return source.replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    }

    return DOMPurify.sanitize(source, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    })
}

/**
 * Возвращает нормализованный результат для sanitize.
 *
 * @param value Исходная строка.
 * @returns Результат до/после очистки.
 */
export function sanitizeTextInput(value: string): ITextSanitizerResult {
    const sanitized = sanitizeText(value)

    return {
        source: value,
        value: sanitized,
    }
}

/**
 * Схема для безопасной валидации текстового ввода.
 *
 * @returns Zod-схема с sanitize и trim.
 */
export function createSanitizedStringSchema(): z.ZodEffects<z.ZodString, string, string> {
    return z
        .string()
        .trim()
        .transform((value: string): string => sanitizeText(value))
}

/**
 * Схема для safe optional текстового ввода.
 *
 * @returns Zod-схема optional с sanitize.
 */
export function createOptionalSanitizedStringSchema(): z.ZodEffects<
    z.ZodOptional<z.ZodString>,
    string | undefined,
    string | undefined
> {
    return z
        .string()
        .optional()
        .transform((value: string | undefined): string | undefined =>
            value === undefined ? undefined : sanitizeText(value),
        )
}

/**
 * Извлекает первое сообщение ошибки валидатора.
 */
function extractFirstIssueMessage<T>(
    parseResult: SafeParseError<T> | {error: ZodError<T>},
): string {
    const issues = parseResult.error.issues
    const firstIssue = issues[0]
    if (firstIssue === undefined) {
        return "Ошибка валидации"
    }

    return `${firstIssue.path.join(".")} — ${firstIssue.message}`
}
