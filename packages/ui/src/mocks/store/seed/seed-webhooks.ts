import type {
    IWebhookDeliveryLog,
    IWebhookEndpoint,
} from "@/lib/api/endpoints/webhooks.endpoint"

import type { WebhooksCollection } from "../collections/webhooks-collection"

/**
 * Начальный набор webhook endpoints для mock API.
 */
const SEED_WEBHOOKS: ReadonlyArray<IWebhookEndpoint> = [
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

/**
 * Начальные delivery logs для mock API.
 */
const SEED_DELIVERY_LOGS: ReadonlyArray<IWebhookDeliveryLog> = [
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

/**
 * Заполняет webhooks-коллекцию начальным набором данных.
 *
 * @param webhooks - Коллекция webhooks для заполнения.
 */
export function seedWebhooks(webhooks: WebhooksCollection): void {
    webhooks.seed(SEED_WEBHOOKS, SEED_DELIVERY_LOGS)
}
