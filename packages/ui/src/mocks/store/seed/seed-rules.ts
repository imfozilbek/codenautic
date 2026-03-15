import type { ICustomRule } from "@/lib/api/endpoints/custom-rules.endpoint"

import type { RulesCollection } from "../collections/rules-collection"

/**
 * Начальный набор custom-правил для mock API.
 *
 * Включает три правила разных типов, scope и severity
 * для демонстрации полного спектра возможностей.
 */
const SEED_RULES: ReadonlyArray<ICustomRule> = [
    {
        id: "rule-001",
        title: "No console.log in production",
        rule: "console\\.log\\(",
        type: "REGEX",
        scope: "FILE",
        severity: "MEDIUM",
        status: "ACTIVE",
        examples: [
            {
                snippet: "console.log('debug info')",
                isCorrect: true,
            },
            {
                snippet: "logger.info('debug info')",
                isCorrect: false,
            },
        ],
    },
    {
        id: "rule-002",
        title: "Explain complex business logic",
        rule: "Ensure all business logic blocks have JSDoc comments explaining the why, not just the what.",
        type: "PROMPT",
        scope: "CCR",
        severity: "LOW",
        status: "ACTIVE",
        examples: [
            {
                snippet: "/** Calculates risk score based on... */\nfunction calculateRisk() {}",
                isCorrect: false,
            },
            {
                snippet: "function calculateRisk() { /* no docs */ }",
                isCorrect: true,
            },
        ],
    },
    {
        id: "rule-003",
        title: "No circular dependencies",
        rule: "detect_circular_imports",
        type: "AST",
        scope: "FILE",
        severity: "HIGH",
        status: "PENDING",
        examples: [
            {
                snippet: "import { A } from './a' // where a imports from this file",
                isCorrect: true,
            },
        ],
    },
]

/**
 * Заполняет rules-коллекцию начальным набором правил.
 *
 * @param rules - Коллекция правил для заполнения.
 */
export function seedRules(rules: RulesCollection): void {
    rules.seed(SEED_RULES)
}
