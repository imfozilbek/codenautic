import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"

import { Card, CardContent, CardHeader } from "@heroui/react"
import { StyledLink } from "@/components/layout/styled-link"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { PageShell } from "@/components/layout/page-shell"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import { GAP } from "@/lib/constants/spacing"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { StaggerContainer, STAGGER_ITEM_VARIANTS } from "@/lib/motion"
import { createSettingsNavGroups } from "@/lib/navigation/settings-nav-items"

/**
 * Settings overview page with grouped navigation cards.
 *
 * @returns Dashboard-style grid of settings category cards.
 */
export function SettingsPage(): ReactElement {
    const { t } = useTranslation(["navigation"])
    const uiRole = useUiRole()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"
    const settingsGroups = createSettingsNavGroups(t)

    return (
        <PageShell
            layout="standard"
            subtitle={t("navigation:settingsGroup.generalDescription")}
            title={t("navigation:sidebar.settings")}
        >
            <ActivationChecklist role={checklistRole} />
            <StaggerContainer
                as="div"
                className={`grid ${GAP.section} sm:grid-cols-2 lg:grid-cols-3`}
            >
                {settingsGroups.map((group) => (
                    <motion.div key={group.key} variants={STAGGER_ITEM_VARIANTS}>
                        <Card className="h-full">
                            <CardHeader className="flex flex-row items-center gap-2">
                                <span className="text-muted">{group.icon}</span>
                                <p className={TYPOGRAPHY.sectionTitle}>{group.label}</p>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p className="text-muted">{group.description}</p>
                                <ul className="space-y-1">
                                    {group.items
                                        .filter((item) => item.to !== "/settings")
                                        .map((item) => (
                                            <li key={item.to}>
                                                <StyledLink
                                                    className="font-medium text-foreground"
                                                    to={item.to}
                                                >
                                                    {item.label}
                                                </StyledLink>
                                            </li>
                                        ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </StaggerContainer>
        </PageShell>
    )
}
