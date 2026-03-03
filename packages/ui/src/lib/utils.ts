export function cn(...values: Array<string | number | undefined | null | false>): string {
    return values
        .filter(
            (value): value is string | number =>
                value !== undefined && value !== null && value !== false,
        )
        .map((value) => value.toString())
        .join(" ")
}
