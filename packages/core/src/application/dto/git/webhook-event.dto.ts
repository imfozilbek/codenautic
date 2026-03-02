/**
 * Platform-agnostic webhook payload for signature verification.
 */
export interface IWebhookEventDTO {
    readonly eventType: string
    readonly payload: unknown
    readonly signature: string
    readonly platform: string
    readonly timestamp: Date
}
