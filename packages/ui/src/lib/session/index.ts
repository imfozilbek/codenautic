/**
 * Session recovery utilities: pending intent persistence, draft autosave,
 * and session expiration event types.
 */
export {
    type ISessionExpiredEventDetail,
    type ISessionDraftSnapshot,
    buildDraftFieldKey,
    writeSessionPendingIntent,
    readSessionPendingIntent,
    clearSessionPendingIntent,
    writeSessionDraftSnapshot,
    readSessionDraftSnapshot,
} from "./session-recovery"
