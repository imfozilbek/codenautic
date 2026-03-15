import type {
    IBulkScanJob,
    IBulkScanSummary,
    IOnboardingAppliedTemplateMeta,
    IOnboardingFormValues,
    IOnboardingTemplate,
    IOnboardingTemplateFormState,
    TBulkScanStatus,
    TGitProvider,
    TOnboardingTemplateId,
} from "./onboarding-wizard-types"

/**
 * Предустановленные шаблоны onboarding.
 */
export const ONBOARDING_TEMPLATES: ReadonlyArray<IOnboardingTemplate> = [
    {
        description:
            "Подходит для чувствительных проектов: включена история и строгие теги безопасности.",
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

/**
 * Варианты выбора шаблона для radio-группы.
 */
export const TEMPLATE_OPTIONS: ReadonlyArray<{
    readonly label: string
    readonly value: TOnboardingTemplateId
}> = [
    {
        label: "Ручная настройка",
        value: "custom",
    },
    ...ONBOARDING_TEMPLATES.map(
        (template): { readonly label: string; readonly value: TOnboardingTemplateId } => ({
            label: `${template.name} — ${template.version}`,
            value: template.id,
        }),
    ),
]

/**
 * Ищет шаблон по идентификатору.
 *
 * @param templateId Идентификатор шаблона.
 * @returns Найденный шаблон или undefined.
 */
export function getTemplateById(
    templateId: TOnboardingTemplateId,
): IOnboardingTemplate | undefined {
    return ONBOARDING_TEMPLATES.find((template): boolean => template.id === templateId)
}

/**
 * Создаёт mock-задачи для массового сканирования (демо-режим).
 *
 * @param repositoryUrls Список URL репозиториев.
 * @returns Массив задач с начальным состоянием.
 */
export function createBulkScanJobs(
    repositoryUrls: ReadonlyArray<string>,
): ReadonlyArray<IBulkScanJob> {
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

/**
 * Возвращает локализованную метку статуса bulk-задачи.
 *
 * @param status Статус задачи.
 * @returns Человекочитаемая метка.
 */
export function mapBulkStatusLabel(status: TBulkScanStatus): string {
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

/**
 * Возвращает CSS-классы для статуса bulk-задачи.
 *
 * @param status Статус задачи.
 * @returns Строка CSS-классов.
 */
export function mapBulkStatusClasses(status: TBulkScanStatus): string {
    if (status === "running") {
        return "border-accent/30 bg-accent/10 text-accent"
    }

    if (status === "queued") {
        return "border-border bg-surface text-foreground"
    }

    if (status === "paused") {
        return "border-warning/30 bg-warning/10 text-warning"
    }

    if (status === "completed") {
        return "border-success/30 bg-success/10 text-success"
    }

    if (status === "cancelled") {
        return "border-border bg-surface-secondary text-muted"
    }

    return "border-danger/30 bg-danger/10 text-danger"
}

/**
 * Возвращает CSS-класс для прогресс-бара bulk-задачи.
 *
 * @param status Статус задачи.
 * @returns Строка CSS-класса.
 */
export function mapBulkProgressClasses(status: TBulkScanStatus): string {
    if (status === "running") {
        return "bg-accent"
    }

    if (status === "error") {
        return "bg-danger"
    }

    if (status === "paused") {
        return "bg-warning"
    }

    if (status === "completed") {
        return "bg-success"
    }

    return "bg-surface-secondary"
}

/**
 * Агрегирует статусы массовых задач сканирования.
 *
 * @param jobs Массив задач.
 * @returns Сводка по статусам.
 */
export function summarizeBulkScanJobs(jobs: ReadonlyArray<IBulkScanJob>): IBulkScanSummary {
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

/**
 * Разбирает строку тегов (через запятую) в массив уникальных тегов.
 *
 * @param value Строка с тегами через запятую.
 * @returns Массив уникальных непустых тегов.
 */
export function parseTemplateTags(value: string): ReadonlyArray<string> {
    const rawParts = value.split(",")
    const tags = rawParts
        .map((part): string => part.trim())
        .filter((part): boolean => part.length > 0)
    const uniqueTags = [...new Set(tags)]

    return uniqueTags
}

/**
 * Форматирует массив тегов в строку для отображения.
 *
 * @param tags Массив тегов.
 * @returns Строка тегов через запятую или "без тегов".
 */
export function formatTemplateTags(tags: ReadonlyArray<string>): string {
    if (tags.length === 0) {
        return "без тегов"
    }

    return tags.join(", ")
}

/**
 * Подготавливает теги для chip-превью.
 *
 * @param tags Массив тегов.
 * @returns Массив тегов (без изменений, если не пуст).
 */
export function splitTemplateTagsForPreview(tags: ReadonlyArray<string>): ReadonlyArray<string> {
    if (tags.length === 0) {
        return []
    }

    return tags
}

/**
 * Конвертирует значения формы в снимок состояния шаблона.
 *
 * @param values Значения формы.
 * @returns Снимок состояния шаблона.
 */
export function convertFormValuesToTemplateState(
    values: IOnboardingFormValues,
): IOnboardingTemplateFormState {
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

/**
 * Конвертирует шаблон в снимок состояния.
 *
 * @param template Шаблон onboarding.
 * @returns Снимок состояния шаблона.
 */
export function mapTemplateToFormState(
    template: IOnboardingTemplate,
): IOnboardingTemplateFormState {
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

/**
 * Сравнивает два снимка состояния шаблона.
 *
 * @param left Первый снимок.
 * @param right Второй снимок.
 * @returns true если состояния идентичны.
 */
export function isTemplateStateEqual(
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

/**
 * Собирает мета-информацию о примененном шаблоне для payload запуска.
 *
 * @param templateId Идентификатор шаблона.
 * @param activeTemplate Активный шаблон (если есть).
 * @returns Мета-информация шаблона.
 */
export function toAppliedTemplateMeta(
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

/**
 * Формирует строку diff для одного параметра шаблона.
 *
 * @param label Название параметра.
 * @param previous Предыдущее значение.
 * @param next Новое значение.
 * @returns Строка diff.
 */
export function buildTemplateDiffLine(label: string, previous: string, next: string): string {
    if (previous === next) {
        return `${label}: оставляем ${previous}`
    }

    return `${label}: ${previous} → ${next}`
}

/**
 * Проверяет, является ли статус bulk-задачи терминальным.
 *
 * @param status Статус задачи.
 * @returns true если задача завершена, ошибочна или отменена.
 */
export function isBulkScanTerminal(status: TBulkScanStatus): boolean {
    return status === "completed" || status === "error" || status === "cancelled"
}

/**
 * Форматирует булево значение для отображения в сводке.
 *
 * @param value Булево значение.
 * @returns "Да" или "Нет".
 */
export function formatBooleanForSummary(value: boolean): string {
    return value ? "Да" : "Нет"
}

/**
 * Возвращает локализованное название Git-провайдера.
 *
 * @param provider Идентификатор провайдера.
 * @returns Человекочитаемое название.
 */
export function mapProviderLabel(provider: TGitProvider): string {
    if (provider === "github") {
        return "GitHub"
    }

    if (provider === "gitlab") {
        return "GitLab"
    }

    return "Bitbucket"
}
