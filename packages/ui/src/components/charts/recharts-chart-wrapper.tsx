import type { ReactElement, ReactNode } from "react"

import { Card, CardBody, CardHeader } from "@/components/ui"

/**
 * Пропсы generic обертки для Recharts-виджетов.
 */
export interface IRechartsChartWrapperProps {
    /** Заголовок виджета. */
    readonly title: string
    /** Состояние ожидания данных/инициализации. */
    readonly isLoading?: boolean
    /** Текст-заглушка во время загрузки. */
    readonly loadingText?: string
    /** Графический контент. */
    readonly children: ReactNode
}

/**
 * Универсальная карточка для Recharts-компонентов.
 *
 * @param props Конфигурация.
 * @returns Карточный блок с состоянием loading и theme-friendly стилями.
 */
export function RechartsChartWrapper(props: IRechartsChartWrapperProps): ReactElement {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold text-slate-900">{props.title}</h3>
            </CardHeader>
            <CardBody>
                {props.isLoading === true ? (
                    <p className="text-sm text-slate-600">{props.loadingText ?? "Loading chart..."}</p>
                ) : (
                    props.children
                )}
            </CardBody>
        </Card>
    )
}
