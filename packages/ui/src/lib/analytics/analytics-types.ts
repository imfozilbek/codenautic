export const ANALYTICS_EVENT_NAMES = {
    keyAction: "key_action",
    funnelStep: "funnel_step",
    dropOff: "drop_off",
    timeToFirstValue: "time_to_first_value",
} as const

/** Названия всех событий аналитики, поддерживаемых SDK. */
export type TAnalyticsEventName =
    (typeof ANALYTICS_EVENT_NAMES)[keyof typeof ANALYTICS_EVENT_NAMES]

/** Режим передачи в аналитику. */
export type TAnalyticsConsent = "granted" | "denied" | "pending"

/** Корреляционные идентификаторы события для сквозной трассировки. */
export interface IAnalyticsCorrelationIds {
    /** Идентификатор tenant/организации. */
    readonly tenantId?: string
    /** Идентификатор пользователя. */
    readonly userId?: string
    /** Идентификатор текущей сессии. */
    readonly sessionId: string
    /** Идентификатор сценария/цепочки событий для корреляции. */
    readonly correlationId: string
}

/** Payload для key action событий. */
export interface IAnalyticsKeyActionPayload {
    /** Действие пользователя (нажать кнопку, открыть вкладку). */
    readonly action: string
    /** Компонент/элемент, на котором произошло действие. */
    readonly target?: string
    /** Экран/страница, на которой произошло событие. */
    readonly location?: string
    /** Дополнительный контекст действия. */
    readonly details?: Record<string, unknown>
}

/** Payload для funnel step событий. */
export interface IAnalyticsFunnelStepPayload {
    /** Название воронки/конверсионного пути. */
    readonly funnel: string
    /** Номер шага воронки (начинается с 1). */
    readonly stepIndex: number
    /** Читаемое имя шага. */
    readonly stepName: string
    /** Значение шага для дроп-офф аналитики. */
    readonly status?: "entered" | "completed" | "abandoned"
}

/** Payload для drop-off событий. */
export interface IAnalyticsDropOffPayload {
    /** Название воронки или процесса. */
    readonly funnel: string
    /** Причина ухода/прерывания. */
    readonly reason: string
    /** Текущий шаг, на котором произошёл drop-off. */
    readonly stepName?: string
}

/** Payload для метрики time-to-first-value. */
export interface IAnalyticsTimeToFirstValuePayload {
    /** Название бизнес-события/воронки. */
    readonly funnel: string
    /** Сколько миллисекунд до первой ценности. */
    readonly millisecondsToValue: number
    /** Дополнительный контекст для разбора времени. */
    readonly details?: Record<string, unknown>
}

/** Полезная нагрузка для конкретного события. */
export interface IAnalyticsPayloadByName {
    /** Key Action. */
    readonly [ANALYTICS_EVENT_NAMES.keyAction]: IAnalyticsKeyActionPayload
    /** Funnel Step. */
    readonly [ANALYTICS_EVENT_NAMES.funnelStep]: IAnalyticsFunnelStepPayload
    /** Drop-off. */
    readonly [ANALYTICS_EVENT_NAMES.dropOff]: IAnalyticsDropOffPayload
    /** Time-to-first-value. */
    readonly [ANALYTICS_EVENT_NAMES.timeToFirstValue]: IAnalyticsTimeToFirstValuePayload
}

/** Типизированный payload по любому поддерживаемому событию. */
export type IAnalyticsEventPayload = IAnalyticsPayloadByName[TAnalyticsEventName]

/** Событие аналатики в очереди отправки. */
export interface IAnalyticsEvent {
    /** Внутренний детерминированный идентификатор события. */
    readonly id: string
    /** Название события по схеме. */
    readonly name: TAnalyticsEventName
    /** Unix timestamp в ms. */
    readonly occurredAt: number
    /** Версия схемы события. */
    readonly schemaVersion: number
    /** Корреляционные ids, авто-добавляемые SDK. */
    readonly correlation: IAnalyticsCorrelationIds
    /** Типизированный payload. */
    readonly payload: Readonly<IAnalyticsEventPayload>
}

/** Request body для отправки батча на backend или в OSS буфер. */
export interface IAnalyticsBatchRequest {
    /** Отправляемые события. */
    readonly events: ReadonlyArray<IAnalyticsEvent>
    /** Время формирования пакета. */
    readonly sentAt: number
}
