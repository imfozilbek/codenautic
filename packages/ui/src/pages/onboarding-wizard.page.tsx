import { type ReactElement, useState } from "react"
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import {
    FormNumberField,
    FormSelectField,
    FormSubmitButton,
    FormTextField,
    FormSwitchField,
    type IFormSelectOption,
} from "@/components/forms"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { showToastSuccess } from "@/lib/notifications/toast"

const SCAN_MODE_OPTIONS = ["incremental", "full", "delta"] as const
const SCAN_SCHEDULE_OPTIONS = ["manual", "hourly", "daily", "weekly"] as const

type TScanMode = (typeof SCAN_MODE_OPTIONS)[number]
type TScanSchedule = (typeof SCAN_SCHEDULE_OPTIONS)[number]

interface IOnboardingFormValues {
    /** URL репозитория для сканирования. */
    readonly repositoryUrl: string
    /** Режим сканирования. */
    readonly scanMode: TScanMode
    /** Режим расписания сканирования. */
    readonly scanSchedule: TScanSchedule
    /** Количество воркеров сканирования. */
    readonly scanThreads: number
    /** Складывать ли подпроекты. */
    readonly includeSubmodules: boolean
    /** Проверять ли историю git при первом запуске. */
    readonly includeHistory: boolean
    /** email для уведомлений (необязателен). */
    readonly notifyEmail: string
}

interface IOnboardingWizardPageProps {
    /** Callback после подтверждения запуска сканирования. */
    readonly onScanStart?: (values: IOnboardingFormValues) => void
}

const EMAIL_OPTIONAL_SCHEMA = z
    .string()
    .trim()
    .max(256, "Email слишком длинный")
    .refine(
        (value): boolean => value.length === 0 || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
        "Введите корректный email",
    )

const ONBOARDING_FORM_SCHEMA = z.object({
    repositoryUrl: z
        .string()
        .trim()
        .min(1, "Введите URL репозитория")
        .url("Введите корректный URL репозитория"),
    scanMode: z.enum(SCAN_MODE_OPTIONS),
    scanSchedule: z.enum(SCAN_SCHEDULE_OPTIONS),
    scanThreads: z
        .coerce
        .number()
        .int("Количество воркеров должно быть целым")
        .min(1, "Количество воркеров должно быть не меньше 1")
        .max(32, "Количество воркеров не должно превышать 32"),
    includeSubmodules: z.boolean(),
    includeHistory: z.boolean(),
    notifyEmail: EMAIL_OPTIONAL_SCHEMA,
})

const DEFAULT_ONBOARDING_VALUES: IOnboardingFormValues = {
    repositoryUrl: "",
    scanMode: "incremental",
    scanSchedule: "manual",
    scanThreads: 4,
    includeSubmodules: true,
    includeHistory: false,
    notifyEmail: "",
}

const WIZARD_STEPS = [
    {
        id: "paste",
        label: "Указать репозиторий",
        description: "Добавьте URL, выберите метод доступа и продолжите.",
    },
    {
        id: "configure",
        label: "Настроить сканирование",
        description: "Задайте режим, треды и опции качества.",
    },
    {
        id: "launch",
        label: "Запустить скан",
        description: "Проверьте параметры и стартаньте процесс.",
    },
] as const

const SCAN_MODE_SELECT_OPTIONS: ReadonlyArray<IFormSelectOption> = [
    {
        label: "Incremental",
        value: "incremental",
    },
    {
        label: "Full",
        value: "full",
    },
    {
        label: "Delta",
        value: "delta",
    },
]

const SCAN_SCHEDULE_SELECT_OPTIONS: ReadonlyArray<IFormSelectOption> = [
    {
        description: "Запуск только вручную",
        label: "Manual",
        value: "manual",
    },
    {
        description: "Каждый 1 час",
        label: "Hourly",
        value: "hourly",
    },
    {
        description: "Раз в день",
        label: "Daily",
        value: "daily",
    },
    {
        description: "Раз в неделю",
        label: "Weekly",
        value: "weekly",
    },
]

const STEP_FIELDS: Record<
    (typeof WIZARD_STEPS)[number]["id"],
    ReadonlyArray<keyof IOnboardingFormValues>
> = {
    paste: ["repositoryUrl"],
    configure: [
        "scanMode",
        "scanSchedule",
        "scanThreads",
        "includeSubmodules",
        "includeHistory",
        "notifyEmail",
    ],
    launch: [],
}

function formatBooleanForSummary(value: boolean): string {
    return value ? "Да" : "Нет"
}

/**
 * Экран multi-step мастера onboarding.
 *
 * @param props Колбек на запуск скана.
 * @returns Компонент wizard с валидацией шага.
 */
export function OnboardingWizardPage(props: IOnboardingWizardPageProps): ReactElement {
    const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)
    const [isStarted, setIsStarted] = useState(false)

    const form = useForm<IOnboardingFormValues, unknown, IOnboardingFormValues>({
        defaultValues: DEFAULT_ONBOARDING_VALUES,
        resolver: zodResolver(ONBOARDING_FORM_SCHEMA),
        mode: "onSubmit",
    })

    const activeStepId = WIZARD_STEPS[activeStep].id
    const isFinalStep = activeStep === WIZARD_STEPS.length - 1
    const scanModeOptions = SCAN_MODE_SELECT_OPTIONS
    const scheduleOptions = SCAN_SCHEDULE_SELECT_OPTIONS
    const values = form.watch()

    const validateCurrentStep = async (): Promise<boolean> => {
        const fieldsToValidate = STEP_FIELDS[activeStepId]
        if (fieldsToValidate.length === 0) {
            return true
        }

        const isValid = await form.trigger(fieldsToValidate)
        return isValid
    }

    const goNextStep = async (): Promise<void> => {
        if ((await validateCurrentStep()) !== true) {
            return
        }

        if (activeStep === 2) {
            return
        }

        setActiveStep((previous): 0 | 1 | 2 => (previous + 1) as 0 | 1 | 2)
    }

    const goPrevStep = (): void => {
        if (activeStep === 0) {
            return
        }

        setActiveStep((previous): 0 | 1 | 2 => (previous - 1) as 0 | 1 | 2)
    }

    const handleSubmit = (nextValues: IOnboardingFormValues): void => {
        setIsStarted(true)
        showToastSuccess("Сканирование репозитория запущено.")
        if (props.onScanStart !== undefined) {
            props.onScanStart(nextValues)
        }
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Repository Onboarding</h1>
            <p className="text-sm text-slate-600">
                Подключите новый репозиторий, проверьте параметры и запустите скан.
            </p>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        {WIZARD_STEPS.map((step, index): ReactElement => {
                            const isActive = index === activeStep
                            const isCompleted = index < activeStep

                            return (
                                <button
                                    className="rounded-md px-3 py-2 text-left text-xs leading-tight"
                                    disabled={index > activeStep}
                                    key={step.id}
                                    onClick={(): void => {
                                        if (index > activeStep) {
                                            return
                                        }

                                        setActiveStep(index as 0 | 1 | 2)
                                    }}
                                    type="button"
                                >
                                    <div
                                        className={`rounded-md px-2 py-2 ${isActive ? "bg-slate-900 text-white" : isCompleted ? "bg-slate-100 text-slate-900" : "bg-slate-50 text-slate-500"}`}
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wider">
                                            Шаг {index + 1}
                                        </p>
                                        <p className="text-sm font-semibold">{step.label}</p>
                                        <p className="text-xs">{step.description}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </CardHeader>
                <CardBody>
                    <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                        {activeStep === 0 ? (
                            <section className="space-y-3">
                                <FormTextField<IOnboardingFormValues, "repositoryUrl">
                                    control={form.control}
                                    id="repository-url"
                                    label="URL репозитория"
                                    name="repositoryUrl"
                                    helperText="Поддерживаются GitHub, GitLab, Bitbucket."
                                    inputProps={{
                                        placeholder: "https://github.com/owner/repository",
                                        type: "url",
                                    }}
                                />
                                {isStarted ? null : (
                                    <Alert color="primary">После запуска будет начат первичный скан.</Alert>
                                )}
                            </section>
                        ) : null}

                        {activeStep === 1 ? (
                            <section className="space-y-3">
                                <FormSelectField<IOnboardingFormValues, "scanMode">
                                    control={form.control}
                                    id="scan-mode"
                                    helperText="Incremental — быстрее, full — полная проверка."
                                    label="Режим сканирования"
                                    name="scanMode"
                                    options={scanModeOptions}
                                />
                                <FormSelectField<IOnboardingFormValues, "scanSchedule">
                                    control={form.control}
                                    id="scan-schedule"
                                    label="Расписание"
                                    name="scanSchedule"
                                    options={scheduleOptions}
                                />
                                <FormNumberField<IOnboardingFormValues, "scanThreads">
                                    control={form.control}
                                    id="scan-threads"
                                    helperText="1..32 параллельных воркера."
                                    inputProps={{
                                        min: 1,
                                        max: 32,
                                        placeholder: "4",
                                        size: "md",
                                    }}
                                    label="Количество воркеров"
                                    name="scanThreads"
                                />
                                <FormSwitchField<IOnboardingFormValues, "includeSubmodules">
                                    control={form.control}
                                    label="Включать сабмодули"
                                    name="includeSubmodules"
                                />
                                <FormSwitchField<IOnboardingFormValues, "includeHistory">
                                    control={form.control}
                                    helperText="Если включено, соберём больше индексов."
                                    label="Сканировать историю"
                                    name="includeHistory"
                                />
                                <FormTextField<IOnboardingFormValues, "notifyEmail">
                                    control={form.control}
                                    helperText="Email для уведомлений о статусе."
                                    id="notify-email"
                                    inputProps={{
                                        placeholder: "dev@company.com",
                                        type: "email",
                                    }}
                                    label="Email для уведомлений (необязательно)"
                                    name="notifyEmail"
                                />
                            </section>
                        ) : null}

                        {activeStep === 2 ? (
                            <section className="space-y-3">
                                <p className="text-sm font-semibold text-slate-800">
                                    Проверьте выбранные настройки:
                                </p>
                                <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
                                    <p className="text-sm">
                                        <span className="font-semibold">Repository:</span> {values.repositoryUrl}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Mode:</span> {values.scanMode}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Schedule:</span>{" "}
                                        {values.scanSchedule}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Workers:</span> {values.scanThreads}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Submodules:</span>{" "}
                                        {formatBooleanForSummary(values.includeSubmodules)}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">History:</span>{" "}
                                        {formatBooleanForSummary(values.includeHistory)}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Email:</span>{" "}
                                        {values.notifyEmail.length === 0 ? "не указан" : values.notifyEmail}
                                    </p>
                                </div>

                                {isStarted ? (
                                    <Alert color="success">
                                        Сканирование запущено. Вы можете повторить запуск после правок.
                                    </Alert>
                                ) : null}
                            </section>
                        ) : null}

                        <div className="flex items-center justify-between gap-2">
                            <Button
                                isDisabled={activeStep === 0}
                                onPress={(): void => {
                                    goPrevStep()
                                }}
                                type="button"
                                variant="light"
                            >
                                Назад
                            </Button>
                            {isFinalStep ? (
                                <FormSubmitButton
                                    buttonProps={{
                                        isDisabled: isStarted,
                                    }}
                                    submittingText="Запускаем..."
                                >
                                    Запустить сканирование
                                </FormSubmitButton>
                            ) : (
                                <Button
                                    onPress={(): void => {
                                        void goNextStep()
                                    }}
                                    type="button"
                                >
                                    Далее
                                </Button>
                            )}
                        </div>
                    </form>
                </CardBody>
            </Card>

        </section>
    )
}
