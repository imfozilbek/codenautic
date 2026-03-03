import type { ReactElement } from "react"

import { GitProviderCard, type IGitProviderCardProps } from "./git-provider-card"

/**
 * Props списка Git провайдеров.
 */
export interface IGitProvidersListProps {
    /** Провайдеры для отрисовки. */
    readonly providers: ReadonlyArray<IGitProviderCardProps>
}

/**
 * Список подключений Git providers.
 *
 * @param props Набор провайдеров.
 * @returns Сетка карточек провайдеров.
 */
export function GitProvidersList(props: IGitProvidersListProps): ReactElement {
    return (
        <section className="grid gap-3 md:grid-cols-2">
            {props.providers.map(
                (provider): ReactElement => (
                    <GitProviderCard key={provider.provider} {...provider} />
                ),
            )}
        </section>
    )
}
