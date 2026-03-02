import console from "node:console"
import {readFile} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {gzipSync} from "node:zlib"

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE_PATH)
const UI_ROOT_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..")
const DIST_DIRECTORY = path.resolve(UI_ROOT_DIRECTORY, "dist")
const BUDGET_CONFIG_PATH = path.resolve(UI_ROOT_DIRECTORY, "perf/performance-budget.json")
const BUNDLE_ANALYSIS_REPORT_PATH = path.resolve(DIST_DIRECTORY, "bundle-analysis.json")
const VITE_MANIFEST_PATH = path.resolve(DIST_DIRECTORY, ".vite/manifest.json")

/**
 * Entry point for the performance budget checker.
 */
async function main() {
    const rawBudgetConfig = await readJsonFile(BUDGET_CONFIG_PATH)
    const budgetConfig = validateBudgetConfig(rawBudgetConfig)

    await assertFileExists(BUNDLE_ANALYSIS_REPORT_PATH, [
        "bundle analyzer report is missing.",
        "Run `bun run build:analyze` before performance checks.",
    ])

    const manifest = validateManifest(await readJsonFile(VITE_MANIFEST_PATH))
    const routeBundles = await collectRouteBundles(manifest)
    const routeViolations = collectRouteViolations(routeBundles, budgetConfig.thresholds.jsPerRouteKb)

    const webVitalsPath = resolveBudgetRelativePath(budgetConfig.webVitalsSnapshotPath)
    const webVitalsSnapshot = validateWebVitalsSnapshot(await readJsonFile(webVitalsPath))
    const webVitalsViolations = collectWebVitalsViolations(
        webVitalsSnapshot.metrics,
        budgetConfig.thresholds,
    )

    printReport(routeBundles, webVitalsSnapshot.metrics, budgetConfig.thresholds)

    const violations = [...routeViolations, ...webVitalsViolations]
    if (violations.length > 0) {
        throw new Error(formatViolations(violations))
    }
}

/**
 * Reads JSON file contents and returns parsed object.
 *
 * @param {string} filePath Absolute path to JSON file.
 * @returns {Promise<unknown>} Parsed JSON payload.
 */
async function readJsonFile(filePath) {
    const fileContent = await readFile(filePath, "utf8")
    return JSON.parse(fileContent)
}

/**
 * Ensures file exists and can be read.
 *
 * @param {string} filePath Target path.
 * @param {string[]} hintLines Helpful hints for failure message.
 */
async function assertFileExists(filePath, hintLines) {
    try {
        await readFile(filePath, "utf8")
    } catch {
        throw new Error(`Cannot read ${filePath}\n${hintLines.join("\n")}`)
    }
}

/**
 * Resolves budget-relative path from ui package root.
 *
 * @param {string} relativePath Relative file path from budget config.
 * @returns {string} Absolute path.
 */
function resolveBudgetRelativePath(relativePath) {
    return path.resolve(UI_ROOT_DIRECTORY, relativePath)
}

/**
 * Validates performance budget configuration file.
 *
 * @param {unknown} rawConfig Raw JSON payload.
 * @returns {{
 *   thresholds: {lcpMs: number, inpMs: number, cls: number, jsPerRouteKb: number},
 *   webVitalsSnapshotPath: string
 * }} Normalized budget config.
 */
function validateBudgetConfig(rawConfig) {
    if (!isRecord(rawConfig)) {
        throw new Error("performance-budget.json must contain an object")
    }

    const thresholds = rawConfig["thresholds"]
    if (!isRecord(thresholds)) {
        throw new Error("performance-budget.json.thresholds must contain an object")
    }

    const webVitalsSnapshotPath = rawConfig["webVitalsSnapshotPath"]
    if (typeof webVitalsSnapshotPath !== "string" || webVitalsSnapshotPath.trim().length === 0) {
        throw new Error("performance-budget.json.webVitalsSnapshotPath must be a non-empty string")
    }

    const lcpMs = assertPositiveNumber(thresholds["lcpMs"], "thresholds.lcpMs")
    const inpMs = assertPositiveNumber(thresholds["inpMs"], "thresholds.inpMs")
    const cls = assertPositiveNumber(thresholds["cls"], "thresholds.cls")
    const jsPerRouteKb = assertPositiveNumber(thresholds["jsPerRouteKb"], "thresholds.jsPerRouteKb")

    return {
        thresholds: {
            lcpMs,
            inpMs,
            cls,
            jsPerRouteKb,
        },
        webVitalsSnapshotPath,
    }
}

/**
 * Validates web vitals snapshot payload.
 *
 * @param {unknown} rawSnapshot Raw JSON payload.
 * @returns {{
 *   metrics: {lcpMs: number, inpMs: number, cls: number}
 * }} Normalized snapshot.
 */
function validateWebVitalsSnapshot(rawSnapshot) {
    if (!isRecord(rawSnapshot)) {
        throw new Error("web-vitals-snapshot.json must contain an object")
    }

    const metrics = rawSnapshot["metrics"]
    if (!isRecord(metrics)) {
        throw new Error("web-vitals-snapshot.json.metrics must contain an object")
    }

    return {
        metrics: {
            lcpMs: assertNonNegativeNumber(metrics["lcpMs"], "metrics.lcpMs"),
            inpMs: assertNonNegativeNumber(metrics["inpMs"], "metrics.inpMs"),
            cls: assertNonNegativeNumber(metrics["cls"], "metrics.cls"),
        },
    }
}

/**
 * Validates Vite manifest payload.
 *
 * @param {unknown} rawManifest Raw JSON payload.
 * @returns {Record<string, {file: string, src?: string, isEntry?: boolean, isDynamicEntry?: boolean, imports?: string[], dynamicImports?: string[]}>}
 * Parsed and validated manifest.
 */
function validateManifest(rawManifest) {
    if (!isRecord(rawManifest)) {
        throw new Error("Vite manifest must contain an object")
    }

    const normalizedManifest = {}
    for (const [chunkKey, value] of Object.entries(rawManifest)) {
        if (!isRecord(value)) {
            throw new Error(`Manifest entry ${chunkKey} must contain an object`)
        }

        const file = value["file"]
        if (typeof file !== "string" || file.length === 0) {
            throw new Error(`Manifest entry ${chunkKey} must contain non-empty "file"`)
        }

        const src = value["src"]
        const isEntry = value["isEntry"]
        const isDynamicEntry = value["isDynamicEntry"]
        const imports = value["imports"]
        const dynamicImports = value["dynamicImports"]

        normalizedManifest[chunkKey] = {
            file,
            src: typeof src === "string" ? src : undefined,
            isEntry: isEntry === true,
            isDynamicEntry: isDynamicEntry === true,
            imports: asStringArray(imports),
            dynamicImports: asStringArray(dynamicImports),
        }
    }

    return normalizedManifest
}

/**
 * Collects total gzipped JS size per route entry from Vite manifest.
 *
 * @param {Record<string, {file: string, src?: string, isEntry?: boolean, isDynamicEntry?: boolean, imports?: string[], dynamicImports?: string[]}>} manifest
 * Vite manifest.
 * @returns {Promise<Array<{routeId: string, gzipKb: number, jsFiles: string[]}>>}
 * Route bundle usage list.
 */
async function collectRouteBundles(manifest) {
    const entryKeys = Object.entries(manifest)
        .filter(([, entry]) => entry.isEntry === true || entry.isDynamicEntry === true)
        .map(([chunkKey]) => chunkKey)

    if (entryKeys.length === 0) {
        throw new Error("No entry chunks found in Vite manifest")
    }

    const routeBundles = []
    for (const entryKey of entryKeys) {
        const entryChunk = manifest[entryKey]
        if (entryChunk === undefined) {
            throw new Error(`Entry chunk ${entryKey} is missing in manifest`)
        }

        const collectedFiles = new Set()
        collectChunkFiles(manifest, entryKey, collectedFiles, new Set())

        const jsFiles = Array.from(collectedFiles).filter((fileName) => fileName.endsWith(".js"))
        let totalGzipBytes = 0
        for (const fileName of jsFiles) {
            const assetPath = path.resolve(DIST_DIRECTORY, fileName)
            const assetContent = await readFile(assetPath)
            totalGzipBytes += gzipSync(assetContent).length
        }

        routeBundles.push({
            routeId: entryChunk.src ?? entryKey,
            gzipKb: Number((totalGzipBytes / 1024).toFixed(2)),
            jsFiles: jsFiles.sort(),
        })
    }

    return routeBundles.sort((left, right) => left.routeId.localeCompare(right.routeId))
}

/**
 * Recursively collects all imported files for a chunk entry.
 *
 * @param {Record<string, {file: string, imports?: string[], dynamicImports?: string[]}>} manifest Vite manifest.
 * @param {string} chunkKey Current chunk key.
 * @param {Set<string>} collectedFiles Resulting file set.
 * @param {Set<string>} visitedChunks Visited chunks to prevent cycles.
 */
function collectChunkFiles(manifest, chunkKey, collectedFiles, visitedChunks) {
    if (visitedChunks.has(chunkKey)) {
        return
    }

    visitedChunks.add(chunkKey)
    const chunk = manifest[chunkKey]
    if (chunk === undefined) {
        throw new Error(`Chunk ${chunkKey} referenced in manifest but not found`)
    }

    collectedFiles.add(chunk.file)

    for (const importedChunk of chunk.imports ?? []) {
        collectChunkFiles(manifest, importedChunk, collectedFiles, visitedChunks)
    }
    for (const importedChunk of chunk.dynamicImports ?? []) {
        collectChunkFiles(manifest, importedChunk, collectedFiles, visitedChunks)
    }
}

/**
 * Compares route sizes with configured JS budget.
 *
 * @param {Array<{routeId: string, gzipKb: number}>} routeBundles Route bundle data.
 * @param {number} jsPerRouteKb JS budget in kilobytes.
 * @returns {string[]} List of violations.
 */
function collectRouteViolations(routeBundles, jsPerRouteKb) {
    return routeBundles
        .filter((bundle) => bundle.gzipKb > jsPerRouteKb)
        .map((bundle) => {
            return `JS budget exceeded for "${bundle.routeId}": ${bundle.gzipKb}KB > ${jsPerRouteKb}KB`
        })
}

/**
 * Compares web vitals metrics with configured thresholds.
 *
 * @param {{lcpMs: number, inpMs: number, cls: number}} metrics Captured web vitals.
 * @param {{lcpMs: number, inpMs: number, cls: number}} thresholds Budget thresholds.
 * @returns {string[]} List of violations.
 */
function collectWebVitalsViolations(metrics, thresholds) {
    const violations = []
    if (metrics.lcpMs > thresholds.lcpMs) {
        violations.push(`LCP budget exceeded: ${metrics.lcpMs}ms > ${thresholds.lcpMs}ms`)
    }
    if (metrics.inpMs > thresholds.inpMs) {
        violations.push(`INP budget exceeded: ${metrics.inpMs}ms > ${thresholds.inpMs}ms`)
    }
    if (metrics.cls > thresholds.cls) {
        violations.push(`CLS budget exceeded: ${metrics.cls} > ${thresholds.cls}`)
    }
    return violations
}

/**
 * Prints concise report with route bundles and vitals metrics.
 *
 * @param {Array<{routeId: string, gzipKb: number, jsFiles: string[]}>} routeBundles Route bundle data.
 * @param {{lcpMs: number, inpMs: number, cls: number}} metrics Captured web vitals.
 * @param {{lcpMs: number, inpMs: number, cls: number, jsPerRouteKb: number}} thresholds Budget thresholds.
 */
function printReport(routeBundles, metrics, thresholds) {
    console.log("Performance budget report")
    console.log(`JS per route budget: ${thresholds.jsPerRouteKb}KB (gzip)`)
    for (const routeBundle of routeBundles) {
        console.log(` - ${routeBundle.routeId}: ${routeBundle.gzipKb}KB`)
    }

    console.log("Web Vitals budget")
    console.log(` - LCP: ${metrics.lcpMs}ms (budget ${thresholds.lcpMs}ms)`)
    console.log(` - INP: ${metrics.inpMs}ms (budget ${thresholds.inpMs}ms)`)
    console.log(` - CLS: ${metrics.cls} (budget ${thresholds.cls})`)
}

/**
 * Formats violations into a single failure message.
 *
 * @param {string[]} violations Violation list.
 * @returns {string} Formatted failure message.
 */
function formatViolations(violations) {
    return ["Performance budget check failed:", ...violations.map((item) => ` - ${item}`)].join("\n")
}

/**
 * Asserts value is a positive finite number.
 *
 * @param {unknown} value Raw value.
 * @param {string} name Field name.
 * @returns {number} Validated number.
 */
function assertPositiveNumber(value, name) {
    if (typeof value !== "number" || Number.isFinite(value) !== true || value <= 0) {
        throw new Error(`${name} must be a positive finite number`)
    }
    return value
}

/**
 * Asserts value is a non-negative finite number.
 *
 * @param {unknown} value Raw value.
 * @param {string} name Field name.
 * @returns {number} Validated number.
 */
function assertNonNegativeNumber(value, name) {
    if (typeof value !== "number" || Number.isFinite(value) !== true || value < 0) {
        throw new Error(`${name} must be a non-negative finite number`)
    }
    return value
}

/**
 * Checks whether unknown value is a plain record.
 *
 * @param {unknown} value Raw value.
 * @returns {value is Record<string, unknown>} Type guard result.
 */
function isRecord(value) {
    return typeof value === "object" && value !== null
}

/**
 * Converts unknown value to string array.
 *
 * @param {unknown} value Raw value.
 * @returns {string[] | undefined} String array or undefined.
 */
function asStringArray(value) {
    if (Array.isArray(value) !== true) {
        return undefined
    }

    const normalizedArray = []
    for (const item of value) {
        if (typeof item !== "string") {
            throw new Error("Manifest import arrays must contain only strings")
        }
        normalizedArray.push(item)
    }
    return normalizedArray
}

await main()
