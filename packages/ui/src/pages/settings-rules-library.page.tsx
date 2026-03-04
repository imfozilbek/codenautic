import { type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader, Chip, Input } from "@/components/ui"
import { showToastError, showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

type TRuleCategory = "architecture" | "performance" | "security" | "style"
type TRuleSource = "custom" | "prebuilt"

interface IRuleTemplate {
    /** Уникальный id правила. */
    readonly id: string
    /** Название правила. */
    readonly name: string
    /** Краткое описание поведения. */
    readonly description: string
    /** Категория правила. */
    readonly category: TRuleCategory
    /** Источник правила: prebuilt/custom. */
    readonly source: TRuleSource
    /** DSL-выражение для policy engine. */
    readonly expression: string
    /** Проверочный паттерн для тестового прогона в UI. */
    readonly testPattern: string
}

interface IRuleTestResult {
    /** Итог тестового прогона. */
    readonly status: "failed" | "passed"
    /** Текст результата. */
    readonly message: string
}

const PREBUILT_RULES: ReadonlyArray<IRuleTemplate> = [
    {
        category: "security",
        description: "Блокирует потенциально опасные динамические вызовы.",
        expression: "deny(eval|new Function)",
        id: "rule-prebuilt-unsafe-eval",
        name: "Unsafe eval guard",
        source: "prebuilt",
        testPattern: "eval(",
    },
    {
        category: "architecture",
        description: "Не допускает импорт infrastructure в domain слой.",
        expression: "forbid(import '../infrastructure' in domain/**)",
        id: "rule-prebuilt-layer-boundary",
        name: "Layer boundary integrity",
        source: "prebuilt",
        testPattern: "../infrastructure",
    },
    {
        category: "performance",
        description: "Подсвечивает слишком крупные CCR с высоким blast radius.",
        expression: "warn(files_changed > 30)",
        id: "rule-prebuilt-large-ccr",
        name: "Large CCR warning",
        source: "prebuilt",
        testPattern: "filesChanged > 30",
    },
    {
        category: "style",
        description: "Останавливает merge при оставленных TODO в критичных модулях.",
        expression: "deny(todo in src/core/**)",
        id: "rule-prebuilt-todo-critical",
        name: "Critical TODO blocker",
        source: "prebuilt",
        testPattern: "TODO:",
    },
]

const CATEGORY_OPTIONS: ReadonlyArray<"all" | TRuleCategory> = [
    "all",
    "security",
    "architecture",
    "performance",
    "style",
]

function mapCategoryChipColor(
    category: TRuleCategory,
): "default" | "primary" | "success" | "warning" {
    if (category === "security") {
        return "primary"
    }
    if (category === "architecture") {
        return "success"
    }
    if (category === "performance") {
        return "warning"
    }
    return "default"
}

function formatCategoryLabel(category: TRuleCategory): string {
    if (category === "security") {
        return "Security"
    }
    if (category === "architecture") {
        return "Architecture"
    }
    if (category === "performance") {
        return "Performance"
    }
    return "Style"
}

/**
 * Страница библиотеки правил.
 *
 * @returns UI для browse/import/custom/test сценариев правил.
 */
export function SettingsRulesLibraryPage(): ReactElement {
    const [rules, setRules] = useState<ReadonlyArray<IRuleTemplate>>(PREBUILT_RULES)
    const [importedRuleIds, setImportedRuleIds] = useState<ReadonlyArray<string>>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<"all" | TRuleCategory>("all")
    const [customName, setCustomName] = useState("")
    const [customDescription, setCustomDescription] = useState("")
    const [customCategory, setCustomCategory] = useState<TRuleCategory>("architecture")
    const [customExpression, setCustomExpression] = useState("")
    const [testRuleId, setTestRuleId] = useState(PREBUILT_RULES[0]?.id ?? "")
    const [testInput, setTestInput] = useState("")
    const [testResult, setTestResult] = useState<IRuleTestResult | undefined>(undefined)

    const filteredRules = useMemo((): ReadonlyArray<IRuleTemplate> => {
        const normalizedQuery = searchQuery.trim().toLowerCase()

        return rules.filter((rule): boolean => {
            const matchesCategory =
                selectedCategory === "all" || rule.category === selectedCategory
            if (matchesCategory !== true) {
                return false
            }

            if (normalizedQuery.length === 0) {
                return true
            }

            const inName = rule.name.toLowerCase().includes(normalizedQuery)
            const inDescription = rule.description.toLowerCase().includes(normalizedQuery)
            const inExpression = rule.expression.toLowerCase().includes(normalizedQuery)

            return inName || inDescription || inExpression
        })
    }, [rules, searchQuery, selectedCategory])

    const importedCount = useMemo((): number => importedRuleIds.length, [importedRuleIds])

    const handleImportRule = (ruleId: string): void => {
        const isAlreadyImported = importedRuleIds.includes(ruleId)
        if (isAlreadyImported === true) {
            showToastInfo("Rule already imported to the active profile.")
            return
        }

        setImportedRuleIds((previous): ReadonlyArray<string> => [...previous, ruleId])
        showToastSuccess("Rule imported into active library.")
    }

    const handleCreateCustomRule = (): void => {
        const normalizedName = customName.trim()
        const normalizedExpression = customExpression.trim()
        if (normalizedName.length < 3) {
            showToastError("Custom rule name should be at least 3 characters.")
            return
        }
        if (normalizedExpression.length < 3) {
            showToastError("Custom rule expression should be at least 3 characters.")
            return
        }

        const nextRule: IRuleTemplate = {
            category: customCategory,
            description:
                customDescription.trim().length > 0
                    ? customDescription.trim()
                    : "Custom policy rule created by team.",
            expression: normalizedExpression,
            id: `rule-custom-${Date.now().toString(36)}`,
            name: normalizedName,
            source: "custom",
            testPattern: normalizedExpression,
        }

        setRules((previous): ReadonlyArray<IRuleTemplate> => [nextRule, ...previous])
        setImportedRuleIds((previous): ReadonlyArray<string> => [nextRule.id, ...previous])
        setTestRuleId(nextRule.id)
        setCustomName("")
        setCustomDescription("")
        setCustomExpression("")
        showToastSuccess(`Custom rule "${nextRule.name}" created.`)
    }

    const handleTestRule = (): void => {
        const selectedRule = rules.find((rule): boolean => rule.id === testRuleId)
        if (selectedRule === undefined) {
            showToastError("Select a rule before running test.")
            return
        }

        const normalizedInput = testInput.trim()
        if (normalizedInput.length === 0) {
            showToastError("Provide a sample snippet for rule test.")
            return
        }

        const isMatched = normalizedInput.includes(selectedRule.testPattern)
        setTestResult({
            message: isMatched
                ? `Pattern "${selectedRule.testPattern}" was detected in sample input.`
                : `Pattern "${selectedRule.testPattern}" was not detected in sample input.`,
            status: isMatched ? "passed" : "failed",
        })
        showToastInfo("Rule test finished.")
    }

    return (
        <section className="space-y-4">
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Rules library</h1>
            <p className="text-sm text-[var(--foreground)]/70">
                Browse pre-built rules, import to your workspace, create custom policies and test
                them on sample snippets.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Catalog</p>
                    </CardHeader>
                    <CardBody>
                        <p className="text-2xl font-semibold text-[var(--foreground)]">
                            {rules.length}
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">Total rules</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Imported</p>
                    </CardHeader>
                    <CardBody>
                        <p className="text-2xl font-semibold text-[var(--foreground)]">
                            {importedCount}
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">
                            Rules in active profile
                        </p>
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Custom</p>
                    </CardHeader>
                    <CardBody>
                        <p className="text-2xl font-semibold text-[var(--foreground)]">
                            {rules.filter((rule): boolean => rule.source === "custom").length}
                        </p>
                        <p className="text-xs text-[var(--foreground)]/70">
                            Team-defined policy rules
                        </p>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                        Browse pre-built rules
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <Input
                            label="Search rules"
                            placeholder="Search by name, description or expression"
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-[var(--foreground)]/80"
                                htmlFor="rules-category-filter"
                            >
                                Category
                            </label>
                            <select
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="rules-category-filter"
                                value={selectedCategory}
                                onChange={(event): void => {
                                    const value = event.currentTarget.value
                                    if (
                                        value === "all"
                                        || value === "security"
                                        || value === "architecture"
                                        || value === "performance"
                                        || value === "style"
                                    ) {
                                        setSelectedCategory(value)
                                    }
                                }}
                            >
                                {CATEGORY_OPTIONS.map((option): ReactElement => (
                                    <option key={option} value={option}>
                                        {option === "all" ? "All categories" : formatCategoryLabel(option)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <ul aria-label="Rules catalog" className="space-y-2">
                        {filteredRules.map((rule): ReactElement => {
                            const isImported = importedRuleIds.includes(rule.id)
                            return (
                                <li
                                    key={rule.id}
                                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                                >
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                                {rule.name}
                                            </p>
                                            <p className="text-xs text-[var(--foreground)]/70">
                                                {rule.description}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Chip
                                                    color={mapCategoryChipColor(rule.category)}
                                                    size="sm"
                                                    variant="flat"
                                                >
                                                    {formatCategoryLabel(rule.category)}
                                                </Chip>
                                                <Chip size="sm" variant="bordered">
                                                    {rule.source}
                                                </Chip>
                                            </div>
                                            <p className="font-mono text-xs text-[var(--foreground)]/70">
                                                {rule.expression}
                                            </p>
                                        </div>
                                        <Button
                                            isDisabled={isImported}
                                            size="sm"
                                            variant={isImported ? "flat" : "solid"}
                                            onPress={(): void => {
                                                handleImportRule(rule.id)
                                            }}
                                        >
                                            {isImported ? "Imported" : "Import"}
                                        </Button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                            Create custom rule
                        </p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <Input
                            label="Rule name"
                            placeholder="Block direct production writes"
                            value={customName}
                            onValueChange={setCustomName}
                        />
                        <Input
                            label="Description"
                            placeholder="Short explanation for reviewers"
                            value={customDescription}
                            onValueChange={setCustomDescription}
                        />
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-[var(--foreground)]/80" htmlFor="custom-rule-category">
                                Category
                            </label>
                            <select
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="custom-rule-category"
                                value={customCategory}
                                onChange={(event): void => {
                                    const nextCategory = event.currentTarget.value
                                    if (
                                        nextCategory === "security"
                                        || nextCategory === "architecture"
                                        || nextCategory === "performance"
                                        || nextCategory === "style"
                                    ) {
                                        setCustomCategory(nextCategory)
                                    }
                                }}
                            >
                                <option value="security">Security</option>
                                <option value="architecture">Architecture</option>
                                <option value="performance">Performance</option>
                                <option value="style">Style</option>
                            </select>
                        </div>
                        <Input
                            label="Rule expression"
                            placeholder="deny(secret in diff)"
                            value={customExpression}
                            onValueChange={setCustomExpression}
                        />
                        <div className="flex justify-end">
                            <Button onPress={handleCreateCustomRule}>Create custom rule</Button>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <p className="text-base font-semibold text-[var(--foreground)]">Test rules</p>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-[var(--foreground)]/80" htmlFor="rule-test-target">
                                Rule to test
                            </label>
                            <select
                                aria-label="Rule to test"
                                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                id="rule-test-target"
                                value={testRuleId}
                                onChange={(event): void => {
                                    setTestRuleId(event.currentTarget.value)
                                }}
                            >
                                {rules.map((rule): ReactElement => (
                                    <option key={rule.id} value={rule.id}>
                                        {rule.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label
                                className="text-sm text-[var(--foreground)]/80"
                                htmlFor="rule-test-sample-input"
                            >
                                Sample input
                            </label>
                            <textarea
                                aria-label="Sample input"
                                className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                                id="rule-test-sample-input"
                                value={testInput}
                                onChange={(event): void => {
                                    setTestInput(event.currentTarget.value)
                                }}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button variant="flat" onPress={handleTestRule}>
                                Test selected rule
                            </Button>
                        </div>
                        {testResult === undefined ? null : (
                            <Alert
                                color={testResult.status === "passed" ? "success" : "warning"}
                                title={testResult.status === "passed" ? "Rule matched" : "Rule not matched"}
                                variant="flat"
                            >
                                {testResult.message}
                            </Alert>
                        )}
                    </CardBody>
                </Card>
            </div>
        </section>
    )
}
