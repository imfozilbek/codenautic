import { type ReactElement, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Chip } from "@/components/ui"
import {
    FormNumberField,
    FormRadioGroupField,
    FormSelectField,
    FormSubmitButton,
    FormTextareaField,
    FormTextField,
    FormSwitchField,
    type IFormSelectOption,
} from "@/components/forms"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { z } from "zod"

import { showToastSuccess } from "@/lib/notifications/toast"

const SCAN_MODE_OPTIONS = ["incremental", "full", "delta"] as const
const SCAN_SCHEDULE_OPTIONS = ["manual", "hourly", "daily", "weekly"] as const
const ONBOARDING_MODE_OPTIONS = ["single", "bulk"] as const
const GIT_PROVIDER_OPTIONS = ["github", "gitlab", "bitbucket"] as const
const ONBOARDING_TEMPLATE_IDS = [
    "custom",
    "security-baseline",
    "quality-scan",
    "fast-onboarding",
] as const
const CUSTOM_TEMPLATE_ID = ONBOARDING_TEMPLATE_IDS[0]

type TScanMode = (typeof SCAN_MODE_OPTIONS)[number]
type TScanSchedule = (typeof SCAN_SCHEDULE_OPTIONS)[number]
type TOnboardingMode = (typeof ONBOARDING_MODE_OPTIONS)[number]
type TGitProvider = (typeof GIT_PROVIDER_OPTIONS)[number]
type TBulkScanStatus = "queued" | "running" | "paused" | "completed" | "error" | "cancelled"
type TOnboardingTemplateId = (typeof ONBOARDING_TEMPLATE_IDS)[number]

interface IOnboardingTemplate {
    /** Идентификатор шаблона. */
    readonly id: TOnboardingTemplateId
    /** Название шаблона. */
    readonly name: string
    /** Версия шаблона. */
    readonly version: string
    /** Короткое описание шаблона. */
    readonly description: string
    /** Пресет правил сканирования. */
    readonly rulesPreset: string
    /** Режим сканирования. */
    readonly scanMode: TScanMode
    /** Каденс сканирования. */
    readonly scanSchedule: TScanSchedule
    /** Число воркеров. */
    readonly scanThreads: number
    /** Подмешиваем сабмодули. */
    readonly includeSubmodules: boolean
    /** Сканировать историю. */
    readonly includeHistory: boolean
    /** Email по умолчанию для уведомлений. */
    readonly notifyEmail: string
    /** Теги для репозиториев. */
    readonly tags: ReadonlyArray<string>
}

interface IOnboardingTemplateFormState {
    /** Режим сканирования. */
    readonly scanMode: TScanMode
    /** Расписание сканирования. */
    readonly scanSchedule: TScanSchedule
    /** Число воркеров. */
    readonly scanThreads: number
    /** Подмешиваем сабмодули. */
    readonly includeSubmodules: boolean
    /** Сканировать историю. */
    readonly includeHistory: boolean
    /** Email для уведомлений. */
    readonly notifyEmail: string
    /** Теги после нормализации. */
    readonly tags: ReadonlyArray<string>
}

interface IOnboardingTemplateAuditEntry {
    /** Идентификатор примененного шаблона. */
    readonly templateId: TOnboardingTemplateId
    /** Название шаблона. */
    readonly templateName: string
    /** Версия шаблона. */
    readonly templateVersion: string
    /** Время применения. */
    readonly appliedAt: string
    /** Состояние до применения. */
    readonly before: IOnboardingTemplateFormState
    /** Состояние после применения. */
    readonly after: IOnboardingTemplateFormState
}

export interface IOnboardingAppliedTemplateMeta {
    /** Идентификатор источника конфигурации. */
    readonly id: TOnboardingTemplateId
    /** Название источника конфигурации. */
    readonly name: string
    /** Версия шаблона. */
    readonly version: string
    /** Preset правил. */
    readonly rulesPreset: string
    /** Набор тегов в виде массива. */
    readonly tags: ReadonlyArray<string>
}

interface IBulkRepositoryParseIssue {
    /** Номер строки с некорректным значением. */
    readonly line: number
    /** Некорректное значение. */
    readonly value: string
}

interface IParsedBulkRepositoryList {
    /** Нормализованный список валидных URL. */
    readonly repositories: ReadonlyArray<string>
    /** Список проблемных строк. */
    readonly invalidLines: ReadonlyArray<IBulkRepositoryParseIssue>
}

interface IBulkScanJob {
    /** Идентификатор задачи сканирования. */
    readonly id: string
    /** URL репозитория в этой задаче. */
    readonly repositoryUrl: string
    /** Текущий статус задачи. */
    readonly status: TBulkScanStatus
    /** Прогресс выполнения (0..100). */
    readonly progress: number
    /** Краткая ошибка, если статус error. */
    readonly errorMessage?: string
    /** Детальные причины ошибки. */
    readonly errorDetails?: ReadonlyArray<string>
}

interface IBulkScanSummary {
    /** Задачи в работе. */
    readonly running: number
    /** Задачи в очереди. */
    readonly queued: number
    /** Задачи на паузе. */
    readonly paused: number
    /** Задачи с ошибкой. */
    readonly error: number
    /** Завершенные задачи. */
    readonly completed: number
    /** Отмененные задачи. */
    readonly cancelled: number
}

interface IOnboardingFormValues {
    /** Git-провайдер для подключения репозитория. */
    readonly provider: TGitProvider
    /** Идентификатор выбранного шаблона. */
    readonly onboardingTemplateId: TOnboardingTemplateId
    /** Режим онбординга: одиночный или массовый. */
    readonly onboardingMode: TOnboardingMode
    /** URL репозитория для одиночного режима. */
    readonly repositoryUrl: string
    /** Сырая строка со списком репозиториев для bulk. */
    readonly repositoryUrlList: string
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
    /** Теги репозитория или шаблона. */
    readonly tags: string
    /** Email для уведомлений (необязателен). */
    readonly notifyEmail: string
}

export interface IOnboardingScanStartPayload extends IOnboardingFormValues {
    /** Целевые репозитории для сканирования. */
    readonly targetRepositories: ReadonlyArray<string>
    /** Метаинформация примененного шаблона. */
    readonly appliedTemplate: IOnboardingAppliedTemplateMeta
}

interface IOnboardingWizardPageProps {
    /** Callback после подтверждения запуска сканирования. */
    readonly onScanStart?: (values: IOnboardingScanStartPayload) => void
}

const EMAIL_OPTIONAL_SCHEMA = z
    .string()
    .trim()
    .max(256, "Email слишком длинный")
    .refine(
        (value): boolean => value.length === 0 || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
        "Введите корректный email",
    )

const ONBOARDING_FORM_SCHEMA = z
    .object({
        provider: z.enum(GIT_PROVIDER_OPTIONS),
        onboardingTemplateId: z.enum(ONBOARDING_TEMPLATE_IDS),
        onboardingMode: z.enum(ONBOARDING_MODE_OPTIONS),
        repositoryUrl: z.string().trim(),
        repositoryUrlList: z.string().trim(),
        scanMode: z.enum(SCAN_MODE_OPTIONS),
        scanSchedule: z.enum(SCAN_SCHEDULE_OPTIONS),
        scanThreads: z
            .coerce
            .number()
            .int("Количество воркеров должно быть целым")
            .min(1, "Количество воркеров не должно быть меньше 1")
            .max(32, "Количество воркеров не должно превышать 32"),
        includeSubmodules: z.boolean(),
        includeHistory: z.boolean(),
        tags: z.string().trim().max(256, "Теги слишком длинные"),
        notifyEmail: EMAIL_OPTIONAL_SCHEMA,
    })
    .superRefine((values, context): void => {
        if (values.onboardingMode === "single") {
            const urlSchema = z
                .string()
                .trim()
                .min(1, "Введите URL репозитория")
                .url("Введите корректный URL репозитория")

            const validation = urlSchema.safeParse(values.repositoryUrl)
            if (validation.success === false) {
                const firstIssue = validation.error.issues.at(0)
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        firstIssue?.code === "too_small" ? "Введите URL репозитория" : "Введите корректный URL репозитория",
                    path: ["repositoryUrl"],
                })
            }

            return
        }

        const parsed = parseBulkRepositoryList(values.repositoryUrlList)
        if (parsed.repositories.length === 0) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Добавьте минимум один корректный URL репозитория",
                path: ["repositoryUrlList"],
            })
        }

        if (parsed.invalidLines.length === 0) {
            return
        }

        const preview = parsed.invalidLines
            .map((item): string => `${String(item.line)}: ${item.value}`)
            .slice(0, 3)
            .join("; ")
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Некорректные ссылки: ${preview}`,
            path: ["repositoryUrlList"],
        })
    })

const DEFAULT_ONBOARDING_VALUES: IOnboardingFormValues = {
    provider: "github",
    onboardingTemplateId: "custom",
    onboardingMode: "single",
    repositoryUrl: "",
    repositoryUrlList: "",
    scanMode: "incremental",
    scanSchedule: "manual",
    scanThreads: 4,
    includeSubmodules: true,
    includeHistory: false,
    tags: "",
    notifyEmail: "",
}

const WIZARD_STEPS = [
    {
        id: "provider",
        label: "Подключить провайдера",
        description: "Выберите Git-провайдера и подтвердите подключение.",
    },
    {
        id: "repository",
        label: "Выбрать репозиторий",
        description: "Укажите URL/список репозиториев для сканирования.",
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

const ONBOARDING_MODE_SELECT_OPTIONS: ReadonlyArray<IFormSelectOption> = [
    {
        label: "Одиночный репозиторий",
        value: "single",
    },
    {
        label: "Массовый onboarding (bulk)",
        value: "bulk",
    },
]

const GIT_PROVIDER_SELECT_OPTIONS: ReadonlyArray<IFormSelectOption> = [
    {
        description: "OAuth + API token flow",
        label: "GitHub",
        value: "github",
    },
    {
        description: "OAuth + project/repo scopes",
        label: "GitLab",
        value: "gitlab",
    },
    {
        description: "Workspace app or app password",
        label: "Bitbucket",
        value: "bitbucket",
    },
]

const STEP_FIELDS: Record<
    (typeof WIZARD_STEPS)[number]["id"],
    ReadonlyArray<keyof IOnboardingFormValues>
> = {
    provider: ["provider"],
    repository: ["onboardingMode", "repositoryUrl", "repositoryUrlList"],
    launch: [
        "onboardingTemplateId",
        "scanMode",
        "scanSchedule",
        "scanThreads",
        "includeSubmodules",
        "includeHistory",
        "tags",
        "notifyEmail",
    ],
}

const BULK_PROGRESS_PREVIEW_LABEL_LIMIT = 3
const PREVIEW_REPOSITORY_LIMIT = 5
const PREVIEW_TEMPLATE_DIFF_LIMIT = 6

const ONBOARDING_TEMPLATES: ReadonlyArray<IOnboardingTemplate> = [
    {
        description: "Подходит для чувствительных проектов: включена история и строгие теги безопасности.",
        id: "security-baseline",
        includeHistory: true,
        includeSubmodules: true,
        name: "Security Baseline",
        notifyEmail: "security-ops@example.com",
        rulesPreset: "security-first",
        scanMode: "full",
        scanSchedule: "daily",
        scanThreads: 8,
        tags: ["security", "policy", "sensitive"],
        version: "v1.2.0",
    },
    {
        description: "Сбалансированный вариант для новых репозиториев с акцентом на качество.",
        id: "quality-scan",
        includeHistory: true,
        includeSubmodules: true,
        name: "Quality Scan",
        notifyEmail: "quality@example.com",
        rulesPreset: "quality-default",
        scanMode: "incremental",
        scanSchedule: "daily",
        scanThreads: 6,
        tags: ["quality", "ci", "default"],
        version: "v1.0.1",
    },
    {
        description: "Быстрый onboarding для пилота: меньше воркеров и более редкая проверка.",
        id: "fast-onboarding",
        includeHistory: false,
        includeSubmodules: false,
        name: "Fast Onboarding",
        notifyEmail: "",
        rulesPreset: "fast-feedback",
        scanMode: "delta",
        scanSchedule: "hourly",
        scanThreads: 2,
        tags: ["experimental", "fast-track"],
        version: "v0.9.0",
    },
]

const TEMPLATE_OPTIONS: ReadonlyArray<{ label: string; value: TOnboardingTemplateId }> = [
    {
        label: "Ручная настройка",
        value: "custom",
    },
    ...ONBOARDING_TEMPLATES.map((template): { label: string; value: TOnboardingTemplateId } => ({
        label: `${template.name} — ${template.version}`,
        value: template.id,
    })),
]

function isValidRepositoryUrl(value: string): boolean {
    try {
        const parsed = new URL(value)
        return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
        return false
    }
}

function parseBulkRepositoryList(value: string): IParsedBulkRepositoryList {
    const lines = value.split(/\r?\n/)
    const repositories: string[] = []
    const invalidLines: IBulkRepositoryParseIssue[] = []
    const seen = new Set<string>()

    for (let index = 0; index < lines.length; index += 1) {
        const candidate = lines[index]?.trim() ?? ""
        if (candidate.length === 0) {
            continue
        }

        if (isValidRepositoryUrl(candidate) === false) {
            invalidLines.push({ line: index + 1, value: candidate })
            continue
        }

        const normalized = candidate.toLowerCase()
        if (seen.has(normalized) === true) {
            continue
        }

        seen.add(normalized)
        repositories.push(candidate)
    }

    return { repositories, invalidLines }
}

function createBulkScanJobs(repositoryUrls: ReadonlyArray<string>): ReadonlyArray<IBulkScanJob> {
    return repositoryUrls.map((repositoryUrl, index): IBulkScanJob => {
        if (index === 0) {
            return {
                id: `bulk-${index}-${repositoryUrl}`,
                progress: 12,
                repositoryUrl,
                status: "running",
            }
        }

        if (index === 1) {
            return {
                errorDetails: [
                    "Сетевой запрос к провайдеру завершился таймаутом.",
                    "Ресурс вернул 502 Bad Gateway.",
                ],
                errorMessage: "Сканирование прервано: ошибка доступа к репозиторию",
                id: `bulk-${index}-${repositoryUrl}`,
                progress: 48,
                repositoryUrl,
                status: "error",
            }
        }

        return {
            id: `bulk-${index}-${repositoryUrl}`,
            progress: 0,
            repositoryUrl,
            status: "queued",
        }
    })
}

function mapBulkStatusLabel(status: TBulkScanStatus): string {
    if (status === "running") {
        return "В процессе"
    }

    if (status === "queued") {
        return "В очереди"
    }

    if (status === "paused") {
        return "Пауза"
    }

    if (status === "completed") {
        return "Готово"
    }

    if (status === "cancelled") {
        return "Отменено"
    }

    return "Ошибка"
}

function mapBulkStatusClasses(status: TBulkScanStatus): string {
    if (status === "running") {
        return "border-blue-200 bg-blue-50 text-blue-700"
    }

    if (status === "queued") {
        return "border-slate-200 bg-white text-slate-700"
    }

    if (status === "paused") {
        return "border-amber-200 bg-amber-50 text-amber-700"
    }

    if (status === "completed") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700"
    }

    if (status === "cancelled") {
        return "border-slate-200 bg-slate-100 text-slate-500"
    }

    return "border-rose-200 bg-rose-50 text-rose-700"
}

function mapBulkProgressClasses(status: TBulkScanStatus): string {
    if (status === "running") {
        return "bg-blue-500"
    }

    if (status === "error") {
        return "bg-rose-500"
    }

    if (status === "paused") {
        return "bg-amber-500"
    }

    if (status === "completed") {
        return "bg-emerald-500"
    }

    return "bg-slate-300"
}

function summarizeBulkScanJobs(jobs: ReadonlyArray<IBulkScanJob>): IBulkScanSummary {
    return jobs.reduce<IBulkScanSummary>(
        (accumulator, job): IBulkScanSummary => {
            if (job.status === "running") {
                return { ...accumulator, running: accumulator.running + 1 }
            }

            if (job.status === "queued") {
                return { ...accumulator, queued: accumulator.queued + 1 }
            }

            if (job.status === "paused") {
                return { ...accumulator, paused: accumulator.paused + 1 }
            }

            if (job.status === "error") {
                return { ...accumulator, error: accumulator.error + 1 }
            }

            if (job.status === "completed") {
                return { ...accumulator, completed: accumulator.completed + 1 }
            }

            return { ...accumulator, cancelled: accumulator.cancelled + 1 }
        },
        {
            running: 0,
            queued: 0,
            paused: 0,
            error: 0,
            completed: 0,
            cancelled: 0,
        },
    )
}

function parseTemplateTags(value: string): ReadonlyArray<string> {
    const rawParts = value.split(",")
    const tags = rawParts
        .map((part): string => part.trim())
        .filter((part): boolean => part.length > 0)
    const uniqueTags = [...new Set(tags)]

    return uniqueTags
}

function formatTemplateTags(tags: ReadonlyArray<string>): string {
    if (tags.length === 0) {
        return "без тегов"
    }

    return tags.join(", ")
}

function splitTemplateTagsForPreview(tags: ReadonlyArray<string>): ReadonlyArray<string> {
    if (tags.length === 0) {
        return []
    }

    return tags
}

function convertFormValuesToTemplateState(values: IOnboardingFormValues): IOnboardingTemplateFormState {
    return {
        includeHistory: values.includeHistory,
        includeSubmodules: values.includeSubmodules,
        notifyEmail: values.notifyEmail,
        scanMode: values.scanMode,
        scanSchedule: values.scanSchedule,
        scanThreads: values.scanThreads,
        tags: parseTemplateTags(values.tags),
    }
}

function mapTemplateToFormState(template: IOnboardingTemplate): IOnboardingTemplateFormState {
    return {
        includeHistory: template.includeHistory,
        includeSubmodules: template.includeSubmodules,
        notifyEmail: template.notifyEmail,
        scanMode: template.scanMode,
        scanSchedule: template.scanSchedule,
        scanThreads: template.scanThreads,
        tags: [...template.tags],
    }
}

function isTemplateStateEqual(
    left: IOnboardingTemplateFormState,
    right: IOnboardingTemplateFormState,
): boolean {
    if (left.scanMode !== right.scanMode) {
        return false
    }

    if (left.scanSchedule !== right.scanSchedule) {
        return false
    }

    if (left.scanThreads !== right.scanThreads) {
        return false
    }

    if (left.includeSubmodules !== right.includeSubmodules) {
        return false
    }

    if (left.includeHistory !== right.includeHistory) {
        return false
    }

    if (left.notifyEmail !== right.notifyEmail) {
        return false
    }

    if (left.tags.length !== right.tags.length) {
        return false
    }

    return left.tags.every((tag, index): boolean => tag === right.tags[index])
}

function toAppliedTemplateMeta(
    templateId: TOnboardingTemplateId,
    activeTemplate?: IOnboardingTemplate,
): IOnboardingAppliedTemplateMeta {
    if (activeTemplate === undefined) {
        return {
            id: "custom",
            name: "Ручная настройка",
            rulesPreset: "manual",
            tags: [],
            version: "draft",
        }
    }

    return {
        id: templateId,
        name: activeTemplate.name,
        rulesPreset: activeTemplate.rulesPreset,
        tags: [...activeTemplate.tags],
        version: activeTemplate.version,
    }
}

function buildTemplateDiffLine(
    label: string,
    previous: string,
    next: string,
): string {
    if (previous === next) {
        return `${label}: оставляем ${previous}`
    }

    return `${label}: ${previous} → ${next}`
}

function getTemplateById(templateId: TOnboardingTemplateId): IOnboardingTemplate | undefined {
    return ONBOARDING_TEMPLATES.find((template): boolean => template.id === templateId)
}

function isBulkScanTerminal(status: TBulkScanStatus): boolean {
    return status === "completed" || status === "error" || status === "cancelled"
}

function formatBooleanForSummary(value: boolean): string {
    return value ? "Да" : "Нет"
}

function mapProviderLabel(provider: TGitProvider): string {
    if (provider === "github") {
        return "GitHub"
    }

    if (provider === "gitlab") {
        return "GitLab"
    }

    return "Bitbucket"
}

/**
 * Экран multi-step мастера onboarding.
 *
 * @param props Колбек на запуск скана.
 * @returns Компонент wizard с расширенным bulk-режимом.
 */
export function OnboardingWizardPage(props: IOnboardingWizardPageProps): ReactElement {
    const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)
    const [isStarted, setIsStarted] = useState(false)
    const [connectedProvider, setConnectedProvider] = useState<TGitProvider | undefined>(undefined)
    const [providerConnectionError, setProviderConnectionError] = useState<string | undefined>(undefined)
    const [activeTemplateId, setActiveTemplateId] =
        useState<TOnboardingTemplateId>(CUSTOM_TEMPLATE_ID)
    const [templateAuditLog, setTemplateAuditLog] = useState<
        ReadonlyArray<IOnboardingTemplateAuditEntry>
    >([])
    const [selectedRepositoryUrls, setSelectedRepositoryUrls] = useState<
        ReadonlyArray<string>
    >([])
    const [isBulkSelectionTouched, setIsBulkSelectionTouched] = useState(false)
    const [bulkJobs, setBulkJobs] = useState<ReadonlyArray<IBulkScanJob>>([])
    const [isBulkPaused, setIsBulkPaused] = useState(false)

    const form = useForm<IOnboardingFormValues, unknown, IOnboardingFormValues>({
        defaultValues: DEFAULT_ONBOARDING_VALUES,
        resolver: zodResolver(ONBOARDING_FORM_SCHEMA) as Resolver<
            IOnboardingFormValues,
            unknown,
            IOnboardingFormValues
        >,
        mode: "onSubmit",
    })

    const activeStepId = WIZARD_STEPS[activeStep].id
    const isFinalStep = activeStep === WIZARD_STEPS.length - 1
    const scanModeOptions = SCAN_MODE_SELECT_OPTIONS
    const scheduleOptions = SCAN_SCHEDULE_SELECT_OPTIONS
    const values = form.watch()
    const providerOptions = GIT_PROVIDER_SELECT_OPTIONS
    const isSingleMode = values.onboardingMode === "single"
    const isProviderConnected = connectedProvider === values.provider
    const selectedTemplateId = values.onboardingTemplateId
    const selectedTemplate = getTemplateById(selectedTemplateId)
    const activeTemplate = getTemplateById(activeTemplateId)
    const shouldApplyTemplate = selectedTemplate !== undefined
    const canApplyTemplate = shouldApplyTemplate && selectedTemplate.id !== activeTemplateId
    const templateStateFromForm = convertFormValuesToTemplateState(values)
    const templateStateFromSelection = selectedTemplate === undefined
        ? templateStateFromForm
        : mapTemplateToFormState(selectedTemplate)
    const templateDiff = shouldApplyTemplate
        ? [
            buildTemplateDiffLine(
                "Mode",
                templateStateFromForm.scanMode,
                templateStateFromSelection.scanMode,
            ),
            buildTemplateDiffLine(
                "Cadence",
                templateStateFromForm.scanSchedule,
                templateStateFromSelection.scanSchedule,
            ),
            buildTemplateDiffLine(
                "Workers",
                String(templateStateFromForm.scanThreads),
                String(templateStateFromSelection.scanThreads),
            ),
            buildTemplateDiffLine(
                "Submodules",
                formatBooleanForSummary(templateStateFromForm.includeSubmodules),
                formatBooleanForSummary(templateStateFromSelection.includeSubmodules),
            ),
            buildTemplateDiffLine(
                "History",
                formatBooleanForSummary(templateStateFromForm.includeHistory),
                formatBooleanForSummary(templateStateFromSelection.includeHistory),
            ),
            buildTemplateDiffLine(
                "Email",
                templateStateFromForm.notifyEmail.length === 0
                    ? "не задан"
                    : templateStateFromForm.notifyEmail,
                templateStateFromSelection.notifyEmail.length === 0
                    ? "не задан"
                    : templateStateFromSelection.notifyEmail,
            ),
            buildTemplateDiffLine(
                "Tags",
                formatTemplateTags(templateStateFromForm.tags),
                formatTemplateTags(templateStateFromSelection.tags),
            ),
        ]
        : []
    const hasTemplateChanges = canApplyTemplate
        ? isTemplateStateEqual(templateStateFromForm, templateStateFromSelection) === false
        : false
    const appliedTemplateMeta = toAppliedTemplateMeta(activeTemplateId, activeTemplate)
    const parsedBulkList = useMemo(() => parseBulkRepositoryList(values.repositoryUrlList), [values.repositoryUrlList])
    const bulkSummary = useMemo(() => summarizeBulkScanJobs(bulkJobs), [bulkJobs])
    const hasBulkSelection = selectedRepositoryUrls.length > 0
    const lastTemplateAudit = templateAuditLog.at(-1)

    const validateCurrentStep = async (): Promise<boolean> => {
        if (activeStepId === "provider") {
            const isProviderValid = await form.trigger(["provider"])
            if (isProviderValid === false) {
                return false
            }

            if (isProviderConnected === false) {
                setProviderConnectionError("Сначала подключите Git-провайдера.")
                return false
            }

            return true
        }

        if (activeStepId === "repository") {
            if (isSingleMode) {
                const isSingleValid = await form.trigger(["onboardingMode", "repositoryUrl"])
                return isSingleValid
            }

            const isBulkValid = await form.trigger(["onboardingMode", "repositoryUrlList"])
            if (isBulkValid === false) {
                return false
            }

            if (parsedBulkList.repositories.length === 0 || hasBulkSelection === false) {
                form.setError("repositoryUrlList", {
                    message: "Выберите хотя бы один репозиторий для запуска.",
                    type: "manual",
                })
                return false
            }

            return true
        }

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
        const targetRepositories =
            nextValues.onboardingMode === "bulk" ? selectedRepositoryUrls : [nextValues.repositoryUrl]
        const isBulkMode = nextValues.onboardingMode === "bulk"
        const appliedTemplate = toAppliedTemplateMeta(activeTemplateId, activeTemplate)

        setIsStarted(true)
        setIsBulkPaused(false)
        if (isBulkMode) {
            setBulkJobs(createBulkScanJobs(targetRepositories))
        } else {
            setBulkJobs([])
        }

        showToastSuccess(
            isBulkMode ? "Сканирование репозиториев запущено." : "Сканирование репозитория запущено.",
        )
        props.onScanStart?.({
            ...nextValues,
            targetRepositories,
            appliedTemplate,
        })
    }

    const handleConnectProvider = (): void => {
        setConnectedProvider(values.provider)
        setProviderConnectionError(undefined)
        showToastSuccess(`${mapProviderLabel(values.provider)} подключен.`)
    }

    const applyTemplateToForm = (template: IOnboardingTemplate): void => {
        const nextTemplateState = mapTemplateToFormState(template)
        const before = convertFormValuesToTemplateState(form.getValues())
        if (isTemplateStateEqual(before, nextTemplateState)) {
            setActiveTemplateId(template.id)
            form.setValue("onboardingTemplateId", template.id, { shouldDirty: false })
            return
        }

        form.setValue("scanMode", nextTemplateState.scanMode, { shouldDirty: false })
        form.setValue("scanSchedule", nextTemplateState.scanSchedule, { shouldDirty: false })
        form.setValue("scanThreads", nextTemplateState.scanThreads, { shouldDirty: false })
        form.setValue("includeSubmodules", nextTemplateState.includeSubmodules, { shouldDirty: false })
        form.setValue("includeHistory", nextTemplateState.includeHistory, { shouldDirty: false })
        form.setValue("notifyEmail", nextTemplateState.notifyEmail, { shouldDirty: false })
        form.setValue("tags", formatTemplateTags(nextTemplateState.tags), { shouldDirty: false })
        form.setValue("onboardingTemplateId", template.id, { shouldDirty: false })
        setActiveTemplateId(template.id)

        const nextValues = mapTemplateToFormState(template)
        setTemplateAuditLog((previous): ReadonlyArray<IOnboardingTemplateAuditEntry> => [
            ...previous,
            {
                after: nextValues,
                appliedAt: new Date().toISOString(),
                before,
                templateId: template.id,
                templateName: template.name,
                templateVersion: template.version,
            },
        ])
    }

    const handleApplyTemplate = (): void => {
        if (selectedTemplate === undefined) {
            return
        }

        applyTemplateToForm(selectedTemplate)
    }

    const handleRollbackTemplate = (): void => {
        if (lastTemplateAudit === undefined) {
            return
        }

        const previous = lastTemplateAudit.before
        form.setValue("scanMode", previous.scanMode, { shouldDirty: false })
        form.setValue("scanSchedule", previous.scanSchedule, { shouldDirty: false })
        form.setValue("scanThreads", previous.scanThreads, { shouldDirty: false })
        form.setValue("includeSubmodules", previous.includeSubmodules, { shouldDirty: false })
        form.setValue("includeHistory", previous.includeHistory, { shouldDirty: false })
        form.setValue("notifyEmail", previous.notifyEmail, { shouldDirty: false })
        form.setValue("tags", formatTemplateTags(previous.tags), { shouldDirty: false })
        form.setValue("onboardingTemplateId", CUSTOM_TEMPLATE_ID, { shouldDirty: false })
        setActiveTemplateId(CUSTOM_TEMPLATE_ID)

        setTemplateAuditLog((previousAudit): ReadonlyArray<IOnboardingTemplateAuditEntry> =>
            previousAudit.slice(0, -1),
        )
    }

    const toggleRepositorySelection = (nextUrl: string): void => {
        setIsBulkSelectionTouched(true)
        setSelectedRepositoryUrls((previous): ReadonlyArray<string> => {
            if (previous.includes(nextUrl)) {
                return previous.filter((item): boolean => item !== nextUrl)
            }

            return [...previous, nextUrl]
        })
    }

    const selectAllRepositories = (): void => {
        setIsBulkSelectionTouched(true)
        setSelectedRepositoryUrls(parsedBulkList.repositories)
    }

    const clearAllRepositories = (): void => {
        setIsBulkSelectionTouched(true)
        setSelectedRepositoryUrls([])
    }

    const handlePauseAll = (): void => {
        if (isBulkPaused) {
            return
        }

        setIsBulkPaused(true)
        setBulkJobs((previous): ReadonlyArray<IBulkScanJob> =>
            previous.map((job): IBulkScanJob => {
                if (job.status !== "running") {
                    return job
                }

                return {
                    ...job,
                    status: "paused",
                }
            }),
        )
    }

    const handleResumeAll = (): void => {
        if (isBulkPaused === false) {
            return
        }

        setIsBulkPaused(false)
        setBulkJobs((previous): ReadonlyArray<IBulkScanJob> =>
            previous.map((job): IBulkScanJob => {
                if (job.status !== "paused") {
                    return job
                }

                return {
                    ...job,
                    status: "running",
                }
            }),
        )
    }

    const handleCancelAll = (): void => {
        setIsBulkPaused(false)
        setBulkJobs((previous): ReadonlyArray<IBulkScanJob> =>
            previous.map((job): IBulkScanJob => {
                if (isBulkScanTerminal(job.status) === true) {
                    return job
                }

                return {
                    ...job,
                    status: "cancelled",
                }
            }),
        )
    }

    const handleRetryJob = (jobId: string): void => {
        setBulkJobs((previous): ReadonlyArray<IBulkScanJob> =>
            previous.map((job): IBulkScanJob => {
                if (job.id !== jobId) {
                    return job
                }

                return {
                    ...job,
                    errorDetails: undefined,
                    errorMessage: undefined,
                    progress: 0,
                    status: "running",
                }
            }),
        )
    }

    const handleCancelJob = (jobId: string): void => {
        setBulkJobs((previous): ReadonlyArray<IBulkScanJob> =>
            previous.map((job): IBulkScanJob => {
                if (job.id !== jobId || isBulkScanTerminal(job.status)) {
                    return job
                }

                return {
                    ...job,
                    errorDetails: undefined,
                    errorMessage: undefined,
                    status: "cancelled",
                }
            }),
        )
    }

    useEffect(() => {
        if (values.onboardingMode !== "bulk") {
            setSelectedRepositoryUrls([])
            setIsBulkSelectionTouched(false)
            return
        }

        if (isBulkSelectionTouched === false) {
            setSelectedRepositoryUrls(parsedBulkList.repositories)
            return
        }

        setSelectedRepositoryUrls((previous): ReadonlyArray<string> => {
            const available = new Set(parsedBulkList.repositories)
            return previous.filter((item): boolean => available.has(item))
        })
    }, [isBulkSelectionTouched, parsedBulkList, values.onboardingMode])

    useEffect(() => {
        if (values.onboardingMode !== "bulk") {
            return
        }

        if (
            parsedBulkList.invalidLines.length === 0 &&
            parsedBulkList.repositories.length > 0 &&
            hasBulkSelection
        ) {
            form.clearErrors("repositoryUrlList")
        }
    }, [form, hasBulkSelection, parsedBulkList, values.onboardingMode])

    useEffect((): void => {
        if (activeTemplateId === CUSTOM_TEMPLATE_ID || activeTemplate === undefined) {
            return
        }

        const currentTemplateState = convertFormValuesToTemplateState(values)
        const activeTemplateState = mapTemplateToFormState(activeTemplate)
        if (isTemplateStateEqual(currentTemplateState, activeTemplateState)) {
            return
        }

        setActiveTemplateId(CUSTOM_TEMPLATE_ID)
        form.setValue("onboardingTemplateId", CUSTOM_TEMPLATE_ID, { shouldDirty: false })
    }, [activeTemplate, activeTemplateId, form, values])

    useEffect((): void => {
        if (isProviderConnected === false) {
            return
        }

        setProviderConnectionError(undefined)
    }, [isProviderConnected])

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
                    <form
                        className="space-y-4"
                        onSubmit={(event): void => {
                            event.preventDefault()
                            void form.handleSubmit(handleSubmit)(event)
                        }}
                    >
                        {activeStep === 0 ? (
                            <section className="space-y-3">
                                <FormSelectField<IOnboardingFormValues, "provider">
                                    control={form.control}
                                    id="provider"
                                    label="Git-провайдер"
                                    name="provider"
                                    options={providerOptions}
                                    helperText="Подключение нужно для доступа к репозиториям и запуску скана."
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        onPress={(): void => {
                                            handleConnectProvider()
                                        }}
                                        type="button"
                                    >
                                        Connect provider
                                    </Button>
                                    <Chip
                                        color={isProviderConnected ? "success" : "warning"}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {isProviderConnected
                                            ? `${mapProviderLabel(values.provider)} connected`
                                            : "Not connected"}
                                    </Chip>
                                </div>
                                {providerConnectionError === undefined ? null : (
                                    <Alert color="danger">{providerConnectionError}</Alert>
                                )}
                            </section>
                        ) : null}

                        {activeStep === 1 ? (
                            <section className="space-y-3">
                                <FormRadioGroupField<IOnboardingFormValues, "onboardingMode">
                                    control={form.control}
                                    helperText="Выберите формат запуска."
                                    label="Режим onboarding"
                                    name="onboardingMode"
                                    options={ONBOARDING_MODE_SELECT_OPTIONS}
                                />

                                {isSingleMode ? (
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
                                ) : (
                                    <>
                                        <FormTextareaField<IOnboardingFormValues, "repositoryUrlList">
                                            control={form.control}
                                            id="repository-url-list"
                                            label="Список репозиториев (по одной ссылке на строку)"
                                            name="repositoryUrlList"
                                            textareaProps={{
                                                minRows: 6,
                                                placeholder: `https://github.com/owner/repo-a
https://github.com/owner/repo-b`,
                                            }}
                                        />

                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-700">
                                                Выбрано <span className="font-semibold">{selectedRepositoryUrls.length}</span>{" "}
                                                из <span className="font-semibold">{parsedBulkList.repositories.length}</span>{" "}
                                                репозиториев
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    onPress={(): void => {
                                                        selectAllRepositories()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="light"
                                                >
                                                    Выбрать все
                                                </Button>
                                                <Button
                                                    onPress={(): void => {
                                                        clearAllRepositories()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="light"
                                                >
                                                    Снять все
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="max-h-60 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
                                            {parsedBulkList.repositories.length === 0 ? (
                                                <p className="text-sm text-slate-500">
                                                    Добавьте URL репозиториев в поле выше.
                                                </p>
                                            ) : null}

                                            {parsedBulkList.repositories.map((repositoryUrl): ReactElement => (
                                                <div className="rounded-md border border-slate-200 p-2" key={repositoryUrl}>
                                                    <Checkbox
                                                        isSelected={selectedRepositoryUrls.includes(repositoryUrl)}
                                                        onValueChange={(): void => {
                                                            toggleRepositorySelection(repositoryUrl)
                                                        }}
                                                    >
                                                        {repositoryUrl}
                                                    </Checkbox>
                                                </div>
                                            ))}
                                        </div>

                                        {parsedBulkList.invalidLines.length > 0 ? (
                                            <Alert color="danger">
                                                Некорректные строки
                                                <ul className="mt-1 list-disc space-y-1 pl-5">
                                                    {parsedBulkList.invalidLines.map((line): ReactElement => (
                                                        <li key={`invalid-line-${String(line.line)}`}>
                                                            {line.line}: {line.value}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Alert>
                                        ) : null}

                                        {parsedBulkList.repositories.length > BULK_PROGRESS_PREVIEW_LABEL_LIMIT ? (
                                            <Alert color="primary">
                                                Будет применен единый шаблон сканирования ко всем выбранным репозиториям.
                                            </Alert>
                                        ) : null}
                                    </>
                                )}

                                {isSingleMode || isStarted ? null : (
                                    <Alert color="primary">
                                        В bulk-режиме все выбранные репозитории запускаются по общему шаблону настроек.
                                    </Alert>
                                )}
                            </section>
                        ) : null}

                        {activeStep === 2 ? (
                            <section className="space-y-3">
                                <div className="rounded-md border border-slate-200 p-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                        Registry шаблонов onboarding
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        Выберите шаблон — сначала preview, потом примените в один клик.
                                    </p>
                                    <div className="mt-2">
                                        <FormRadioGroupField<IOnboardingFormValues, "onboardingTemplateId">
                                            control={form.control}
                                            helperText="Шаблон влияет только на настройки сканирования."
                                            label="Шаблон"
                                            name="onboardingTemplateId"
                                            options={TEMPLATE_OPTIONS}
                                        />
                                    </div>

                                    {selectedTemplate !== undefined ? (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-sm font-semibold">
                                                Что будет применено
                                            </summary>
                                            <div className="mt-2 space-y-1 text-xs text-slate-700">
                                                <p>
                                                    <span className="font-semibold">ID:</span>{" "}
                                                    {selectedTemplate.id}
                                                </p>
                                                <p>
                                                    <span className="font-semibold">Version:</span>{" "}
                                                    {selectedTemplate.version}
                                                </p>
                                                <p>
                                                    <span className="font-semibold">Rules:</span>{" "}
                                                    {selectedTemplate.rulesPreset}
                                                </p>
                                                <p>
                                                    <span className="font-semibold">Description:</span>{" "}
                                                    {selectedTemplate.description}
                                                </p>
                                                {templateDiff.slice(0, PREVIEW_TEMPLATE_DIFF_LIMIT).map(
                                                    (line): ReactElement => (
                                                        <p key={line}>{line}</p>
                                                    ),
                                                )}
                                            </div>
                                        </details>
                                    ) : null}

                                    {canApplyTemplate ? (
                                        <div className="mt-2">
                                            <Button
                                                isDisabled={hasTemplateChanges === false}
                                                onPress={(): void => {
                                                    handleApplyTemplate()
                                                }}
                                                size="sm"
                                                type="button"
                                                variant="light"
                                            >
                                                Применить шаблон
                                            </Button>
                                        </div>
                                    ) : null}

                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm font-semibold">
                                            Применённые шаблоны (audit log)
                                        </summary>
                                        {templateAuditLog.length === 0 ? (
                                            <p className="mt-2 text-sm text-slate-600">
                                                Пока шаблоны не применялись.
                                            </p>
                                        ) : null}
                                        {templateAuditLog.length === 0 ? null : (
                                            <div className="mt-2 space-y-2">
                                                {templateAuditLog
                                                    .slice()
                                                    .reverse()
                                                    .map((entry): ReactElement => (
                                                        <article className="rounded-md border p-2" key={`${entry.templateId}-${entry.appliedAt}`}>
                                                            <p className="text-xs">
                                                                {entry.templateName} — {entry.templateVersion}
                                                            </p>
                                                            <p className="text-xs text-slate-600">
                                                                {entry.appliedAt}
                                                            </p>
                                                            <p className="text-xs text-slate-600">
                                                                From: {formatTemplateTags(entry.before.tags)} →
                                                                {formatTemplateTags(entry.after.tags)}
                                                            </p>
                                                        </article>
                                                    ))}
                                                <Button
                                                    color="warning"
                                                    isDisabled={lastTemplateAudit === undefined}
                                                    onPress={(): void => {
                                                        handleRollbackTemplate()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="ghost"
                                                >
                                                    Откатить последнее применение
                                                </Button>
                                            </div>
                                        )}
                                    </details>
                                </div>

                                <FormSelectField<IOnboardingFormValues, "scanMode">
                                    control={form.control}
                                    id="scan-mode"
                                    helperText="Incremental — быстрее, full — полная проверка."
                                    label="Режим сканирования"
                                    name="scanMode"
                                    options={scanModeOptions}
                                />
                                <FormTextField<IOnboardingFormValues, "tags">
                                    control={form.control}
                                    helperText="Через запятую."
                                    id="onboarding-tags"
                                    inputProps={{
                                        placeholder: "security, core, baseline",
                                        type: "text",
                                    }}
                                    label="Теги"
                                    name="tags"
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
                                    {isSingleMode ? (
                                        <p className="text-sm">
                                            <span className="font-semibold">Repository:</span> {values.repositoryUrl}
                                        </p>
                                    ) : null}
                                    <details className="rounded-md border border-slate-200 p-2">
                                        <summary className="cursor-pointer text-sm font-semibold">
                                            Шаблон onboarding
                                        </summary>
                                        <p className="mt-1 text-sm text-slate-700">
                                            {appliedTemplateMeta.name} ({appliedTemplateMeta.version})
                                        </p>
                                        <p className="text-sm text-slate-700">
                                            Rules: {appliedTemplateMeta.rulesPreset}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {splitTemplateTagsForPreview(appliedTemplateMeta.tags).map((tag): ReactElement => (
                                                    <Chip key={tag} size="sm">
                                                        {tag}
                                                    </Chip>
                                                ))}
                                        </div>
                                    </details>
                                    {isSingleMode ? null : (
                                        <details className="rounded-md border border-slate-200 p-2">
                                            <summary className="cursor-pointer text-sm font-semibold">
                                                Применяемый профиль
                                            </summary>
                                            <p className="mt-1 text-sm text-slate-700">
                                                Один шаблон на {selectedRepositoryUrls.length} репозиториев:{" "}
                                                {values.scanMode}/{values.scanSchedule}
                                            </p>
                                            {selectedRepositoryUrls.length === 0 ? null : (
                                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                                    {selectedRepositoryUrls
                                                        .slice(0, PREVIEW_REPOSITORY_LIMIT)
                                                        .map((repositoryUrl): ReactElement => (
                                                            <li key={`summary-repo-${repositoryUrl}`}>{repositoryUrl}</li>
                                                        ))}
                                                    {selectedRepositoryUrls.length > PREVIEW_REPOSITORY_LIMIT ? (
                                                        <li>
                                                            ...и еще{" "}
                                                            {String(
                                                                selectedRepositoryUrls.length - PREVIEW_REPOSITORY_LIMIT,
                                                            )}{" "}
                                                            репозиториев.
                                                        </li>
                                                    ) : null}
                                                </ul>
                                            )}
                                        </details>
                                    )}
                                    <p className="text-sm">
                                        <span className="font-semibold">Provider:</span>{" "}
                                        {mapProviderLabel(values.provider)} (
                                        {isProviderConnected ? "connected" : "not connected"})
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Mode:</span> {values.scanMode}
                                    </p>
                                    <p className="text-sm">
                                        <span className="font-semibold">Schedule:</span> {values.scanSchedule}
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

                                {isSingleMode || isStarted === false ? null : (
                                    <section className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold">Прогресс массового сканирования</p>
                                            <div className="flex gap-2">
                                                <Button
                                                    isDisabled={isBulkPaused}
                                                    onPress={(): void => {
                                                        handlePauseAll()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="light"
                                                >
                                                    Пауза
                                                </Button>
                                                <Button
                                                    isDisabled={isBulkPaused === false}
                                                    onPress={(): void => {
                                                        handleResumeAll()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="light"
                                                >
                                                    Возобновить
                                                </Button>
                                                <Button
                                                    color="danger"
                                                    onPress={(): void => {
                                                        handleCancelAll()
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="ghost"
                                                >
                                                    Отменить все
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid gap-2 rounded-lg border border-slate-200 p-2 text-sm">
                                            <p>
                                                В работе: {bulkSummary.running}, Очередь: {bulkSummary.queued}, Пауза: {bulkSummary.paused},
                                                Ошибки: {bulkSummary.error}, Готово: {bulkSummary.completed}, Отменено: {bulkSummary.cancelled}
                                            </p>

                                            {bulkJobs.map((job): ReactElement => (
                                                <article className={`rounded-md border p-3 ${mapBulkStatusClasses(job.status)}`} key={job.id}>
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold">{job.repositoryUrl}</p>
                                                        <span
                                                            className={`rounded-full border px-2 py-1 text-xs ${mapBulkStatusClasses(job.status)}`}
                                                        >
                                                            {mapBulkStatusLabel(job.status)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                                                        <div
                                                            aria-label={`scan progress bar ${job.repositoryUrl}`}
                                                            aria-valuemin={0}
                                                            aria-valuemax={100}
                                                            aria-valuenow={job.progress}
                                                            className={`h-2 rounded-full transition-[width] duration-300 ${mapBulkProgressClasses(job.status)}`}
                                                            role="progressbar"
                                                            style={{ width: `${job.progress}%` }}
                                                        />
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600">Прогресс: {job.progress}%</p>

                                                    {job.errorMessage === undefined ? null : (
                                                        <Alert color="danger" className="mt-2">
                                                            {job.errorMessage}
                                                        </Alert>
                                                    )}
                                                    {job.errorDetails === undefined || job.errorDetails.length === 0 ? null : (
                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer text-xs font-semibold">
                                                                Подробнее об ошибке
                                                            </summary>
                                                            <ul className="mt-1 list-disc pl-5 text-xs">
                                                                {job.errorDetails.map(
                                                                    (detail, index): ReactElement => (
                                                                        <li key={`${job.id}-detail-${String(index)}`}>{detail}</li>
                                                                    ),
                                                                )}
                                                            </ul>
                                                        </details>
                                                    )}

                                                    <div className="mt-2 flex gap-2">
                                                        {job.status === "error" ? (
                                                            <Button
                                                                color="danger"
                                                                onPress={(): void => {
                                                                    handleRetryJob(job.id)
                                                                }}
                                                                size="sm"
                                                                type="button"
                                                                variant="ghost"
                                                            >
                                                                Retry
                                                            </Button>
                                                        ) : null}
                                                        {isBulkScanTerminal(job.status) || job.status === "paused" ? null : (
                                                            <Button
                                                                color="danger"
                                                                onPress={(): void => {
                                                                    handleCancelJob(job.id)
                                                                }}
                                                                size="sm"
                                                                type="button"
                                                                variant="ghost"
                                                            >
                                                                Отменить
                                                            </Button>
                                                        )}
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {isSingleMode ? (
                                    <Alert color="success">
                                        {isStarted
                                            ? "Сканирование запущено. Вы можете повторить запуск после правок."
                                            : "После запуска будет начат первичный скан."}
                                    </Alert>
                                ) : null}
                                {isSingleMode || isStarted ? null : (
                                    <Alert color="primary">
                                        После запуска вы увидите единый статус для всех репозиториев.
                                    </Alert>
                                )}
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
