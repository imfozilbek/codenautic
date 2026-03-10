import { type ReactElement, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useVirtualizer } from "@tanstack/react-virtual"

import { Alert, Button, Card, CardBody, CardHeader, Chip, Input, Switch } from "@/components/ui"
import { TestConnectionButton } from "@/components/settings/test-connection-button"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    showToastError,
    showToastInfo,
    showToastSuccess,
    showToastWarning,
} from "@/lib/notifications/toast"

type TWebhookDeliveryStatus = "disconnected" | "failed" | "retrying" | "success"

interface IWebhookEndpoint {
    /** Идентификатор endpoint. */
    readonly id: string
    /** URL webhook endpoint. */
    readonly url: string
    /** Подписанные event types. */
    readonly eventTypes: ReadonlyArray<string>
    /** Маскированный секрет. */
    readonly secretPreview: string
    /** Включен ли endpoint. */
    readonly isEnabled: boolean
    /** Время последней доставки. */
    readonly lastDeliveryAt?: string
    /** Статус последней доставки. */
    readonly status: TWebhookDeliveryStatus
}

interface IWebhookDeliveryLog {
    /** Идентификатор лога. */
    readonly id: string
    /** ID endpoint, которому принадлежит лог. */
    readonly endpointId: string
    /** Время события доставки. */
    readonly timestamp: string
    /** HTTP статус доставки. */
    readonly httpStatus: number
    /** Статус доставки. */
    readonly status: TWebhookDeliveryStatus
    /** Короткое сообщение. */
    readonly message: string
}

interface ICreateWebhookFormState {
    /** URL endpoint. */
    readonly url: string
    /** Типы событий через запятую. */
    readonly eventTypesCsv: string
}

const INITIAL_WEBHOOKS: ReadonlyArray<IWebhookEndpoint> = [
    {
        eventTypes: ["review.completed", "review.failed"],
        id: "wh-1001",
        isEnabled: true,
        lastDeliveryAt: "2026-03-04 10:18",
        secretPreview: "whsec_****32af",
        status: "success",
        url: "https://hooks.acme.dev/code-review",
    },
    {
        eventTypes: ["scan.completed", "scan.failed", "scan.partial"],
        id: "wh-1002",
        isEnabled: true,
        lastDeliveryAt: "2026-03-04 10:03",
        secretPreview: "whsec_****14bc",
        status: "retrying",
        url: "https://hooks.acme.dev/scan-events",
    },
    {
        eventTypes: ["provider.degraded", "provider.recovered"],
        id: "wh-1003",
        isEnabled: false,
        lastDeliveryAt: "2026-03-04 09:56",
        secretPreview: "whsec_****9e42",
        status: "failed",
        url: "https://hooks.acme.dev/provider-health",
    },
]

const INITIAL_DELIVERY_LOGS: ReadonlyArray<IWebhookDeliveryLog> = [
    {
        endpointId: "wh-1001",
        httpStatus: 200,
        id: "log-1",
        message: "Delivered review.completed payload.",
        status: "success",
        timestamp: "2026-03-04 10:18:12",
    },
    {
        endpointId: "wh-1002",
        httpStatus: 502,
        id: "log-2",
        message: "Remote endpoint unavailable, retry scheduled.",
        status: "retrying",
        timestamp: "2026-03-04 10:03:31",
    },
    {
        endpointId: "wh-1002",
        httpStatus: 429,
        id: "log-3",
        message: "Rate limited by remote endpoint.",
        status: "failed",
        timestamp: "2026-03-04 09:58:17",
    },
    {
        endpointId: "wh-1003",
        httpStatus: 401,
        id: "log-4",
        message: "Invalid secret signature on receiver side.",
        status: "failed",
        timestamp: "2026-03-04 09:56:04",
    },
]

function parseEventTypes(value: string): ReadonlyArray<string> {
    return value
        .split(",")
        .map((item): string => item.trim())
        .filter((item): boolean => item.length > 0)
}

function parseWebhookNumericId(endpointId: string): number | undefined {
    const match = /^wh-(\d+)$/u.exec(endpointId)
    if (match === null) {
        return undefined
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10)
    if (Number.isNaN(parsedValue) === true) {
        return undefined
    }

    return parsedValue
}

function createNextWebhookId(endpoints: ReadonlyArray<IWebhookEndpoint>): string {
    const maxNumericId = endpoints.reduce((maxValue, endpoint): number => {
        const parsedId = parseWebhookNumericId(endpoint.id)
        if (parsedId === undefined) {
            return maxValue
        }
        return parsedId > maxValue ? parsedId : maxValue
    }, 1000)

    return `wh-${String(maxNumericId + 1)}`
}

function mapWebhookStatusColor(
    status: TWebhookDeliveryStatus,
): "danger" | "primary" | "success" | "warning" | "default" {
    if (status === "disconnected") {
        return "default"
    }

    if (status === "success") {
        return "success"
    }

    if (status === "retrying") {
        return "warning"
    }

    return "danger"
}

function mapWebhookStatusText(status: TWebhookDeliveryStatus): string {
    if (status === "disconnected") {
        return "Disconnected"
    }

    if (status === "success") {
        return "Success"
    }

    if (status === "retrying") {
        return "Retrying"
    }

    return "Failed"
}

function buildMaskedSecret(id: string): string {
    const suffix = id.slice(-4).padStart(4, "0")
    return `whsec_****${suffix}`
}

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase()
}

function hasUrlPrefix(url: string): boolean {
    return url.startsWith("https://") || url.startsWith("http://")
}

/**
 * Страница управления webhook endpoint-ами.
 *
 * @returns UI для create/delete/rotate/logs с виртуализацией.
 */
export function SettingsWebhooksPage(): ReactElement {
    const { t } = useTranslation(["settings"])
    const [webhooks, setWebhooks] = useState<ReadonlyArray<IWebhookEndpoint>>(INITIAL_WEBHOOKS)
    const [deliveryLogs, setDeliveryLogs] =
        useState<ReadonlyArray<IWebhookDeliveryLog>>(INITIAL_DELIVERY_LOGS)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | TWebhookDeliveryStatus>("all")
    const [activeEndpointId, setActiveEndpointId] = useState<string>(INITIAL_WEBHOOKS[0]?.id ?? "")
    const [createForm, setCreateForm] = useState<ICreateWebhookFormState>({
        eventTypesCsv: "",
        url: "",
    })
    const endpointsListRef = useRef<HTMLDivElement | null>(null)
    const logsListRef = useRef<HTMLDivElement | null>(null)

    const filteredWebhooks = useMemo((): ReadonlyArray<IWebhookEndpoint> => {
        const normalizedSearch = normalizeSearch(search)
        return webhooks.filter((webhook): boolean => {
            const searchMatches =
                normalizedSearch.length === 0 ||
                webhook.url.toLowerCase().includes(normalizedSearch) ||
                webhook.eventTypes.some((eventType): boolean =>
                    eventType.toLowerCase().includes(normalizedSearch),
                )
            const statusMatches = statusFilter === "all" || webhook.status === statusFilter

            return searchMatches && statusMatches
        })
    }, [search, statusFilter, webhooks])

    const selectedEndpointLogs = useMemo((): ReadonlyArray<IWebhookDeliveryLog> => {
        if (activeEndpointId.length === 0) {
            return []
        }

        return deliveryLogs.filter((entry): boolean => entry.endpointId === activeEndpointId)
    }, [activeEndpointId, deliveryLogs])

    const endpointsVirtualizer = useVirtualizer({
        count: filteredWebhooks.length,
        estimateSize: (): number => 132,
        getScrollElement: (): HTMLDivElement | null => endpointsListRef.current,
        overscan: 6,
    })
    const logsVirtualizer = useVirtualizer({
        count: selectedEndpointLogs.length,
        estimateSize: (): number => 84,
        getScrollElement: (): HTMLDivElement | null => logsListRef.current,
        overscan: 8,
    })

    const activeEndpoint = webhooks.find((item): boolean => item.id === activeEndpointId)

    const handleCreateWebhook = (): void => {
        const trimmedUrl = createForm.url.trim()
        if (trimmedUrl.length === 0 || hasUrlPrefix(trimmedUrl) === false) {
            showToastError(t("settings:webhooks.toast.webhookUrlInvalid"))
            return
        }

        const parsedEvents = parseEventTypes(createForm.eventTypesCsv)
        if (parsedEvents.length === 0) {
            showToastWarning(t("settings:webhooks.toast.addAtLeastOneEvent"))
            return
        }

        const nextId = createNextWebhookId(webhooks)
        const nextWebhook: IWebhookEndpoint = {
            eventTypes: parsedEvents,
            id: nextId,
            isEnabled: true,
            lastDeliveryAt: undefined,
            secretPreview: buildMaskedSecret(nextId),
            status: "retrying",
            url: trimmedUrl,
        }
        setWebhooks((previous): ReadonlyArray<IWebhookEndpoint> => [nextWebhook, ...previous])
        setCreateForm({
            eventTypesCsv: "",
            url: "",
        })
        setActiveEndpointId(nextId)
        showToastSuccess(t("settings:webhooks.toast.webhookCreated"))
    }

    const handleDeleteWebhook = (endpointId: string): void => {
        setWebhooks((previous): ReadonlyArray<IWebhookEndpoint> => {
            const nextItems = previous.filter((entry): boolean => entry.id !== endpointId)
            if (activeEndpointId === endpointId) {
                setActiveEndpointId(nextItems[0]?.id ?? "")
            }
            return nextItems
        })
        setDeliveryLogs(
            (previous): ReadonlyArray<IWebhookDeliveryLog> =>
                previous.filter((entry): boolean => entry.endpointId !== endpointId),
        )
        showToastInfo(t("settings:webhooks.toast.webhookDeleted"))
    }

    const handleRotateSecret = (endpointId: string): void => {
        setWebhooks(
            (previous): ReadonlyArray<IWebhookEndpoint> =>
                previous.map((webhook): IWebhookEndpoint => {
                    if (webhook.id !== endpointId) {
                        return webhook
                    }

                    return {
                        ...webhook,
                        secretPreview: buildMaskedSecret(`${endpointId}-${Date.now().toString()}`),
                        status: "retrying",
                    }
                }),
        )
        showToastSuccess(t("settings:webhooks.toast.secretRotated"))
    }

    const handleToggleEndpoint = (endpointId: string, isEnabled: boolean): void => {
        setWebhooks(
            (previous): ReadonlyArray<IWebhookEndpoint> =>
                previous.map((webhook): IWebhookEndpoint => {
                    if (webhook.id !== endpointId) {
                        return webhook
                    }

                    return {
                        ...webhook,
                        isEnabled,
                        status: isEnabled ? webhook.status : "disconnected",
                    }
                }),
        )
    }

    const handleTestDelivery = (endpointId: string): boolean => {
        const webhook = webhooks.find((item): boolean => item.id === endpointId)
        const isHealthy =
            webhook !== undefined && webhook.isEnabled === true && webhook.url.length > 0
        const now = new Date().toISOString()
        const nextLog: IWebhookDeliveryLog = {
            endpointId,
            httpStatus: isHealthy ? 200 : 503,
            id: `log-${String(deliveryLogs.length + 1)}`,
            message: isHealthy
                ? "Manual test payload delivered."
                : "Manual test failed: endpoint is disabled or not reachable.",
            status: isHealthy ? "success" : "failed",
            timestamp: now,
        }

        setDeliveryLogs((previous): ReadonlyArray<IWebhookDeliveryLog> => [nextLog, ...previous])
        setWebhooks(
            (previous): ReadonlyArray<IWebhookEndpoint> =>
                previous.map((entry): IWebhookEndpoint => {
                    if (entry.id !== endpointId) {
                        return entry
                    }

                    return {
                        ...entry,
                        lastDeliveryAt: now,
                        status: isHealthy ? "success" : "failed",
                    }
                }),
        )

        if (isHealthy) {
            showToastSuccess(t("settings:webhooks.toast.testDeliverySucceeded"))
            return true
        }

        showToastError(t("settings:webhooks.toast.testDeliveryFailed"))
        return false
    }

    return (
        <section className="space-y-4">
            <h1 className={TYPOGRAPHY.pageTitle}>{t("settings:webhooks.pageTitle")}</h1>
            <p className={TYPOGRAPHY.pageSubtitle}>
                {t("settings:webhooks.pageSubtitle")}
            </p>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>{t("settings:webhooks.createWebhookEndpoint")}</p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                        <Input
                            label={t("settings:webhooks.endpointUrl")}
                            onValueChange={(value): void => {
                                setCreateForm(
                                    (previous): ICreateWebhookFormState => ({
                                        ...previous,
                                        url: value,
                                    }),
                                )
                            }}
                            placeholder="https://hooks.acme.dev/code-review"
                            value={createForm.url}
                        />
                        <Input
                            label={t("settings:webhooks.eventTypes")}
                            onValueChange={(value): void => {
                                setCreateForm(
                                    (previous): ICreateWebhookFormState => ({
                                        ...previous,
                                        eventTypesCsv: value,
                                    }),
                                )
                            }}
                            placeholder="review.completed, scan.failed"
                            value={createForm.eventTypesCsv}
                        />
                        <div className="flex items-end">
                            <Button onPress={handleCreateWebhook} type="button">
                                {t("settings:webhooks.createEndpoint")}
                            </Button>
                        </div>
                    </div>
                    <Alert color="primary">
                        {t("settings:webhooks.secretsMaskedNotice")}
                    </Alert>
                </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                        <p className={TYPOGRAPHY.sectionTitle}>{t("settings:webhooks.webhookEndpoints")}</p>
                        <div className="flex flex-wrap gap-2">
                            <Input
                                className="min-w-[200px]"
                                onValueChange={setSearch}
                                placeholder={t("settings:webhooks.searchPlaceholder")}
                                value={search}
                            />
                            <select
                                aria-label="Filter webhooks by status"
                                className={NATIVE_FORM.select}
                                value={statusFilter}
                                onChange={(event): void => {
                                    const nextValue = event.currentTarget.value
                                    if (
                                        nextValue === "success" ||
                                        nextValue === "retrying" ||
                                        nextValue === "failed"
                                    ) {
                                        setStatusFilter(nextValue)
                                        return
                                    }
                                    setStatusFilter("all")
                                }}
                            >
                                <option value="all">{t("settings:webhooks.allStatuses")}</option>
                                <option value="success">{t("settings:webhooks.statusSuccess")}</option>
                                <option value="retrying">{t("settings:webhooks.statusRetrying")}</option>
                                <option value="failed">{t("settings:webhooks.statusFailed")}</option>
                            </select>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div
                            ref={endpointsListRef}
                            className="max-h-[520px] overflow-auto rounded-lg border border-border"
                        >
                            <div
                                className="relative"
                                style={{ height: `${endpointsVirtualizer.getTotalSize()}px` }}
                            >
                                {endpointsVirtualizer
                                    .getVirtualItems()
                                    .map((virtualItem): ReactElement | null => {
                                        const webhook = filteredWebhooks[virtualItem.index]
                                        if (webhook === undefined) {
                                            return null
                                        }

                                        const isActive = webhook.id === activeEndpointId

                                        return (
                                            <article
                                                className={`absolute left-0 top-0 w-full border-b border-border px-3 py-3 ${
                                                    isActive ? "bg-primary/10/50" : "bg-surface"
                                                }`}
                                                key={webhook.id}
                                                style={{
                                                    height: `${virtualItem.size}px`,
                                                    transform: `translateY(${virtualItem.start}px)`,
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <button
                                                        className="min-w-0 text-left"
                                                        onClick={(): void => {
                                                            setActiveEndpointId(webhook.id)
                                                        }}
                                                        type="button"
                                                    >
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {webhook.url}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {t("settings:webhooks.events", { events: webhook.eventTypes.join(", ") })}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("settings:webhooks.secret", { preview: webhook.secretPreview })}
                                                        </p>
                                                    </button>
                                                    <Chip
                                                        color={mapWebhookStatusColor(
                                                            webhook.status,
                                                        )}
                                                        size="sm"
                                                        variant="flat"
                                                    >
                                                        {mapWebhookStatusText(webhook.status)}
                                                    </Chip>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <Switch
                                                        isSelected={webhook.isEnabled}
                                                        onValueChange={(value): void => {
                                                            handleToggleEndpoint(webhook.id, value)
                                                        }}
                                                    >
                                                        {t("settings:webhooks.enabled")}
                                                    </Switch>
                                                    <Button
                                                        onPress={(): void => {
                                                            handleRotateSecret(webhook.id)
                                                        }}
                                                        size="sm"
                                                        variant="light"
                                                    >
                                                        {t("settings:webhooks.rotateSecret")}
                                                    </Button>
                                                    <TestConnectionButton
                                                        onTest={(): Promise<boolean> =>
                                                            Promise.resolve(
                                                                handleTestDelivery(webhook.id),
                                                            )
                                                        }
                                                        providerLabel="Webhook"
                                                    />
                                                    <Button
                                                        color="danger"
                                                        onPress={(): void => {
                                                            handleDeleteWebhook(webhook.id)
                                                        }}
                                                        size="sm"
                                                        variant="ghost"
                                                    >
                                                        {t("settings:webhooks.delete")}
                                                    </Button>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {t("settings:webhooks.lastDelivery")}
                                                    {webhook.lastDeliveryAt ?? t("settings:webhooks.notDelivered")}
                                                </p>
                                            </article>
                                        )
                                    })}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:webhooks.deliveryLogs")}{" "}
                            {activeEndpoint === undefined ? "" : `· ${activeEndpoint.id}`}
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        {activeEndpoint === undefined ? (
                            <Alert color="warning">{t("settings:webhooks.selectEndpointToInspect")}</Alert>
                        ) : null}
                        <div
                            ref={logsListRef}
                            className="max-h-[520px] overflow-auto rounded-lg border border-border"
                        >
                            <div
                                className="relative"
                                style={{ height: `${logsVirtualizer.getTotalSize()}px` }}
                            >
                                {logsVirtualizer
                                    .getVirtualItems()
                                    .map((virtualItem): ReactElement | null => {
                                        const log = selectedEndpointLogs[virtualItem.index]
                                        if (log === undefined) {
                                            return null
                                        }

                                        return (
                                            <article
                                                className="absolute left-0 top-0 w-full border-b border-border px-3 py-3"
                                                key={log.id}
                                                style={{
                                                    height: `${virtualItem.size}px`,
                                                    transform: `translateY(${virtualItem.start}px)`,
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.timestamp}
                                                    </p>
                                                    <Chip
                                                        color={mapWebhookStatusColor(log.status)}
                                                        size="sm"
                                                        variant="flat"
                                                    >
                                                        {mapWebhookStatusText(log.status)}
                                                    </Chip>
                                                </div>
                                                <p className="mt-1 text-sm text-foreground">
                                                    {log.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t("settings:webhooks.httpStatus", { status: log.httpStatus })}
                                                </p>
                                            </article>
                                        )
                                    })}
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </section>
    )
}
