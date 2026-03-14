/**
 * Constants for the EnterpriseDataTable component.
 */

/**
 * Prefix for localStorage keys used to persist table view state.
 */
export const STORAGE_KEY_PREFIX = "ui.enterprise-table."

/**
 * Default density mode applied when no saved preference exists.
 */
export const DEFAULT_DENSITY = "comfortable" as const

/**
 * Default column width in pixels when no explicit size is provided.
 */
export const DEFAULT_COLUMN_SIZE = 180

/**
 * Minimum rendered column width in pixels.
 * Columns are never rendered narrower than this value.
 */
export const MIN_COLUMN_SIZE = 120

/**
 * Width in pixels allocated for the row-selection checkbox column.
 */
export const CHECKBOX_COLUMN_WIDTH = 48

/**
 * Default row height in comfortable density mode (pixels).
 */
export const DEFAULT_COMFORTABLE_ROW_HEIGHT = 56

/**
 * Default row height in compact density mode (pixels).
 */
export const DEFAULT_COMPACT_ROW_HEIGHT = 42

/**
 * Default maximum height of the scrollable body area (pixels).
 */
export const DEFAULT_MAX_BODY_HEIGHT = 520

/**
 * Default virtualizer overscan — number of extra rows rendered
 * above and below the visible viewport.
 */
export const DEFAULT_OVERSCAN = 8

/**
 * Minimum acceptable row height returned by a custom row height estimator.
 * Values below this threshold fall back to the default row height.
 */
export const MIN_ROW_HEIGHT = 28
