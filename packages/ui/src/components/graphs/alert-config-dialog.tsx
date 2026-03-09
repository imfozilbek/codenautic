import type { ChangeEvent, ReactElement } from "react"
import { useEffect, useState } from "react"

import { NATIVE_FORM } from "@/lib/constants/spacing"

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
            <p className="text-sm font-semibold text-foreground">Alert config dialog</p>
            <p className="mt-1 text-xs text-muted-foreground">
                Configure prediction alerts by threshold, channel, delivery frequency and module
                scope.
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Confidence threshold
                    </span>
                    <input
                        aria-label="Alert confidence threshold"
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Issue increase threshold
                    </span>
                    <input
                        aria-label="Alert issue increase threshold"
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

            <fieldset aria-label="Alert channels" className="mt-3 space-y-1">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Channels
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
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Delivery frequency
                </span>
                <select
                    aria-label="Alert frequency"
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
                    <option value="realtime">realtime</option>
                    <option value="daily">daily</option>
                    <option value="weekly">weekly</option>
                </select>
            </label>

            <fieldset aria-label="Alert modules" className="mt-3 space-y-1">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Per-module granularity
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
                aria-label="Save prediction alert configuration"
                className="mt-3 rounded border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-on-primary"
                onClick={handleSave}
                type="button"
            >
                Save alert config
            </button>
        </section>
    )
}
