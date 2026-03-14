/**
 * Shared utility functions for safe JSON parsing, browser storage,
 * and other cross-cutting concerns.
 */
export { safeParseJson, safeParseJsonUnknown } from "./safe-json"
export {
    safeStorageGet,
    safeStorageSet,
    safeStorageRemove,
    safeStorageGetJson,
    safeStorageSetJson,
    getWindowLocalStorage,
    getWindowSessionStorage,
} from "./safe-storage"
