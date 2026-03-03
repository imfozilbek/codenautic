import {useDebounce} from "@/lib/hooks/use-debounce"
import {type UseQueryOptions, useQuery, type UseQueryResult, type QueryKey} from "@tanstack/react-query"

/**
 * Параметры debounced search + React Query хука.
 */
export interface IUseDebouncedSearchOptions<TData, TError = Error> {
    /** Исходный search-строка. */
    readonly search: string
    /** Ключ запроса. */
    readonly queryKey: QueryKey
    /** Debounce delay. */
    readonly delayMs?: number
    /** Функция запроса данных. */
    readonly queryFn: (args: {search: string; signal: AbortSignal}) => Promise<TData>
    /** Базовые опции React Query. */
    readonly options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, "queryKey" | "queryFn">
    /** Разрешение запроса при пустом вводе. */
    readonly allowEmpty?: boolean
}

/**
 * Результат DebouncedSearch-хука.
 */
export interface IUseDebouncedSearchResult<TData, TError> extends UseQueryResult<TData, TError> {
    /** Исходный поисковый текст. */
    readonly search: string
    /** Debounced поисковый текст. */
    readonly debouncedSearch: string
}

/**
 * React Query хук с debounce строки поиска.
 *
 * @param options Параметры.
 * @returns Result Query + debounced значение.
 */
export function useDebouncedSearch<TData, TError = Error>(
    options: IUseDebouncedSearchOptions<TData, TError>,
): IUseDebouncedSearchResult<TData, TError> {
    const debouncedSearch = useDebounce(options.search, options.delayMs ?? 400)
    const queryResult = useQuery({
        queryKey: [...options.queryKey, debouncedSearch] as QueryKey,
        queryFn: async ({signal}): Promise<TData> => {
            return options.queryFn({search: debouncedSearch, signal})
        },
        enabled: options.allowEmpty === true ? options.options?.enabled ?? true : debouncedSearch.length > 0,
        ...options.options,
    })

    return {
        ...queryResult,
        search: options.search,
        debouncedSearch,
    }
}
