import type { ChangeEvent, ReactElement } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"

/**
 * Каналы доставки prediction-alert.
 */
export type TAlertConfigChannel = "slack" | "email" | "webhook"

/**
 * Частота доставки prediction-alert.
 */
export type TAlertConfigFrequency = "realtime" | "daily" | "weekly"

/**
 * Модуль для per-module alert configuration.
 */
export interface IAlertConfigDialogModule {
    readonly moduleId: string
    readonly label: string
    readonly enabledByDefault: boolean
}

/**
 * Итоговая конфигурация alert-настроек.
 */
export interface IAlertConfigDialogValue {
    readonly confidenceThreshold: number
    readonly issueIncreaseThreshold: number
    readonly channels: ReadonlyArray<TAlertConfigChannel>
    readonly frequency: TAlertConfigFrequency
    readonly moduleIds: ReadonlyArray<string>
}

/**
 * Пропсы alert-конфигуратора.
 */
export interface IAlertConfigDialogProps {
    readonly modules: ReadonlyArray<IAlertConfigDialogModule>
    readonly defaultValue?: IAlertConfigDialogValue
    readonly onSave?: (value: IAlertConfigDialogValue) => void
}

const DEFAULT_CHANNELS: ReadonlyArray<TAlertConfigChannel> = ["slack", "email"]
const DEFAULT_FREQUENCY: TAlertConfigFrequency = "daily"
const DEFAULT_CONFIDENCE_THRESHOLD = 75
const DEFAULT_ISSUE_INCREASE_THRESHOLD = 3

function buildInitialModuleState(
    modules: ReadonlyArray<IAlertConfigDialogModule>,
    moduleIds: ReadonlyArray<string> | undefined,
): Readonly<Record<string, boolean>> {
    const moduleState: Record<string, boolean> = {}
    modules.forEach((module): void => {
        const explicitValue = moduleIds?.includes(module.moduleId) ?? false
        moduleState[module.moduleId] =
            moduleIds === undefined ? module.enabledByDefault : explicitValue
    })
    return moduleState
}

function normalizeThreshold(value: number, fallback: number): number {
    if (Number.isNaN(value)) {
        return fallback
    }
    return Math.max(1, Math.min(100, Math.round(value)))
}

/**
 * Диалог конфигурации prediction alerts.
 *
 * @param props Набор модулей и callback сохранения.
 * @returns React-компонент alert-конфигуратора.
 */
export function AlertConfigDialog(props: IAlertConfigDialogProps): ReactElement {
    const { t } = useTranslation(["code-city"])
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(
        props.defaultValue?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
    )
    const [issueIncreaseThreshold, setIssueIncreaseThreshold] = useState<number>(
        props.defaultValue?.issueIncreaseThreshold ?? DEFAULT_ISSUE_INCREASE_THRESHOLD,
    )
    const [channels, setChannels] = useState<ReadonlyArray<TAlertConfigChannel>>(
        props.defaultValue?.channels ?? DEFAULT_CHANNELS,
    )
    const [frequency, setFrequency] = useState<TAlertConfigFrequency>(
        props.defaultValue?.frequency ?? DEFAULT_FREQUENCY,
    )
    const [moduleState, setModuleState] = useState<Readonly<Record<string, boolean>>>(
        buildInitialModuleState(props.modules, props.defaultValue?.moduleIds),
    )

    useEffect((): void => {
        setConfidenceThreshold(
            props.defaultValue?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
        )
        setIssueIncreaseThreshold(
            props.defaultValue?.issueIncreaseThreshold ?? DEFAULT_ISSUE_INCREASE_THRESHOLD,
        )
        setChannels(props.defaultValue?.channels ?? DEFAULT_CHANNELS)
        setFrequency(props.defaultValue?.frequency ?? DEFAULT_FREQUENCY)
        setModuleState(buildInitialModuleState(props.modules, props.defaultValue?.moduleIds))
    }, [props.defaultValue, props.modules])

    const handleChannelToggle = (channel: TAlertConfigChannel): void => {
        setChannels((currentChannels): ReadonlyArray<TAlertConfigChannel> => {
            if (currentChannels.includes(channel)) {
                const nextChannels = currentChannels.filter((entry): boolean => entry !== channel)
                return nextChannels.length === 0 ? currentChannels : nextChannels
            }
            return [...currentChannels, channel]
        })
    }

    const handleSave = (): void => {
        const selectedModuleIds = props.modules
            .filter((module): boolean => moduleState[module.moduleId] === true)
            .map((module): string => module.moduleId)

        props.onSave?.({
            channels,
            confidenceThreshold: normalizeThreshold(
                confidenceThreshold,
                DEFAULT_CONFIDENCE_THRESHOLD,
            ),
            frequency,
            issueIncreaseThreshold: normalizeThreshold(
                issueIncreaseThreshold,
                DEFAULT_ISSUE_INCREASE_THRESHOLD,
            ),
            moduleIds: selectedModuleIds,
        })
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className={TYPOGRAPHY.cardTitle}>{t("code-city:alertConfigComp.title")}</p>
            <p className={`mt-1 ${TYPOGRAPHY.captionMuted}`}>
                {t("code-city:alertConfigComp.description")}
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                    <span className={TYPOGRAPHY.overline}>
                        {t("code-city:alertConfigComp.confidenceThreshold")}
                    </span>
                    <input
                        aria-label={t("code-city:alertConfigComp.ariaConfidenceThreshold")}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                        min={1}
                        max={100}
                        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                            setConfidenceThreshold(Number(event.currentTarget.value))
                        }}
                        type="number"
                        value={String(confidenceThreshold)}
                    />
                </label>

                <label className="space-y-1">
                    <span className={TYPOGRAPHY.overline}>
                        {t("code-city:alertConfigComp.issueIncreaseThreshold")}
                    </span>
                    <input
                        aria-label={t("code-city:alertConfigComp.ariaIssueIncreaseThreshold")}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                        min={1}
                        max={20}
                        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                            setIssueIncreaseThreshold(Number(event.currentTarget.value))
                        }}
                        type="number"
                        value={String(issueIncreaseThreshold)}
                    />
                </label>
            </div>

            <fieldset
                aria-label={t("code-city:alertConfigComp.ariaChannels")}
                className="mt-3 space-y-1"
            >
                <legend className={TYPOGRAPHY.overline}>
                    {t("code-city:alertConfigComp.channels")}
                </legend>
                {(["slack", "email", "webhook"] as const).map((channel): ReactElement => {
                    return (
                        <label
                            className="flex items-center gap-2 text-xs text-foreground"
                            key={channel}
                        >
                            <input
                                checked={channels.includes(channel)}
                                onChange={(): void => {
                                    handleChannelToggle(channel)
                                }}
                                type="checkbox"
                            />
                            {channel}
                        </label>
                    )
                })}
            </fieldset>

            <label className="mt-3 block space-y-1">
                <span className={TYPOGRAPHY.overline}>
                    {t("code-city:alertConfigComp.deliveryFrequency")}
                </span>
                <select
                    aria-label={t("code-city:alertConfigComp.ariaFrequency")}
                    className={NATIVE_FORM.select}
                    value={frequency}
                    onChange={(event): void => {
                        const nextFrequency = event.currentTarget.value
                        if (
                            nextFrequency === "realtime" ||
                            nextFrequency === "daily" ||
                            nextFrequency === "weekly"
                        ) {
                            setFrequency(nextFrequency)
                        }
                    }}
                >
                    <option value="realtime">
                        {t("code-city:alertConfigComp.frequencyOptions.realtime")}
                    </option>
                    <option value="daily">
                        {t("code-city:alertConfigComp.frequencyOptions.daily")}
                    </option>
                    <option value="weekly">
                        {t("code-city:alertConfigComp.frequencyOptions.weekly")}
                    </option>
                </select>
            </label>

            <fieldset
                aria-label={t("code-city:alertConfigComp.ariaModules")}
                className="mt-3 space-y-1"
            >
                <legend className={TYPOGRAPHY.overline}>
                    {t("code-city:alertConfigComp.perModuleGranularity")}
                </legend>
                {props.modules.map((module): ReactElement => {
                    return (
                        <label
                            className="flex items-center gap-2 text-xs text-foreground"
                            key={module.moduleId}
                        >
                            <input
                                checked={moduleState[module.moduleId] === true}
                                onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                    const nextChecked = event.currentTarget.checked
                                    setModuleState(
                                        (currentState): Readonly<Record<string, boolean>> => {
                                            return {
                                                ...currentState,
                                                [module.moduleId]: nextChecked,
                                            }
                                        },
                                    )
                                }}
                                type="checkbox"
                            />
                            {module.label}
                        </label>
                    )
                })}
            </fieldset>

            <button
                aria-label={t("code-city:alertConfigComp.ariaSave")}
                className="mt-3 rounded border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-on-primary"
                onClick={handleSave}
                type="button"
            >
                {t("code-city:alertConfigComp.saveAlertConfig")}
            </button>
        </section>
    )
}
