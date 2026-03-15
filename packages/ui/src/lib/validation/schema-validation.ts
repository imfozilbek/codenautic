import DOMPurify from "isomorphic-dompurify"
import { type ZodError, z } from "zod"

/**
 * Результат валидации с нормализованным описанием ошибки.
 */
export type IZodParseResult<TData> =
    | {
          /** Прошла ли валидация. */
          readonly success: true
          /** Данные после парсинга. */
          readonly data: TData
          /** Сообщение ошибки (если есть). */
          readonly error?: undefined
      }
    | {
          /** Прошла ли валидация. */
          readonly success: false
          /** Данные после парсинга. */
          readonly data?: undefined
          /** Сообщение ошибки (если есть). */
          readonly error: string
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
export function parseSchemaOrError<TData>(
    schema: z.ZodType<TData>,
    payload: unknown,
): IZodParseResult<TData> {
    const parseResult = schema.safeParse(payload)
    if (parseResult.success === true) {
        return {
            success: true,
            data: parseResult.data,
        }
    }

    return {
        success: false,
        error: extractFirstIssueMessage(parseResult.error),
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
): z.ZodType<TValues[number]> {
    const lookup = new Set(values)

    return z.string().refine((value): value is TValues[number] => {
        return typeof value === "string" && lookup.has(value)
    }, "Некорректное enum значение") as z.ZodType<TValues[number]>
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
export function createSanitizedStringSchema(): z.ZodType<string> {
    return z.preprocess((value: unknown): unknown => {
        if (typeof value !== "string") {
            return value
        }

        return sanitizeText(value)
    }, z.string())
}

/**
 * Схема для safe optional текстового ввода.
 *
 * @returns Zod-схема optional с sanitize.
 */
export function createOptionalSanitizedStringSchema(): z.ZodType<string | undefined> {
    return z.preprocess((value: unknown): unknown => {
        if (typeof value !== "string") {
            return value
        }

        return sanitizeText(value)
    }, z.string().optional())
}

/**
 * Извлекает первое сообщение ошибки валидатора.
 */
function extractFirstIssueMessage<T>(error: ZodError<T>): string {
    const firstIssue = error.issues[0]
    if (firstIssue === undefined) {
        return "Ошибка валидации"
    }

    const path = firstIssue.path
    const parsedPath =
        path.length === 0 ? "value" : path.map((item): string => String(item)).join(".")

    return `${parsedPath} — ${firstIssue.message}`
}
