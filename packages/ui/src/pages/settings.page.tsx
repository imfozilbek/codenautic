import { type ReactElement } from "react"
import { motion } from "motion/react"

import { Card, CardBody, CardHeader, StyledLink } from "@/components/ui"
import { ActivationChecklist } from "@/components/onboarding/activation-checklist"
import { useUiRole } from "@/lib/permissions/ui-policy"
import { StaggerContainer, STAGGER_ITEM_VARIANTS } from "@/lib/motion"
import { SETTINGS_NAV_GROUPS } from "@/lib/navigation/settings-nav-items"

/**
 * Settings overview page with grouped navigation cards.
 *
 * @returns Dashboard-style grid of settings category cards.
 */
export function SettingsPage(): ReactElement {
    const uiRole = useUiRole()
    const checklistRole = uiRole === "admin" ? "admin" : "developer"

    return (
        <section className="space-y-4">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-text-secondary">
                    Configure providers, onboarding defaults, governance rules, and operational
                    controls for your workspace.
                </p>
            </header>
            <ActivationChecklist role={checklistRole} />
            <StaggerContainer
                as="div"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
                {SETTINGS_NAV_GROUPS.map((group) => (
                    <motion.div key={group.key} variants={STAGGER_ITEM_VARIANTS}>
                        <Card className="h-full">
                            <CardHeader className="flex flex-row items-center gap-2">
                                <span className="text-text-secondary">{group.icon}</span>
                                <p className="text-base font-semibold text-foreground">
                                    {group.label}
                                </p>
                            </CardHeader>
                            <CardBody className="space-y-2 text-sm">
                                <p className="text-text-tertiary">{group.description}</p>
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
                            </CardBody>
                        </Card>
                    </motion.div>
                ))}
            </StaggerContainer>
        </section>
    )
}
