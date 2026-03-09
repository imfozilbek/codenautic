/**
 * Provider degradation mode: event types, guards, and constants
 * for graceful UI fallback when external providers are unavailable.
 */
export {
    PROVIDER_DEGRADATION_EVENT,
    type TDegradedProvider,
    type TDegradationLevel,
    type IProviderDegradationEventDetail,
    isProviderDegradationDetail,
} from "./degradation-mode"
