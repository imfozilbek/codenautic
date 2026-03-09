import fs from "node:fs"
import path from "node:path"

/**
 * Vitest global setup — ensures the v8 coverage temp directory exists
 * before test workers start writing coverage data.
 *
 * Mitigates ENOENT race condition: coverage/.tmp/coverage-N.json.
 */
export function setup(): void {
    const coverageTmpDir = path.resolve(__dirname, "..", "coverage", ".tmp")
    fs.mkdirSync(coverageTmpDir, { recursive: true })
}
