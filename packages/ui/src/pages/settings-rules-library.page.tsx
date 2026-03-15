import { type ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, Button, Card, CardContent, CardHeader, Chip, Input } from "@heroui/react"
import { NATIVE_FORM } from "@/lib/constants/spacing"
import { TYPOGRAPHY } from "@/lib/constants/typography"
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
): "default" | "accent" | "success" | "warning" {
    if (category === "security") {
        return "accent"
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
    const { t } = useTranslation(["settings"])
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
            const matchesCategory = selectedCategory === "all" || rule.category === selectedCategory
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
            showToastInfo(t("settings:rulesLibrary.toast.ruleAlreadyImported"))
            return
        }

        setImportedRuleIds((previous): ReadonlyArray<string> => [...previous, ruleId])
        showToastSuccess(t("settings:rulesLibrary.toast.ruleImported"))
    }

    const handleCreateCustomRule = (): void => {
        const normalizedName = customName.trim()
        const normalizedExpression = customExpression.trim()
        if (normalizedName.length < 3) {
            showToastError(t("settings:rulesLibrary.toast.customRuleNameTooShort"))
            return
        }
        if (normalizedExpression.length < 3) {
            showToastError(t("settings:rulesLibrary.toast.customRuleExpressionTooShort"))
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
        showToastSuccess(
            t("settings:rulesLibrary.toast.customRuleCreated", { name: nextRule.name }),
        )
    }

    const handleTestRule = (): void => {
        const selectedRule = rules.find((rule): boolean => rule.id === testRuleId)
        if (selectedRule === undefined) {
            showToastError(t("settings:rulesLibrary.toast.selectRuleBeforeTest"))
            return
        }

        const normalizedInput = testInput.trim()
        if (normalizedInput.length === 0) {
            showToastError(t("settings:rulesLibrary.toast.provideSampleSnippet"))
            return
        }

        const isMatched = normalizedInput.includes(selectedRule.testPattern)
        setTestResult({
            message: isMatched
                ? t("settings:rulesLibrary.patternDetected", { pattern: selectedRule.testPattern })
                : t("settings:rulesLibrary.patternNotDetected", {
                      pattern: selectedRule.testPattern,
                  }),
            status: isMatched ? "passed" : "failed",
        })
        showToastInfo(t("settings:rulesLibrary.toast.ruleTestFinished"))
    }

    return (
        <div className="space-y-6 mx-auto max-w-[1400px]"><div className="space-y-1.5"><h1 className={TYPOGRAPHY.pageTitle}>{t("settings:rulesLibrary.pageTitle")}</h1><p className={TYPOGRAPHY.bodyMuted}>{t("settings:rulesLibrary.pageSubtitle")}</p></div><div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:rulesLibrary.catalog")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">{rules.length}</p>
                        <p className="text-xs text-muted">
                            {t("settings:rulesLibrary.totalRules")}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:rulesLibrary.imported")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">{importedCount}</p>
                        <p className="text-xs text-muted">
                            {t("settings:rulesLibrary.rulesInActiveProfile")}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <p className="text-sm font-semibold text-foreground">
                            {t("settings:rulesLibrary.custom")}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-semibold text-foreground">
                            {rules.filter((rule): boolean => rule.source === "custom").length}
                        </p>
                        <p className="text-xs text-muted">
                            {t("settings:rulesLibrary.teamDefinedPolicyRules")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <p className={TYPOGRAPHY.sectionTitle}>
                        {t("settings:rulesLibrary.browsePrebuiltRules")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                        <Input
                            aria-label={t("settings:rulesLibrary.searchRules")}
                            placeholder={t("settings:rulesLibrary.searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e): void => {
                                setSearchQuery(e.target.value)
                            }}
                        />
                        <select
                            aria-label={t("settings:ariaLabel.rulesLibrary.category")}
                            className={NATIVE_FORM.select}
                            id="rules-category-filter"
                            value={selectedCategory}
                            onChange={(event): void => {
                                const value = event.currentTarget.value
                                if (
                                    value === "all" ||
                                    value === "security" ||
                                    value === "architecture" ||
                                    value === "performance" ||
                                    value === "style"
                                ) {
                                    setSelectedCategory(value)
                                }
                            }}
                        >
                            {CATEGORY_OPTIONS.map(
                                (option): ReactElement => (
                                    <option key={option} value={option}>
                                        {option === "all"
                                            ? t("settings:rulesLibrary.allCategories")
                                            : formatCategoryLabel(option)}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    <ul
                        aria-label={t("settings:ariaLabel.rulesLibrary.rulesCatalog")}
                        className="space-y-2"
                    >
                        {filteredRules.map((rule): ReactElement => {
                            const isImported = importedRuleIds.includes(rule.id)
                            return (
                                <li
                                    key={rule.id}
                                    className="rounded-lg border border-border bg-surface p-3"
                                >
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                {rule.name}
                                            </p>
                                            <p className="text-xs text-muted">{rule.description}</p>
                                            <div className="flex items-center gap-2">
                                                <Chip
                                                    color={mapCategoryChipColor(rule.category)}
                                                    size="sm"
                                                    variant="soft"
                                                >
                                                    {formatCategoryLabel(rule.category)}
                                                </Chip>
                                                <Chip size="sm" variant="secondary">
                                                    {rule.source}
                                                </Chip>
                                            </div>
                                            <p className="font-mono text-xs text-muted">
                                                {rule.expression}
                                            </p>
                                        </div>
                                        <Button
                                            isDisabled={isImported}
                                            size="sm"
                                            variant={isImported ? "secondary" : "primary"}
                                            onPress={(): void => {
                                                handleImportRule(rule.id)
                                            }}
                                        >
                                            {isImported
                                                ? t("settings:rulesLibrary.importedButton")
                                                : t("settings:rulesLibrary.importButton")}
                                        </Button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:rulesLibrary.createCustomRule")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input
                            aria-label={t("settings:rulesLibrary.ruleName")}
                            placeholder={t("settings:rulesLibrary.ruleNamePlaceholder")}
                            value={customName}
                            onChange={(e): void => {
                                setCustomName(e.target.value)
                            }}
                        />
                        <Input
                            aria-label={t("settings:rulesLibrary.description")}
                            placeholder={t("settings:rulesLibrary.descriptionPlaceholder")}
                            value={customDescription}
                            onChange={(e): void => {
                                setCustomDescription(e.target.value)
                            }}
                        />
                        <select
                            aria-label={t("settings:ariaLabel.rulesLibrary.category")}
                            className={NATIVE_FORM.select}
                            id="custom-rule-category"
                            value={customCategory}
                            onChange={(event): void => {
                                const nextCategory = event.currentTarget.value
                                if (
                                    nextCategory === "security" ||
                                    nextCategory === "architecture" ||
                                    nextCategory === "performance" ||
                                    nextCategory === "style"
                                ) {
                                    setCustomCategory(nextCategory)
                                }
                            }}
                        >
                            <option value="security">
                                {t("settings:rulesLibrary.categorySecurity")}
                            </option>
                            <option value="architecture">
                                {t("settings:rulesLibrary.categoryArchitecture")}
                            </option>
                            <option value="performance">
                                {t("settings:rulesLibrary.categoryPerformance")}
                            </option>
                            <option value="style">
                                {t("settings:rulesLibrary.categoryStyle")}
                            </option>
                        </select>
                        <Input
                            aria-label={t("settings:rulesLibrary.ruleExpression")}
                            placeholder={t("settings:rulesLibrary.ruleExpressionPlaceholder")}
                            value={customExpression}
                            onChange={(e): void => {
                                setCustomExpression(e.target.value)
                            }}
                        />
                        <div className="flex justify-end">
                            <Button variant="primary" onPress={handleCreateCustomRule}>
                                {t("settings:rulesLibrary.createCustomRule")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <p className={TYPOGRAPHY.sectionTitle}>
                            {t("settings:rulesLibrary.testRules")}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <select
                            aria-label={t("settings:ariaLabel.rulesLibrary.ruleToTest")}
                            className={NATIVE_FORM.select}
                            id="rule-test-target"
                            value={testRuleId}
                            onChange={(event): void => {
                                const nextValue = event.currentTarget.value
                                if (nextValue.length === 0) {
                                    return
                                }
                                setTestRuleId(nextValue)
                            }}
                        >
                            {rules.map(
                                (rule): ReactElement => (
                                    <option key={rule.id} value={rule.id}>
                                        {rule.name}
                                    </option>
                                ),
                            )}
                        </select>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted" htmlFor="rule-test-sample-input">
                                {t("settings:rulesLibrary.sampleInput")}
                            </label>
                            <textarea
                                aria-label={t("settings:ariaLabel.rulesLibrary.sampleInput")}
                                className="min-h-28 rounded-lg border border-border bg-surface p-3 text-sm"
                                id="rule-test-sample-input"
                                value={testInput}
                                onChange={(event): void => {
                                    setTestInput(event.currentTarget.value)
                                }}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button variant="secondary" onPress={handleTestRule}>
                                {t("settings:rulesLibrary.testSelectedRule")}
                            </Button>
                        </div>
                        {testResult === undefined ? null : (
                            <Alert status={testResult.status === "passed" ? "success" : "warning"}>
                                <Alert.Title>
                                    {testResult.status === "passed"
                                        ? t("settings:rulesLibrary.ruleMatched")
                                        : t("settings:rulesLibrary.ruleNotMatched")}
                                </Alert.Title>
                                <Alert.Description>{testResult.message}</Alert.Description>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div></div>
    )
}
