import {readFileSync} from "node:fs"
import {resolve} from "node:path"

interface IHeuristicVerificationRule {
    name: string
    description: string
    testCommand: string
}

interface IHeuristicRegistryEntry {
    id: string
    source_file: string
    source_line: number
    heuristic_type: string
    current_expression: string
    risk_level: string
    resolution_mode: string
    target_change: string
    tests_required: string[]
    owner_package: string
    status: string
    rule_uuid?: string
    severity?: string
    buckets?: string[]
    false_positive_risk?: string
    evidence_level?: string
    verification_rule?: IHeuristicVerificationRule
}

interface IRegistryDocument {
    heuristicsSchemaVersion: number
    generatedAt: string
    entries: IHeuristicRegistryEntry[]
}

const EXPECTED_SCHEMA_VERSION = 1
const REGISTRY_JSON_PATH = "docs/heuristics/heuristics-registry.json"
const REGISTRY_CSV_PATH = "docs/heuristics/heuristics-registry.csv"
const RULES_REGISTRY_CSV_PATH = "docs/heuristics/rules-794-registry.csv"
const RULES_FILE_PATH = "packages/runtime/src/config/defaults/rules.json"

const args = Bun.argv.slice(2)
const isRulesOnly = args.includes("--rules-only")
const specificRuleUuid = readArgValue("--rule-uuid")

function main(): void {
    const registry = loadRegistry()

    if (!isRulesOnly) {
        validateRegistryDocument(registry)
        validateHeuristicsCsv(registry.entries.length)
    }

    validateRulesRegistry(specificRuleUuid)

    process.stdout.write("Heuristics registry validation passed\n")
}

function loadRegistry(): IRegistryDocument {
    const rawContent = readFileSync(resolve(process.cwd(), REGISTRY_JSON_PATH), "utf8")
    const parsed = JSON.parse(rawContent) as Partial<IRegistryDocument>

    if (parsed.heuristicsSchemaVersion !== EXPECTED_SCHEMA_VERSION) {
        throw new Error(
            `Unsupported heuristics schema version: ${parsed.heuristicsSchemaVersion}. Expected ${EXPECTED_SCHEMA_VERSION}`,
        )
    }

    if (!Array.isArray(parsed.entries)) {
        throw new Error("heuristics-registry.json must contain entries array")
    }

    return parsed as IRegistryDocument
}

function validateRegistryDocument(entriesDocument: IRegistryDocument): void {
    if (entriesDocument.entries.length === 0) {
        throw new Error("heuristics-registry.json must not be empty")
    }

    const ids = new Set<string>()

    for (const entry of entriesDocument.entries) {
        validateRequiredFields(entry)

        if (ids.has(entry.id)) {
            throw new Error(`Duplicate heuristic id detected: ${entry.id}`)
        }
        ids.add(entry.id)

        if (entry.status === "UNTRIAGED") {
            throw new Error(`UNTRIAGED entry is not allowed: ${entry.id}`)
        }
    }
}

function validateRequiredFields(entry: IHeuristicRegistryEntry): void {
    const requiredStrings: Array<[string, string]> = [
        ["id", entry.id],
        ["source_file", entry.source_file],
        ["heuristic_type", entry.heuristic_type],
        ["current_expression", entry.current_expression],
        ["risk_level", entry.risk_level],
        ["resolution_mode", entry.resolution_mode],
        ["target_change", entry.target_change],
        ["owner_package", entry.owner_package],
        ["status", entry.status],
    ]

    for (const [key, value] of requiredStrings) {
        if (typeof value !== "string" || value.trim().length === 0) {
            throw new Error(`Missing required field '${key}' for entry '${entry.id}'`)
        }
    }

    if (!Number.isFinite(entry.source_line) || entry.source_line < 1) {
        throw new Error(`Invalid source_line for entry '${entry.id}'`)
    }

    if (!Array.isArray(entry.tests_required) || entry.tests_required.length === 0) {
        throw new Error(`tests_required must contain at least one item for entry '${entry.id}'`)
    }
}

function validateHeuristicsCsv(expectedEntriesCount: number): void {
    const rows = readCsvRows(REGISTRY_CSV_PATH)
    if (rows.length === 0) {
        throw new Error("heuristics-registry.csv must not be empty")
    }

    const dataRows = rows.slice(1)
    if (dataRows.length !== expectedEntriesCount) {
        throw new Error(
            `heuristics-registry.csv rows mismatch. Expected ${expectedEntriesCount}, got ${dataRows.length}`,
        )
    }
}

function validateRulesRegistry(ruleUuid: string | null): void {
    const rulesCsvRows = readCsvRows(RULES_REGISTRY_CSV_PATH)
    if (rulesCsvRows.length === 0) {
        throw new Error("rules-794-registry.csv must not be empty")
    }

    const header = rulesCsvRows[0] ?? []
    const rowMaps = rowsToMaps(header, rulesCsvRows.slice(1))

    const expectedRuleCount = readExpectedRuleCount()
    if (rowMaps.length !== expectedRuleCount) {
        throw new Error(
            `rules-794-registry.csv rows mismatch. Expected ${expectedRuleCount}, got ${rowMaps.length}`,
        )
    }

    const uuids = new Set<string>()

    for (const row of rowMaps) {
        const id = requireColumn(row, "id")
        const status = requireColumn(row, "status")
        const uuid = requireColumn(row, "rule_uuid")
        const verificationRule = requireColumn(row, "verification_rule")

        if (!id.startsWith("H-RULE-")) {
            throw new Error(`Rule entry id must start with H-RULE-: ${id}`)
        }

        if (status === "UNTRIAGED") {
            throw new Error(`UNTRIAGED rule entry is not allowed: ${id}`)
        }

        if (verificationRule.trim().length === 0) {
            throw new Error(`verification_rule must not be empty for ${id}`)
        }

        if (uuids.has(uuid)) {
            throw new Error(`Duplicate rule_uuid detected: ${uuid}`)
        }
        uuids.add(uuid)
    }

    if (ruleUuid !== null && !uuids.has(ruleUuid)) {
        throw new Error(`Rule UUID '${ruleUuid}' was not found in rules-794-registry.csv`)
    }
}

function readExpectedRuleCount(): number {
    const rawRulesJson = readFileSync(resolve(process.cwd(), RULES_FILE_PATH), "utf8")
    const parsed = JSON.parse(rawRulesJson) as {items?: unknown}
    if (!Array.isArray(parsed.items)) {
        throw new Error("rules.json must contain items array")
    }
    return parsed.items.length
}

function readCsvRows(path: string): string[][] {
    const absolutePath = resolve(process.cwd(), path)
    const content = readFileSync(absolutePath, "utf8")
    const lines = content.split(/\r?\n/).filter((line) => line.length > 0)
    return lines.map((line) => parseCsvLine(line))
}

function parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ""
    let insideQuotes = false

    for (let index = 0; index < line.length; index++) {
        const char = line[index]

        if (char === '"') {
            const nextChar = line[index + 1]
            if (insideQuotes && nextChar === '"') {
                current += '"'
                index += 1
                continue
            }
            insideQuotes = !insideQuotes
            continue
        }

        if (char === "," && !insideQuotes) {
            values.push(current)
            current = ""
            continue
        }

        current += char
    }

    values.push(current)
    return values
}

function rowsToMaps(header: string[], rows: string[][]): Array<Record<string, string>> {
    return rows.map((row) => {
        const map: Record<string, string> = {}

        header.forEach((columnName, index) => {
            map[columnName] = row[index] ?? ""
        })

        return map
    })
}

function requireColumn(row: Record<string, string>, columnName: string): string {
    const value = row[columnName]
    if (value === undefined || value.trim().length === 0) {
        throw new Error(`Missing required column '${columnName}' in rules CSV row`)
    }
    return value
}

function readArgValue(flag: string): string | null {
    const index = args.indexOf(flag)
    if (index === -1) {
        return null
    }

    const value = args[index + 1]
    if (value === undefined || value.startsWith("--")) {
        throw new Error(`Flag '${flag}' requires value`)
    }

    return value
}

main()
