/**
 * Barrel exports for monitoring utilities.
 */
export {
    type ISentryBrowserEnv,
    type ISentryBrowserConfig,
    type ISentryBrowserDependencies,
    initializeSentryBrowser,
    createSentryBrowserConfig,
    resolveSentryEnvironment,
    resolveSentrySampleRate,
    sanitizeRequestUrl,
    sanitizeHeaders,
    sanitizeSentryPayload,
} from "./sentry"
export {
    type TCoreWebVitalName,
    type IWebVitalsMonitoringDependencies,
    type IWebVitalsMonitoringOptions,
    type IRegisterWebVitalListener,
    type IReadonlyWebVitalListenerOptions,
    type IWebVitalReporterDependencies,
    initializeWebVitalsMonitoring,
    createWebVitalReporter,
    createWebVitalTransactionEvent,
    resetWebVitalsMonitoringStateForTests,
} from "./web-vitals"
