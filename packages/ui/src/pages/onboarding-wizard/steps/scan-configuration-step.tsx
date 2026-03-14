import { useMemo, type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Chip } from "@/components/ui"
import {
    FormNumberField,
    FormRadioGroupField,
    FormSelectField,
    FormSwitchField,
    FormTextField,
} from "@/components/forms"
import type { IFormSelectOption } from "@/components/forms"

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
                    <p className="text-xs text-muted-foreground">
                        {t("onboarding:scan.templateRegistryHint")}
                    </p>
                    <div className="mt-2">
                        <FormRadioGroupField<IOnboardingFormValues, "onboardingTemplateId">
                            control={state.form.control}
                            helperText={t("onboarding:scan.templateFieldHelper")}
                            label={t("onboarding:scan.templateFieldLabel")}
                            name="onboardingTemplateId"
                            options={templateOptions}
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
                                variant="light"
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
                            <p className="mt-2 text-sm text-muted-foreground">
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
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.appliedAt}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(
                                                        t as unknown as (
                                                            key: string,
                                                            options: Record<string, string>,
                                                        ) => string
                                                    )("onboarding:scan.auditLogFrom", {
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
                                    color="warning"
                                    isDisabled={state.lastTemplateAudit === undefined}
                                    onPress={(): void => {
                                        state.handleRollbackTemplate()
                                    }}
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                >
                                    {t("onboarding:scan.rollbackLast")}
                                </Button>
                            </div>
                        )}
                    </details>
                </div>

                <FormSelectField<IOnboardingFormValues, "scanMode">
                    control={state.form.control}
                    id="scan-mode"
                    helperText={t("onboarding:scan.scanModeHelper")}
                    label={t("onboarding:scan.scanModeLabel")}
                    name="scanMode"
                    options={scanModeSelectOptions}
                />
                <FormTextField<IOnboardingFormValues, "tags">
                    control={state.form.control}
                    helperText={t("onboarding:scan.tagsHelper")}
                    id="onboarding-tags"
                    inputProps={{
                        placeholder: t("onboarding:scan.tagsPlaceholder"),
                        type: "text",
                    }}
                    label={t("onboarding:scan.tagsLabel")}
                    name="tags"
                />
                <FormSelectField<IOnboardingFormValues, "scanSchedule">
                    control={state.form.control}
                    id="scan-schedule"
                    label={t("onboarding:scan.scheduleLabel")}
                    name="scanSchedule"
                    options={scanScheduleSelectOptions}
                />
                <FormNumberField<IOnboardingFormValues, "scanThreads">
                    control={state.form.control}
                    id="scan-threads"
                    helperText={t("onboarding:scan.workersHelper")}
                    inputProps={{
                        min: 1,
                        max: 32,
                        placeholder: "4",
                    }}
                    label={t("onboarding:scan.workersLabel")}
                    name="scanThreads"
                />
                <FormSwitchField<IOnboardingFormValues, "includeSubmodules">
                    control={state.form.control}
                    label={t("onboarding:scan.submodulesLabel")}
                    name="includeSubmodules"
                />
                <FormSwitchField<IOnboardingFormValues, "includeHistory">
                    control={state.form.control}
                    helperText={t("onboarding:scan.historyHelper")}
                    label={t("onboarding:scan.historyLabel")}
                    name="includeHistory"
                />
                <FormTextField<IOnboardingFormValues, "notifyEmail">
                    control={state.form.control}
                    helperText={t("onboarding:scan.notifyEmailHelper")}
                    id="notify-email"
                    inputProps={{
                        placeholder: "dev@company.com",
                        type: "email",
                    }}
                    label={t("onboarding:scan.notifyEmailLabel")}
                    name="notifyEmail"
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
                                {(
                                    t as unknown as (
                                        key: string,
                                        options: Record<string, string>,
                                    ) => string
                                )("onboarding:summary.profileDescription", {
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
                                            {(
                                                t as unknown as (
                                                    key: string,
                                                    options: Record<string, string>,
                                                ) => string
                                            )("onboarding:summary.moreRepositories", {
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
                    <Alert color="success">
                        {state.isStarted
                            ? t("onboarding:summary.singleStartedAlert")
                            : t("onboarding:summary.singleReadyAlert")}
                    </Alert>
                ) : null}
                {state.isSingleMode || state.isStarted ? null : (
                    <Alert color="primary">{t("onboarding:summary.bulkReadyAlert")}</Alert>
                )}
            </section>
        </>
    )
}
