import { type ReactElement } from "react"
import { useTranslation } from "react-i18next"

import { ChevronDown } from "@/components/icons/app-icons"
import { TYPOGRAPHY } from "@/lib/constants/typography"
import {
    Avatar,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
} from "@/components/ui"

/**
 * Organization option for workspace switcher.
 */
export interface ISidebarOrganizationOption {
    /** Organization/tenant identifier. */
    readonly id: string
    /** Display label in selector. */
    readonly label: string
}

/**
 * Props for the sidebar footer area with workspace and user controls.
 */
export interface ISidebarFooterProps {
    /** Available tenant/workspace options. */
    readonly organizations?: ReadonlyArray<ISidebarOrganizationOption>
    /** Active organization ID. */
    readonly activeOrganizationId?: string
    /** Organization change handler. */
    readonly onOrganizationChange?: (organizationId: string) => void
    /** User name. */
    readonly userName?: string
    /** User email. */
    readonly userEmail?: string
    /** Sign out action. */
    readonly onSignOut?: () => void
    /** Open Settings page. */
    readonly onOpenSettings?: () => void
    /** Open Billing page. */
    readonly onOpenBilling?: () => void
    /** Open Help & Diagnostics page. */
    readonly onOpenHelp?: () => void
    /** Whether sidebar is in collapsed (icon-only) mode. */
    readonly isCollapsed?: boolean
}

/**
 * Unified sidebar footer — single dropdown trigger with avatar, name, and org.
 * Pattern: Linear/Notion-style compact user block.
 *
 * @param props Footer configuration.
 * @returns Sidebar footer element.
 */
export function SidebarFooter(props: ISidebarFooterProps): ReactElement {
    const { t } = useTranslation(["navigation"])
    const isCollapsed = props.isCollapsed === true

    const activeOrganization = props.organizations?.find(
        (organization): boolean =>
            organization.id === props.activeOrganizationId,
    )

    const displayName = props.userName ?? t("navigation:userMenu.defaultName")
    const displayEmail = props.userEmail ?? t("navigation:userMenu.defaultEmail")
    const orgLabel = activeOrganization?.label ?? t("navigation:userMenu.workspace")

    return (
        <div className="mt-auto border-t border-border/40 pt-2">
            <Dropdown>
                <DropdownTrigger
                    className={`w-full gap-2 rounded-lg px-2 py-1.5 ${isCollapsed ? "justify-center min-w-0" : "justify-start"}`}
                    size="sm"
                    variant="light"
                >
                    {isCollapsed ? (
                        <Avatar
                            className="shrink-0"
                            label={displayName}
                            size="sm"
                        />
                    ) : (
                        <span className="flex w-full items-center gap-2.5">
                            <Avatar
                                className="shrink-0"
                                label={displayName}
                                size="sm"
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className={`truncate ${TYPOGRAPHY.cardTitle}`}>
                                    {displayName}
                                </span>
                                <span className="truncate text-[11px] text-text-subtle">
                                    {orgLabel}
                                </span>
                            </span>
                            <ChevronDown
                                aria-hidden="true"
                                className="shrink-0 text-text-subtle"
                                size={14}
                            />
                        </span>
                    )}
                </DropdownTrigger>
                <DropdownMenu aria-label={displayName}>
                    <DropdownItem key="identity" className="pointer-events-none opacity-100">
                        <p className={TYPOGRAPHY.cardTitle}>{displayName}</p>
                        <p className="text-xs text-text-subtle">{displayEmail}</p>
                    </DropdownItem>
                    {props.organizations !== undefined && props.organizations.length > 1 ? (
                        <DropdownItem key="org-separator" className="pointer-events-none opacity-60">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                                {t("navigation:userMenu.workspace")}
                            </p>
                        </DropdownItem>
                    ) : null}
                    {props.organizations !== undefined
                        ? props.organizations.map(
                              (organization): ReactElement => (
                                  <DropdownItem
                                      key={`org-${organization.id}`}
                                      className={organization.id === props.activeOrganizationId ? "font-medium text-primary" : ""}
                                      onPress={(): void => {
                                          props.onOrganizationChange?.(organization.id)
                                      }}
                                  >
                                      {organization.label}
                                  </DropdownItem>
                              ),
                          )
                        : null}
                    <DropdownItem
                        key="settings"
                        onPress={(): void => {
                            props.onOpenSettings?.()
                        }}
                    >
                        {t("navigation:userMenu.openSettings")}
                    </DropdownItem>
                    <DropdownItem
                        key="billing"
                        onPress={(): void => {
                            props.onOpenBilling?.()
                        }}
                    >
                        {t("navigation:userMenu.openBilling")}
                    </DropdownItem>
                    <DropdownItem
                        key="help"
                        onPress={(): void => {
                            props.onOpenHelp?.()
                        }}
                    >
                        {t("navigation:userMenu.helpDiagnostics")}
                    </DropdownItem>
                    {props.onSignOut === undefined ? null : (
                        <DropdownItem
                            key="logout"
                            color="danger"
                            onPress={(): void => {
                                const signOut = props.onSignOut
                                if (signOut === undefined) {
                                    return
                                }

                                void signOut()
                            }}
                        >
                            {t("navigation:userMenu.signOut")}
                        </DropdownItem>
                    )}
                </DropdownMenu>
            </Dropdown>
        </div>
    )
}
