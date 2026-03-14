/**
 * Константы для package dependency graph.
 */

/**
 * Максимальная длина label узла до усечения.
 */
export const MAX_LABEL_LENGTH = 40

/**
 * Ключ localStorage для сохранения layout snapshot.
 */
export const LAYOUT_STATE_STORAGE_KEY = "ui.package-graph.layout.v1"

/**
 * Префикс ID для cluster-узлов по слою.
 */
export const CLUSTER_NODE_PREFIX = "cluster:layer:"

/**
 * Задержка (мс) перед загрузкой деталей кластера.
 */
export const CLUSTER_DETAILS_DELAY_MS = 160

/**
 * Порог количества узлов для huge graph fallback.
 */
export const HUGE_GRAPH_NODE_THRESHOLD = 260

/**
 * Порог количества рёбер для huge graph fallback.
 */
export const HUGE_GRAPH_EDGE_THRESHOLD = 640

/**
 * Максимум строк path в fallback-таблице для huge graph.
 */
export const MAX_FALLBACK_PATH_ROWS = 24

/**
 * Максимум top-hub узлов в fallback-таблице для huge graph.
 */
export const MAX_FALLBACK_HUBS = 10
