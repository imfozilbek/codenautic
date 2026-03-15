import { useMemo, type ChangeEvent, type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { Controller } from "react-hook-form"

import { useDynamicTranslation } from "@/lib/i18n"
import {
    Alert,
    Button,
    Chip,
    Input,
    ListBox,
    ListBoxItem,
    Radio,
    RadioGroup,
    Select,
    Switch,
} from "@heroui/react"
import type { IFormSelectOption } from "@/components/forms"
import { TYPOGRAPHY } from "@/lib/constants/typography"

import type { IOnboardingWizardState } from "../use-onboarding-wizard-state"
import type { IOnboardingFormValues, TOnboardingTemplateId } from "../onboarding-wizard-types"
import { PREVIEW_REPOSITORY_LIMIT, PREVIEW_TEMPLATE_DIFF_LIMIT } from "../onboarding-wizard-types"
import {
    formatTemplateTags,
    mapProviderLabel,
    splitTemplateTagsForPreview,
    ONBOARDING_TEMPLATES,
} from "../onboarding-templates"

/**
 * Параметры компонента шага настройки сканирования.
 */
export interface IScanConfigurationStepProps {
    /** Состояние визарда. */
    readonly state: IOnboardingWizardState
}

/**
 * Шаг 2: настройка параметров сканирования (шаблоны, режим, расписание, воркеры, email, итоговая сводка).
 *
 * @param props Конфигурация.
 * @returns Компонент шага настройки сканирования.
 */
export function ScanConfigurationStep({ state }: IScanConfigurationStepProps): ReactElement | null {
    const { t } = useTranslation(["onboarding"])
    const { td } = useDynamicTranslation(["onboarding"])

    const templateOptions: ReadonlyArray<{
        readonly label: string
        readonly value: TOnboardingTemplateId
    }> = useMemo(
        () => [
            {
                label: t("onboarding:templates.customLabel"),
                value: "custom" as TOnboardingTemplateId,
            },
            ...ONBOARDING_TEMPLATES.map(
                (
                    template,
                ): {
                    readonly label: string
                    readonly value: TOnboardingTemplateId
                } => ({
                    label: `${template.name} — ${template.version}`,
                    value: template.id,
                }),
            ),
        ],
        [t],
    )

    const scanModeSelectOptions: ReadonlyArray<IFormSelectOption> = useMemo(
        () => [
            {
                label: t("onboarding:scanModeOptions.incremental"),
                value: "incremental",
            },
            {
                label: t("onboarding:scanModeOptions.full"),
                value: "full",
            },
            {
                label: t("onboarding:scanModeOptions.delta"),
                value: "delta",
            },
        ],
        [t],
    )

    const scanScheduleSelectOptions: ReadonlyArray<IFormSelectOption> = useMemo(
        () => [
            {
                description: t("onboarding:scheduleOptions.manualDescription"),
                label: t("onboarding:scheduleOptions.manual"),
                value: "manual",
            },
            {
                description: t("onboarding:scheduleOptions.hourlyDescription"),
                label: t("onboarding:scheduleOptions.hourly"),
                value: "hourly",
            },
            {
                description: t("onboarding:scheduleOptions.dailyDescription"),
                label: t("onboarding:scheduleOptions.daily"),
                value: "daily",
            },
            {
                description: t("onboarding:scheduleOptions.weeklyDescription"),
                label: t("onboarding:scheduleOptions.weekly"),
                value: "weekly",
            },
        ],
        [t],
    )

    if (state.activeStep !== 2) {
        return null
    }

    return (
        <>
            <section className="space-y-3">
                <div className="rounded-md border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">
                        {t("onboarding:scan.templateRegistry")}
                    </p>
                    <p className="text-xs text-muted">
                        {t("onboarding:scan.templateRegistryHint")}
                    </p>
                    <div className="mt-2">
                        <Controller<IOnboardingFormValues, "onboardingTemplateId">
                            control={state.form.control}
                            name="onboardingTemplateId"
                            render={({ field, fieldState }): ReactElement => {
                                const errorMessage =
                                    typeof fieldState.error?.message === "string"
                                        ? fieldState.error.message
                                        : undefined
                                const hasError = errorMessage !== undefined
                                const helperId = "onboardingTemplateId-helper"
                                const label = t("onboarding:scan.templateFieldLabel")
                                const helperText = t(
                                    "onboarding:scan.templateFieldHelper",
                                )

                                return (
                                    <div className="flex flex-col gap-1.5">
                                        <span className={TYPOGRAPHY.label}>
                                            {label}
                                        </span>
                                        <RadioGroup
                                            aria-describedby={helperId}
                                            aria-label={label}
                                            aria-invalid={hasError}
                                            name={field.name}
                                            value={field.value ?? ""}
                                            onChange={(value: string): void => {
                                                field.onChange(value)
                                            }}
                                        >
                                            {templateOptions.map(
                                                (option): ReactElement => (
                                                    <Radio
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </Radio>
                                                ),
                                            )}
                                        </RadioGroup>
                                        <span id={helperId}>
                                            {hasError ? (
                                                <p
                                                    className="text-xs text-danger"
                                                    role="alert"
                                                >
                                                    {errorMessage}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted">
                                                    {helperText}
                                                </p>
                                            )}
                                        </span>
                                    </div>
                                )
                            }}
                        />
                    </div>

                    {state.selectedTemplate !== undefined ? (
                        <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-semibold">
                                {t("onboarding:scan.whatWillBeApplied")}
                            </summary>
                            <div className="mt-2 space-y-1 text-xs text-foreground">
                                <p>
                                    <span className="font-semibold">
                                        {t("onboarding:scan.idLabel")}:
                                    </span>{" "}
                                    {state.selectedTemplate.id}
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        {t("onboarding:scan.versionLabel")}:
                                    </span>{" "}
                                    {state.selectedTemplate.version}
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        {t("onboarding:scan.rulesLabel")}:
                                    </span>{" "}
                                    {state.selectedTemplate.rulesPreset}
                                </p>
                                <p>
                                    <span className="font-semibold">
                                        {t("onboarding:scan.descriptionLabel")}:
                                    </span>{" "}
                                    {state.selectedTemplate.description}
                                </p>
                                {state.templateDiff.slice(0, PREVIEW_TEMPLATE_DIFF_LIMIT).map(
                                    (line): ReactElement => (
                                        <p key={line}>{line}</p>
                                    ),
                                )}
                            </div>
                        </details>
                    ) : null}

                    {state.canApplyTemplate ? (
                        <div className="mt-2">
                            <Button
                                isDisabled={state.hasTemplateChanges === false}
                                onPress={(): void => {
                                    state.applyTemplateToForm()
                                }}
                                size="sm"
                                type="button"
                                variant="ghost"
                            >
                                {t("onboarding:scan.applyTemplate")}
                            </Button>
                        </div>
                    ) : null}

                    <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold">
                            {t("onboarding:scan.auditLogTitle")}
                        </summary>
                        {state.templateAuditLog.length === 0 ? (
                            <p className="mt-2 text-sm text-muted">
                                {t("onboarding:scan.auditLogEmpty")}
                            </p>
                        ) : null}
                        {state.templateAuditLog.length === 0 ? null : (
                            <div className="mt-2 space-y-2">
                                {state.templateAuditLog
                                    .slice()
                                    .reverse()
                                    .map(
                                        (entry): ReactElement => (
                                            <article
                                                className="rounded-md border p-2"
                                                key={`${entry.templateId}-${entry.appliedAt}`}
                                            >
                                                <p className="text-xs">
                                                    {entry.templateName} — {entry.templateVersion}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {entry.appliedAt}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {td("onboarding:scan.auditLogFrom", {
                                                        before: formatTemplateTags(
                                                            entry.before.tags,
                                                        ),
                                                        after: formatTemplateTags(entry.after.tags),
                                                    })}
                                                </p>
                                            </article>
                                        ),
                                    )}
                                <Button
                                    variant="tertiary"
                                    isDisabled={state.lastTemplateAudit === undefined}
                                    onPress={(): void => {
                                        state.handleRollbackTemplate()
                                    }}
                                    size="sm"
                                    type="button"
                                >
                                    {t("onboarding:scan.rollbackLast")}
                                </Button>
                            </div>
                        )}
                    </details>
                </div>

                <Controller<IOnboardingFormValues, "scanMode">
                    control={state.form.control}
                    name="scanMode"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "scan-mode"
                        const helperId = `${fieldId}-helper`
                        const selectedKey =
                            field.value === undefined ? null : String(field.value)
                        const label = t("onboarding:scan.scanModeLabel")
                        const helperText = t("onboarding:scan.scanModeHelper")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Select
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    name={field.name}
                                    id={fieldId}
                                    selectedKey={selectedKey}
                                    onSelectionChange={(key): void => {
                                        const nextValue =
                                            typeof key === "string" ? key : undefined
                                        field.onChange(nextValue)
                                    }}
                                >
                                    <Select.Trigger>
                                        <Select.Value />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        <ListBox>
                                            {scanModeSelectOptions.map(
                                                (option): ReactElement => (
                                                    <ListBoxItem
                                                        key={option.value}
                                                        id={option.value}
                                                        textValue={option.label}
                                                        isDisabled={option.isDisabled}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span>{option.label}</span>
                                                            {option.description ===
                                                            undefined ? null : (
                                                                <span className="text-xs text-muted">
                                                                    {option.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </ListBoxItem>
                                                ),
                                            )}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                                <span id={helperId}>
                                    {hasError ? (
                                        <p className="text-xs text-danger" role="alert">
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">{helperText}</p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "tags">
                    control={state.form.control}
                    name="tags"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "onboarding-tags"
                        const helperId = `${fieldId}-helper`
                        const value = typeof field.value === "string" ? field.value : ""
                        const label = t("onboarding:scan.tagsLabel")
                        const helperText = t("onboarding:scan.tagsHelper")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Input
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    id={fieldId}
                                    name={field.name}
                                    placeholder={t("onboarding:scan.tagsPlaceholder")}
                                    type="text"
                                    value={value}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                />
                                <span id={helperId}>
                                    {hasError ? (
                                        <p className="text-xs text-danger" role="alert">
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">{helperText}</p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "scanSchedule">
                    control={state.form.control}
                    name="scanSchedule"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "scan-schedule"
                        const helperId = `${fieldId}-helper`
                        const selectedKey =
                            field.value === undefined ? null : String(field.value)
                        const label = t("onboarding:scan.scheduleLabel")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Select
                                    aria-describedby={
                                        hasError ? helperId : undefined
                                    }
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    name={field.name}
                                    id={fieldId}
                                    selectedKey={selectedKey}
                                    onSelectionChange={(key): void => {
                                        const nextValue =
                                            typeof key === "string"
                                                ? key
                                                : undefined
                                        field.onChange(nextValue)
                                    }}
                                >
                                    <Select.Trigger>
                                        <Select.Value />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        <ListBox>
                                            {scanScheduleSelectOptions.map(
                                                (option): ReactElement => (
                                                    <ListBoxItem
                                                        key={option.value}
                                                        id={option.value}
                                                        textValue={option.label}
                                                        isDisabled={
                                                            option.isDisabled
                                                        }
                                                    >
                                                        <div className="flex flex-col">
                                                            <span>
                                                                {option.label}
                                                            </span>
                                                            {option.description ===
                                                            undefined ? null : (
                                                                <span className="text-xs text-muted">
                                                                    {
                                                                        option.description
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </ListBoxItem>
                                                ),
                                            )}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                                <span id={helperId}>
                                    {hasError ? (
                                        <p
                                            className="text-xs text-danger"
                                            role="alert"
                                        >
                                            {errorMessage}
                                        </p>
                                    ) : null}
                                </span>
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "scanThreads">
                    control={state.form.control}
                    name="scanThreads"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "scan-threads"
                        const helperId = `${fieldId}-helper`
                        const value =
                            field.value === undefined ? "" : String(field.value)
                        const label = t("onboarding:scan.workersLabel")
                        const helperText = t("onboarding:scan.workersHelper")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Input
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    id={fieldId}
                                    inputMode="decimal"
                                    max={32}
                                    min={1}
                                    name={field.name}
                                    placeholder="4"
                                    type="number"
                                    value={value}
                                    onBlur={field.onBlur}
                                    onChange={(
                                        event: ChangeEvent<HTMLInputElement>,
                                    ): void => {
                                        const nextValue = event.target.value

                                        if (nextValue === "") {
                                            field.onChange(undefined)
                                            return
                                        }

                                        const parsedNumber = Number(nextValue)
                                        if (Number.isNaN(parsedNumber) === true) {
                                            field.onChange(undefined)
                                            return
                                        }

                                        field.onChange(parsedNumber)
                                    }}
                                />
                                <span id={helperId}>
                                    {hasError ? (
                                        <p
                                            className="text-xs text-danger"
                                            role="alert"
                                        >
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">
                                            {helperText}
                                        </p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "includeSubmodules">
                    control={state.form.control}
                    name="includeSubmodules"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const label = t("onboarding:scan.submodulesLabel")

                        return (
                            <div className="flex flex-col gap-1">
                                <Switch
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    name={field.name}
                                    isSelected={field.value === true}
                                    onChange={field.onChange}
                                >
                                    {label}
                                </Switch>
                                {hasError ? (
                                    <p className="text-xs text-danger" role="alert">
                                        {errorMessage}
                                    </p>
                                ) : null}
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "includeHistory">
                    control={state.form.control}
                    name="includeHistory"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const helperId = "includeHistory-helper"
                        const label = t("onboarding:scan.historyLabel")
                        const helperText = t("onboarding:scan.historyHelper")

                        return (
                            <div className="flex flex-col gap-1">
                                <Switch
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    name={field.name}
                                    isSelected={field.value === true}
                                    onChange={field.onChange}
                                >
                                    {label}
                                </Switch>
                                <span id={helperId}>
                                    {hasError ? (
                                        <p
                                            className="text-xs text-danger"
                                            role="alert"
                                        >
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">
                                            {helperText}
                                        </p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
                <Controller<IOnboardingFormValues, "notifyEmail">
                    control={state.form.control}
                    name="notifyEmail"
                    render={({ field, fieldState }): ReactElement => {
                        const errorMessage =
                            typeof fieldState.error?.message === "string"
                                ? fieldState.error.message
                                : undefined
                        const hasError = errorMessage !== undefined
                        const fieldId = "notify-email"
                        const helperId = `${fieldId}-helper`
                        const value =
                            typeof field.value === "string" ? field.value : ""
                        const label = t("onboarding:scan.notifyEmailLabel")
                        const helperText = t("onboarding:scan.notifyEmailHelper")

                        return (
                            <div className="flex flex-col gap-1.5">
                                <label className={TYPOGRAPHY.label} htmlFor={fieldId}>
                                    {label}
                                </label>
                                <Input
                                    aria-describedby={helperId}
                                    aria-label={label}
                                    aria-invalid={hasError}
                                    id={fieldId}
                                    name={field.name}
                                    placeholder="dev@company.com"
                                    type="email"
                                    value={value}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                />
                                <span id={helperId}>
                                    {hasError ? (
                                        <p
                                            className="text-xs text-danger"
                                            role="alert"
                                        >
                                            {errorMessage}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted">
                                            {helperText}
                                        </p>
                                    )}
                                </span>
                            </div>
                        )
                    }}
                />
            </section>

            <section className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                    {t("onboarding:summary.title")}
                </p>
                <div className="grid gap-2 rounded-lg border border-border p-3">
                    {state.isSingleMode ? (
                        <p className="text-sm">
                            <span className="font-semibold">
                                {t("onboarding:summary.repositoryLabel")}:
                            </span>{" "}
                            {state.values.repositoryUrl}
                        </p>
                    ) : null}
                    <details className="rounded-md border border-border p-2">
                        <summary className="cursor-pointer text-sm font-semibold">
                            {t("onboarding:summary.onboardingTemplate")}
                        </summary>
                        <p className="mt-1 text-sm text-foreground">
                            {state.appliedTemplateMeta.name} ({state.appliedTemplateMeta.version})
                        </p>
                        <p className="text-sm text-foreground">
                            {t("onboarding:scan.rulesLabel")}:{" "}
                            {state.appliedTemplateMeta.rulesPreset}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {splitTemplateTagsForPreview(state.appliedTemplateMeta.tags).map(
                                (tag): ReactElement => (
                                    <Chip key={tag} size="sm">
                                        {tag}
                                    </Chip>
                                ),
                            )}
                        </div>
                    </details>
                    {state.isSingleMode ? null : (
                        <details className="rounded-md border border-border p-2">
                            <summary className="cursor-pointer text-sm font-semibold">
                                {t("onboarding:summary.appliedProfile")}
                            </summary>
                            <p className="mt-1 text-sm text-foreground">
                                {td("onboarding:summary.profileDescription", {
                                    count: String(state.selectedRepositoryUrls.length),
                                    mode: state.values.scanMode,
                                    schedule: state.values.scanSchedule,
                                })}
                            </p>
                            {state.selectedRepositoryUrls.length === 0 ? null : (
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                    {state.selectedRepositoryUrls
                                        .slice(0, PREVIEW_REPOSITORY_LIMIT)
                                        .map(
                                            (repositoryUrl): ReactElement => (
                                                <li key={`summary-repo-${repositoryUrl}`}>
                                                    {repositoryUrl}
                                                </li>
                                            ),
                                        )}
                                    {state.selectedRepositoryUrls.length >
                                    PREVIEW_REPOSITORY_LIMIT ? (
                                        <li>
                                            {td("onboarding:summary.moreRepositories", {
                                                count: String(
                                                    state.selectedRepositoryUrls.length -
                                                        PREVIEW_REPOSITORY_LIMIT,
                                                ),
                                            })}
                                        </li>
                                    ) : null}
                                </ul>
                            )}
                        </details>
                    )}
                    <p className="text-sm">
                        <span className="font-semibold">
                            {t("onboarding:summary.providerLabel")}:
                        </span>{" "}
                        {mapProviderLabel(state.values.provider)} (
                        {state.isProviderConnected
                            ? t("onboarding:summary.providerConnected")
                            : t("onboarding:summary.providerNotConnected")}
                        )
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">{t("onboarding:summary.modeLabel")}:</span>{" "}
                        {state.values.scanMode}
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">
                            {t("onboarding:summary.scheduleLabel")}:
                        </span>{" "}
                        {state.values.scanSchedule}
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">
                            {t("onboarding:summary.workersLabel")}:
                        </span>{" "}
                        {state.values.scanThreads}
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">
                            {t("onboarding:summary.submodulesLabel")}:
                        </span>{" "}
                        {state.values.includeSubmodules
                            ? t("onboarding:boolean.yes")
                            : t("onboarding:boolean.no")}
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">
                            {t("onboarding:summary.historyLabel")}:
                        </span>{" "}
                        {state.values.includeHistory
                            ? t("onboarding:boolean.yes")
                            : t("onboarding:boolean.no")}
                    </p>
                    <p className="text-sm">
                        <span className="font-semibold">{t("onboarding:summary.emailLabel")}:</span>{" "}
                        {state.values.notifyEmail.length === 0
                            ? t("onboarding:summary.emailNotSet")
                            : state.values.notifyEmail}
                    </p>
                </div>

                {state.isSingleMode ? (
                    <Alert status="success">
                        {state.isStarted
                            ? t("onboarding:summary.singleStartedAlert")
                            : t("onboarding:summary.singleReadyAlert")}
                    </Alert>
                ) : null}
                {state.isSingleMode || state.isStarted ? null : (
                    <Alert status="accent">{t("onboarding:summary.bulkReadyAlert")}</Alert>
                )}
            </section>
        </>
    )
}
