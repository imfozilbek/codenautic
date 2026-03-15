import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input, Switch } from "@heroui/react"
import { FormLayout } from "@/components/forms/form-layout"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

/**
 * Количество видимых символов в начале маскированного секрета.
 */
const SECRET_PREFIX_LENGTH = 4

type TByokProvider = "anthropic" | "github" | "gitlab" | "openai"

interface IByokKeyEntry {
    /** Уникальный идентификатор ключа. */
    readonly id: string
    /** Провайдер, к которому относится ключ. */
    readonly provider: TByokProvider
    /** Человекочитаемый ярлык ключа. */
    readonly label: string
    /** Маскированное значение секрета. */
    readonly maskedSecret: string
    /** Признак активности ключа. */
    readonly isActive: boolean
    /** Число ротаций ключа. */
    readonly rotationCount: number
    /** Количество запросов, выполненных этим ключом. */
    readonly usageRequests: number
    /** Количество токенов, потребленных этим ключом. */
    readonly usageTokens: number
    /** Время последнего использования. */
    readonly lastUsedAt: string
}

interface ICreateKeyFormState {
    /** Выбранный провайдер. */
    readonly provider: TByokProvider
    /** Ярлык ключа. */
    readonly label: string
    /** Введенный секрет. */
    readonly secret: string
}

const PROVIDER_OPTIONS: ReadonlyArray<TByokProvider> = ["openai", "anthropic", "github", "gitlab"]

const INITIAL_KEYS: ReadonlyArray<IByokKeyEntry> = [
    {
        id: "byok-1",
        isActive: true,
        label: "openai-prod-main",
        lastUsedAt: "2026-03-04T11:05:00Z",
        maskedSecret: "sk-p****001",
        provider: "openai",
        rotationCount: 1,
        usageRequests: 1284,
        usageTokens: 391820,
    },
    {
        id: "byok-2",
        isActive: true,
        label: "anthropic-fallback",
        lastUsedAt: "2026-03-04T10:47:00Z",
        maskedSecret: "sk-a****873",
        provider: "anthropic",
        rotationCount: 2,
        usageRequests: 402,
        usageTokens: 116240,
    },
]

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

function maskSecret(value: string): string {
    const normalized = value.trim()
    const prefix = normalized.slice(0, SECRET_PREFIX_LENGTH)
    const suffix = normalized.slice(-3)
    if (normalized.length < 7) {
        return "****"
    }

    return `${prefix}****${suffix}`
}

function buildKeyId(provider: TByokProvider): string {
    return `${provider}-${Date.now().toString(36)}`
}

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
    const [keys, setKeys] = useState<ReadonlyArray<IByokKeyEntry>>(INITIAL_KEYS)
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

        const nextKey: IByokKeyEntry = {
            id: buildKeyId(form.provider),
            isActive: true,
            label: normalizedLabel,
            lastUsedAt: new Date().toISOString(),
            maskedSecret: maskSecret(normalizedSecret),
            provider: form.provider,
            rotationCount: 1,
            usageRequests: 0,
            usageTokens: 0,
        }

        setKeys((previous): ReadonlyArray<IByokKeyEntry> => [nextKey, ...previous])
        setForm({
            label: "",
            provider: form.provider,
            secret: "",
        })
        showToastSuccess(t("settings:byok.toast.keyAdded", { label: nextKey.label }))
    }

    const handleRotateKey = (keyId: string): void => {
        setKeys(
            (previous): ReadonlyArray<IByokKeyEntry> =>
                previous.map((entry): IByokKeyEntry => {
                    if (entry.id !== keyId) {
                        return entry
                    }

                    const syntheticSecret = `${entry.provider}-${Date.now().toString(36)}-rot`
                    return {
                        ...entry,
                        lastUsedAt: new Date().toISOString(),
                        maskedSecret: maskSecret(syntheticSecret),
                        rotationCount: entry.rotationCount + 1,
                    }
                }),
        )
        showToastInfo(t("settings:byok.toast.keyRotated"))
    }

    const handleToggleActive = (keyId: string, isActive: boolean): void => {
        setKeys(
            (previous): ReadonlyArray<IByokKeyEntry> =>
                previous.map((entry): IByokKeyEntry => {
                    if (entry.id !== keyId) {
                        return entry
                    }
                    return {
                        ...entry,
                        isActive,
                    }
                }),
        )
    }

    const handleDeleteKey = (keyId: string): void => {
        setKeys(
            (previous): ReadonlyArray<IByokKeyEntry> =>
                previous.filter((entry): boolean => entry.id !== keyId),
        )
        showToastInfo(t("settings:byok.toast.keyRemoved"))
    }

    return (
        <FormLayout
            title={t("settings:byok.pageTitle")}
            description={t("settings:byok.pageSubtitle")}
        >
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
        </FormLayout>
    )
}
