import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input, Switch } from "@heroui/react"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"
import type { IByokKeyEntry, TByokProvider } from "@/lib/api/endpoints/byok.endpoint"
import { useByok } from "@/lib/hooks/queries/use-byok"

/**
 * Локальное состояние формы создания ключа.
 */
interface ICreateKeyFormState {
    /**
     * Выбранный провайдер.
     */
    readonly provider: TByokProvider
    /**
     * Ярлык ключа.
     */
    readonly label: string
    /**
     * Введенный секрет.
     */
    readonly secret: string
}

/**
 * Допустимые провайдеры для выбора в форме.
 */
const PROVIDER_OPTIONS: ReadonlyArray<TByokProvider> = ["openai", "anthropic", "github", "gitlab"]

/**
 * Форматирует провайдер в человекочитаемый ярлык.
 *
 * @param provider - Идентификатор провайдера.
 * @returns Отформатированное название провайдера.
 */
function formatProviderLabel(provider: TByokProvider): string {
    if (provider === "openai") {
        return "OpenAI"
    }
    if (provider === "anthropic") {
        return "Anthropic"
    }
    if (provider === "github") {
        return "GitHub"
    }
    return "GitLab"
}

/**
 * Форматирует дату последнего использования.
 *
 * @param value - ISO 8601 строка даты.
 * @returns Локализованная строка даты или "Never".
 */
function formatLastUsed(value: string): string {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return "Never"
    }

    return parsed.toLocaleString([], {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
    })
}

/**
 * Страница управления BYOK ключами провайдеров.
 *
 * @returns UI для добавления, ротации и мониторинга ключей.
 */
export function SettingsByokPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const { keysQuery, createKey, deleteKey, rotateKey, toggleKey } = useByok()
    const keys: ReadonlyArray<IByokKeyEntry> = keysQuery.data?.keys ?? []
    const [form, setForm] = useState<ICreateKeyFormState>({
        label: "",
        provider: "openai",
        secret: "",
    })

    const stats = useMemo((): {
        readonly activeKeys: number
        readonly totalKeys: number
        readonly totalRequests: number
        readonly totalTokens: number
    } => {
        return keys.reduce(
            (
                accumulator,
                entry,
            ): {
                readonly activeKeys: number
                readonly totalKeys: number
                readonly totalRequests: number
                readonly totalTokens: number
            } => {
                return {
                    activeKeys: accumulator.activeKeys + (entry.isActive ? 1 : 0),
                    totalKeys: accumulator.totalKeys + 1,
                    totalRequests: accumulator.totalRequests + entry.usageRequests,
                    totalTokens: accumulator.totalTokens + entry.usageTokens,
                }
            },
            {
                activeKeys: 0,
                totalKeys: 0,
                totalRequests: 0,
                totalTokens: 0,
            },
        )
    }, [keys])

    const providerUsage = useMemo((): ReadonlyArray<{
        readonly keys: number
        readonly provider: TByokProvider
        readonly requests: number
        readonly tokens: number
    }> => {
        return PROVIDER_OPTIONS.map(
            (
                provider,
            ): {
                readonly keys: number
                readonly provider: TByokProvider
                readonly requests: number
                readonly tokens: number
            } => {
                const matchingKeys = keys.filter((entry): boolean => entry.provider === provider)
                return {
                    keys: matchingKeys.length,
                    provider,
                    requests: matchingKeys.reduce(
                        (sum, entry): number => sum + entry.usageRequests,
                        0,
                    ),
                    tokens: matchingKeys.reduce((sum, entry): number => sum + entry.usageTokens, 0),
                }
            },
        )
    }, [keys])

    const handleCreateKey = (): void => {
        const normalizedLabel = form.label.trim()
        const normalizedSecret = form.secret.trim()

        if (normalizedLabel.length < 3) {
            showToastError(t("settings:byok.toast.keyLabelTooShort"))
            return
        }
        if (normalizedSecret.length < 12) {
            showToastError(t("settings:byok.toast.apiKeyTooShort"))
            return
        }

        createKey.mutate(
            {
                provider: form.provider,
                label: normalizedLabel,
                secret: normalizedSecret,
            },
            {
                onSuccess: (response): void => {
                    setForm({
                        label: "",
                        provider: form.provider,
                        secret: "",
                    })
                    showToastSuccess(
                        t("settings:byok.toast.keyAdded", { label: response.key.label }),
                    )
                },
            },
        )
    }

    const handleRotateKey = (keyId: string): void => {
        rotateKey.mutate(keyId, {
            onSuccess: (): void => {
                showToastInfo(t("settings:byok.toast.keyRotated"))
            },
        })
    }

    const handleToggleActive = (keyId: string, isActive: boolean): void => {
        toggleKey.mutate({ id: keyId, isActive })
    }

    const handleDeleteKey = (keyId: string): void => {
        deleteKey.mutate(keyId, {
            onSuccess: (): void => {
                showToastInfo(t("settings:byok.toast.keyRemoved"))
            },
        })
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]">
            <div className="space-y-1.5">
                <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:byok.pageTitle")}</h1>
                <p className={TYPOGRAPHY.bodyMuted}>{t("settings:byok.pageSubtitle")}</p>
            </div>
            <div className="space-y-6">
            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:byok.addApiKey")}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
                        <select
                            aria-label={t("settings:ariaLabel.byok.provider")}
                            className={NATIVE_FORM.select}
                            id="byok-provider"
                            value={form.provider}
                            onChange={(event): void => {
                                const nextProvider = event.currentTarget.value
                                if (
                                    nextProvider === "openai" ||
                                    nextProvider === "anthropic" ||
                                    nextProvider === "github" ||
                                    nextProvider === "gitlab"
                                ) {
                                    setForm(
                                        (previous): ICreateKeyFormState => ({
                                            ...previous,
                                            provider: nextProvider,
                                        }),
                                    )
                                }
                            }}
                        >
                            <option value="openai">{t("settings:byok.providerOpenai")}</option>
                            <option value="anthropic">
                                {t("settings:byok.providerAnthropic")}
                            </option>
                            <option value="github">{t("settings:byok.providerGithub")}</option>
                            <option value="gitlab">{t("settings:byok.providerGitlab")}</option>
                        </select>
                        <Input
                            aria-label={t("settings:byok.keyLabel")}
                            placeholder={t("settings:byok.keyLabelPlaceholder")}
                            value={form.label}
                            onChange={(e): void => {
                                setForm(
                                    (previous): ICreateKeyFormState => ({
                                        ...previous,
                                        label: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <Input
                            aria-label={t("settings:byok.apiKeySecret")}
                            placeholder={t("settings:byok.apiKeySecretPlaceholder")}
                            type="password"
                            value={form.secret}
                            onChange={(e): void => {
                                setForm(
                                    (previous): ICreateKeyFormState => ({
                                        ...previous,
                                        secret: e.target.value,
                                    }),
                                )
                            }}
                        />
                        <div className="flex items-end">
                            <Button
                                className="w-full md:w-auto"
                                isLoading={createKey.isPending}
                                variant="primary"
                                onPress={handleCreateKey}
                            >
                                {t("settings:byok.addKey")}
                            </Button>
                        </div>
                    </div>
                    <Alert status="accent">
                        <Alert.Title>{t("settings:byok.secretsMaskedTitle")}</Alert.Title>
                        <Alert.Description>
                            {t("settings:byok.secretsMaskedDescription")}
                        </Alert.Description>
                    </Alert>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:byok.totalKeys")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">{stats.totalKeys}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:byok.activeKeys")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">{stats.activeKeys}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:byok.usageRequests")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">
                            {stats.totalRequests}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:byok.usageTokens")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">
                            {stats.totalTokens}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:byok.providerUsageStats")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {providerUsage.map(
                        (entry): ReactElement => (
                            <div
                                key={entry.provider}
                                className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                            >
                                <p className="font-semibold text-foreground">
                                    {formatProviderLabel(entry.provider)}
                                </p>
                                <p className="text-muted">
                                    {t("settings:byok.providerStats", {
                                        keys: entry.keys,
                                        requests: entry.requests,
                                        tokens: entry.tokens,
                                    })}
                                </p>
                            </div>
                        ),
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:byok.configuredKeys")}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {keys.length === 0 ? (
                        <Alert status="warning">
                            <Alert.Title>{t("settings:byok.noKeysConfiguredTitle")}</Alert.Title>
                            <Alert.Description>
                                {t("settings:byok.noKeysConfiguredDescription")}
                            </Alert.Description>
                        </Alert>
                    ) : (
                        keys.map(
                            (entry): ReactElement => (
                                <article
                                    key={entry.id}
                                    className="rounded-lg border border-border bg-surface p-3"
                                >
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                {entry.label}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {t("settings:byok.provider", {
                                                    provider: formatProviderLabel(entry.provider),
                                                })}
                                            </p>
                                            <p className="font-mono text-xs text-muted">
                                                {entry.maskedSecret}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {t("settings:byok.rotation", {
                                                    count: entry.rotationCount,
                                                })}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {t("settings:byok.usage", {
                                                    requests: entry.usageRequests,
                                                    tokens: entry.usageTokens,
                                                })}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {t("settings:byok.lastUsed", {
                                                    date: formatLastUsed(entry.lastUsedAt),
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-start gap-2">
                                            <Chip
                                                color={entry.isActive ? "success" : "default"}
                                                size="sm"
                                                variant="soft"
                                            >
                                                {entry.isActive
                                                    ? t("settings:byok.active")
                                                    : t("settings:byok.inactive")}
                                            </Chip>
                                            <Switch
                                                aria-label={`Active key ${entry.label}`}
                                                isSelected={entry.isActive}
                                                size="sm"
                                                onChange={(isSelected: boolean): void => {
                                                    handleToggleActive(entry.id, isSelected)
                                                }}
                                            >
                                                {t("settings:byok.activeLabel")}
                                            </Switch>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onPress={(): void => {
                                                        handleRotateKey(entry.id)
                                                    }}
                                                >
                                                    {t("settings:byok.rotateKey", {
                                                        label: entry.label,
                                                    })}
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onPress={(): void => {
                                                        handleDeleteKey(entry.id)
                                                    }}
                                                >
                                                    {t("settings:byok.removeKey", {
                                                        label: entry.label,
                                                    })}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ),
                        )
                    )}
                </CardContent>
            </Card>
            </div>
        </div>
    )
}
