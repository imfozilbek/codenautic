import type { ReactElement } from "react"
import {
    Tabs as HeroUITabs,
    Tab as HeroUITab,
    type TabProps as HeroUITabProps,
    type TabsProps as HeroUITabsProps,
} from "@heroui/react"

/**
 * Свойства совместимых tab-ов с поддержкой legacy `title`-prop.
 */
export type TabProps = Omit<HeroUITabProps, "title"> & {
    /** Заголовок вкладки как legacy-поле. */
    readonly title?: string
}

/** Свойства tabs-контейнера. */
export type TabsProps = HeroUITabsProps

/**
 * Обертка `Tab` с fallback для `title`.
 *
 * @param props Свойства вкладки.
 * @returns HeroUI Tab.
 */
export function Tab(props: TabProps): ReactElement {
    const { title, children, ...tabProps } = props

    return (
        <HeroUITab
            {...tabProps}
            {...(title === undefined ? {} : { title })}
        >
            {children}
        </HeroUITab>
    )
}

export const Tabs = HeroUITabs
