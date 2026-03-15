import { setupWorker } from "msw/browser"

import { handlers } from "./handlers/index"

/**
 * MSW browser worker для dev-режима.
 * Перехватывает HTTP-запросы к API и возвращает stateful mock-ответы
 * через in-memory store.
 */
export const worker = setupWorker(...handlers)
