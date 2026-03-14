import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"

import { useDynamicTranslation } from "@/lib/i18n"
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form"

import { showToastSuccess } from "@/lib/notifications/toast"
import { parseBulkRepositoryList } from "./bulk-repository-parser"
import { ONBOARDING_FORM_SCHEMA, DEFAULT_ONBOARDING_VALUES } from "./onboarding-wizard-schema"
import {
    createBulkScanJobs,
    summarizeBulkScanJobs,
    convertFormValuesToTemplateState,
    mapTemplateToFormState,
    isTemplateStateEqual,
    toAppliedTemplateMeta,
    buildTemplateDiffLine,
    formatTemplateTags,
    getTemplateById,
    isBulkScanTerminal,
    formatBooleanForSummary,
    mapProviderLabel,
} from "./onboarding-templates"
import type {
    IBulkScanJob,
    IBulkScanSummary,
    IOnboardingAppliedTemplateMeta,
    IOnboardingFormValues,
    IOnboardingTemplate,
    IOnboardingTemplateAuditEntry,
    IOnboardingTemplateFormState,
    IOnboardingWizardPageProps,
    IParsedBulkRepositoryList,
    TGitProvider,
    TOnboardingTemplateId,
} from "./onboarding-wizard-types"
import { CUSTOM_TEMPLATE_ID, STEP_FIELDS, WIZARD_STEPS } from "./onboarding-wizard-types"

/**
 * Хук, инкапсулирующий всё состояние и логику мастера onboarding.
 *
 * @param props Props страницы (содержит callback запуска скана).
 * @returns Полное состояние визарда и обработчики действий.
 */
export function useOnboardingWizardState(
    props: IOnboardingWizardPageProps,
): IOnboardingWizardStateReturn {
    const { t } = useTranslation(["onboarding"])
    const { td } = useDynamicTranslation(["onboarding"])
    const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)
    const [isStarted, setIsStarted] = useState(false)
    const [connectedProvider, setConnectedProvider] = useState<TGitProvider | undefined>(undefined)
    const [providerConnectionError, setProviderConnectionError] = useState<string | undefined>(
        undefined,
    )
    const [activeTemplateId, setActiveTemplateId] =
        useState<TOnboardingTemplateId>(CUSTOM_TEMPLATE_ID)
    const [templateAuditLog, setTemplateAuditLog] = useState<
        ReadonlyArray<IOnboardingTemplateAuditEntry>
    >([])
    const [selectedRepositoryUrls, setSelectedRepositoryUrls] = useState<ReadonlyArray<string>>([])
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
    const values = form.watch()
    const isSingleMode = values.onboardingMode === "single"
    const isProviderConnected = connectedProvider === values.provider
    const selectedTemplateId = values.onboardingTemplateId
    const selectedTemplate = getTemplateById(selectedTemplateId)
    const activeTemplate = getTemplateById(activeTemplateId)
    const shouldApplyTemplate = selectedTemplate !== undefined
    const canApplyTemplate = shouldApplyTemplate && selectedTemplate.id !== activeTemplateId
    const templateStateFromForm = convertFormValuesToTemplateState(values)
    const templateStateFromSelection =
        selectedTemplate === undefined
            ? templateStateFromForm
            : mapTemplateToFormState(selectedTemplate)
    const templateDiff = buildTemplateDiffItems(
        shouldApplyTemplate,
        templateStateFromForm,
        templateStateFromSelection,
        td,
    )
    const hasTemplateChanges = canApplyTemplate
        ? isTemplateStateEqual(templateStateFromForm, templateStateFromSelection) === false
        : false
    const appliedTemplateMeta = toAppliedTemplateMeta(activeTemplateId, activeTemplate)
    const parsedBulkList = useMemo(
        () => parseBulkRepositoryList(values.repositoryUrlList),
        [values.repositoryUrlList],
    )
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
                setProviderConnectionError(t("onboarding:provider.connectionError"))
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
                    message: t("onboarding:validation.selectAtLeastOneRepo"),
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
            nextValues.onboardingMode === "bulk"
                ? selectedRepositoryUrls
                : [nextValues.repositoryUrl]
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
            isBulkMode
                ? t("onboarding:toast.bulkScanStarted")
                : t("onboarding:toast.singleScanStarted"),
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
        showToastSuccess(
            td("onboarding:provider.connectedToast", {
                provider: mapProviderLabel(values.provider),
            }),
        )
    }

    const applyTemplateToForm = (): void => {
        if (selectedTemplate === undefined) {
            return
        }

        const nextTemplateState = mapTemplateToFormState(selectedTemplate)
        const before = convertFormValuesToTemplateState(form.getValues())
        if (isTemplateStateEqual(before, nextTemplateState)) {
            setActiveTemplateId(selectedTemplate.id)
            form.setValue("onboardingTemplateId", selectedTemplate.id, { shouldDirty: false })
            return
        }

        form.setValue("scanMode", nextTemplateState.scanMode, { shouldDirty: false })
        form.setValue("scanSchedule", nextTemplateState.scanSchedule, { shouldDirty: false })
        form.setValue("scanThreads", nextTemplateState.scanThreads, { shouldDirty: false })
        form.setValue("includeSubmodules", nextTemplateState.includeSubmodules, {
            shouldDirty: false,
        })
        form.setValue("includeHistory", nextTemplateState.includeHistory, { shouldDirty: false })
        form.setValue("notifyEmail", nextTemplateState.notifyEmail, { shouldDirty: false })
        form.setValue("tags", formatTemplateTags(nextTemplateState.tags), { shouldDirty: false })
        form.setValue("onboardingTemplateId", selectedTemplate.id, { shouldDirty: false })
        setActiveTemplateId(selectedTemplate.id)

        const nextValues = mapTemplateToFormState(selectedTemplate)
        setTemplateAuditLog(
            (previous): ReadonlyArray<IOnboardingTemplateAuditEntry> => [
                ...previous,
                {
                    after: nextValues,
                    appliedAt: new Date().toISOString(),
                    before,
                    templateId: selectedTemplate.id,
                    templateName: selectedTemplate.name,
                    templateVersion: selectedTemplate.version,
                },
            ],
        )
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

        setTemplateAuditLog(
            (previousAudit): ReadonlyArray<IOnboardingTemplateAuditEntry> =>
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
        setBulkJobs(
            (previous): ReadonlyArray<IBulkScanJob> =>
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
        setBulkJobs(
            (previous): ReadonlyArray<IBulkScanJob> =>
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
        setBulkJobs(
            (previous): ReadonlyArray<IBulkScanJob> =>
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
        setBulkJobs(
            (previous): ReadonlyArray<IBulkScanJob> =>
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
        setBulkJobs(
            (previous): ReadonlyArray<IBulkScanJob> =>
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

    return {
        activeStep,
        activeTemplate,
        activeTemplateId,
        appliedTemplateMeta,
        bulkJobs,
        bulkSummary,
        canApplyTemplate,
        form,
        hasBulkSelection,
        hasTemplateChanges,
        isBulkPaused,
        isFinalStep,
        isProviderConnected,
        isSingleMode,
        isStarted,
        lastTemplateAudit,
        parsedBulkList,
        providerConnectionError,
        selectedRepositoryUrls,
        selectedTemplate,
        templateAuditLog,
        templateDiff,
        values,
        applyTemplateToForm,
        clearAllRepositories,
        goNextStep,
        goPrevStep,
        handleCancelAll,
        handleCancelJob,
        handleConnectProvider,
        handlePauseAll,
        handleResumeAll,
        handleRetryJob,
        handleRollbackTemplate,
        handleSubmit,
        selectAllRepositories,
        setActiveStep,
        toggleRepositorySelection,
    }
}

/**
 * Собирает массив строк diff для сравнения текущей формы с выбранным шаблоном.
 *
 * @param shouldApply Необходимость сравнения.
 * @param fromForm Состояние из формы.
 * @param fromSelection Состояние из шаблона.
 * @param t Функция перевода.
 * @returns Массив строк diff.
 */
function buildTemplateDiffItems(
    shouldApply: boolean,
    fromForm: IOnboardingTemplateFormState,
    fromSelection: IOnboardingTemplateFormState,
    t: (key: string) => string,
): ReadonlyArray<string> {
    if (shouldApply === false) {
        return []
    }

    const notSet = t("onboarding:diff.notSet")

    return [
        buildTemplateDiffLine(
            t("onboarding:summary.modeLabel"),
            fromForm.scanMode,
            fromSelection.scanMode,
        ),
        buildTemplateDiffLine(
            t("onboarding:summary.scheduleLabel"),
            fromForm.scanSchedule,
            fromSelection.scanSchedule,
        ),
        buildTemplateDiffLine(
            t("onboarding:summary.workersLabel"),
            String(fromForm.scanThreads),
            String(fromSelection.scanThreads),
        ),
        buildTemplateDiffLine(
            t("onboarding:summary.submodulesLabel"),
            formatBooleanForSummary(fromForm.includeSubmodules),
            formatBooleanForSummary(fromSelection.includeSubmodules),
        ),
        buildTemplateDiffLine(
            t("onboarding:summary.historyLabel"),
            formatBooleanForSummary(fromForm.includeHistory),
            formatBooleanForSummary(fromSelection.includeHistory),
        ),
        buildTemplateDiffLine(
            t("onboarding:summary.emailLabel"),
            fromForm.notifyEmail.length === 0 ? notSet : fromForm.notifyEmail,
            fromSelection.notifyEmail.length === 0 ? notSet : fromSelection.notifyEmail,
        ),
        buildTemplateDiffLine(
            t("onboarding:scan.tagsLabel"),
            formatTemplateTags(fromForm.tags),
            formatTemplateTags(fromSelection.tags),
        ),
    ]
}

/**
 * Тип возвращаемого значения хука useOnboardingWizardState.
 */
interface IOnboardingWizardStateReturn {
    /** Текущий активный шаг визарда. */
    readonly activeStep: 0 | 1 | 2
    /** Активный шаблон (по id). */
    readonly activeTemplate: IOnboardingTemplate | undefined
    /** Идентификатор активного шаблона. */
    readonly activeTemplateId: TOnboardingTemplateId
    /** Мета-информация примененного шаблона. */
    readonly appliedTemplateMeta: IOnboardingAppliedTemplateMeta
    /** Задачи массового сканирования. */
    readonly bulkJobs: ReadonlyArray<IBulkScanJob>
    /** Агрегированная сводка bulk-задач. */
    readonly bulkSummary: IBulkScanSummary
    /** Можно ли применить выбранный шаблон. */
    readonly canApplyTemplate: boolean
    /** Экземпляр react-hook-form. */
    readonly form: UseFormReturn<IOnboardingFormValues, unknown, IOnboardingFormValues>
    /** Есть ли хотя бы один выбранный репозиторий. */
    readonly hasBulkSelection: boolean
    /** Есть ли diff между формой и выбранным шаблоном. */
    readonly hasTemplateChanges: boolean
    /** Приостановлены ли bulk-задачи. */
    readonly isBulkPaused: boolean
    /** Является ли текущий шаг финальным. */
    readonly isFinalStep: boolean
    /** Подключен ли провайдер для текущего значения формы. */
    readonly isProviderConnected: boolean
    /** Выбран ли одиночный режим. */
    readonly isSingleMode: boolean
    /** Запущен ли скан. */
    readonly isStarted: boolean
    /** Последняя запись аудита. */
    readonly lastTemplateAudit: IOnboardingTemplateAuditEntry | undefined
    /** Разобранный bulk-список. */
    readonly parsedBulkList: IParsedBulkRepositoryList
    /** Ошибка подключения провайдера. */
    readonly providerConnectionError: string | undefined
    /** Выбранные URL репозиториев. */
    readonly selectedRepositoryUrls: ReadonlyArray<string>
    /** Выбранный шаблон (по id из формы). */
    readonly selectedTemplate: IOnboardingTemplate | undefined
    /** Лог аудита применений шаблонов. */
    readonly templateAuditLog: ReadonlyArray<IOnboardingTemplateAuditEntry>
    /** Массив строк diff шаблона. */
    readonly templateDiff: ReadonlyArray<string>
    /** Текущие значения формы. */
    readonly values: IOnboardingFormValues
    /** Применить выбранный шаблон к форме. */
    readonly applyTemplateToForm: () => void
    /** Снять выделение со всех репозиториев. */
    readonly clearAllRepositories: () => void
    /** Перейти на следующий шаг. */
    readonly goNextStep: () => Promise<void>
    /** Перейти на предыдущий шаг. */
    readonly goPrevStep: () => void
    /** Отменить все bulk-задачи. */
    readonly handleCancelAll: () => void
    /** Отменить одну bulk-задачу. */
    readonly handleCancelJob: (jobId: string) => void
    /** Подключить Git-провайдера. */
    readonly handleConnectProvider: () => void
    /** Приостановить все bulk-задачи. */
    readonly handlePauseAll: () => void
    /** Возобновить все bulk-задачи. */
    readonly handleResumeAll: () => void
    /** Повторить одну bulk-задачу. */
    readonly handleRetryJob: (jobId: string) => void
    /** Откатить последнее применение шаблона. */
    readonly handleRollbackTemplate: () => void
    /** Обработчик сабмита формы. */
    readonly handleSubmit: (nextValues: IOnboardingFormValues) => void
    /** Выбрать все репозитории. */
    readonly selectAllRepositories: () => void
    /** Установить активный шаг. */
    readonly setActiveStep: (step: 0 | 1 | 2) => void
    /** Переключить выбор одного репозитория. */
    readonly toggleRepositorySelection: (nextUrl: string) => void
}

/**
 * Тип возвращаемого значения хука useOnboardingWizardState.
 */
export type IOnboardingWizardState = ReturnType<typeof useOnboardingWizardState>
