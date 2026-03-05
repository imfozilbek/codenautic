import { type ChangeEvent, type DragEvent, type ReactElement, useMemo, useState } from "react"

import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui"
import { showToastInfo, showToastSuccess } from "@/lib/notifications/toast"

interface ITemplateSection {
    readonly id: string
    readonly title: string
    readonly enabled: boolean
}

const DEFAULT_TEMPLATE_SECTIONS: ReadonlyArray<ITemplateSection> = [
    {
        enabled: true,
        id: "executive-summary",
        title: "Executive summary",
    },
    {
        enabled: true,
        id: "architecture-signals",
        title: "Architecture signals",
    },
    {
        enabled: true,
        id: "delivery-signals",
        title: "Delivery signals",
    },
    {
        enabled: true,
        id: "risks-and-actions",
        title: "Risks and actions",
    },
]

function reorderTemplateSections(
    sections: ReadonlyArray<ITemplateSection>,
    movedId: string,
    targetId: string,
): ReadonlyArray<ITemplateSection> {
    const movedIndex = sections.findIndex((section): boolean => section.id === movedId)
    const targetIndex = sections.findIndex((section): boolean => section.id === targetId)
    if (movedIndex < 0 || targetIndex < 0 || movedIndex === targetIndex) {
        return sections
    }

    const nextSections = [...sections]
    const [movedSection] = nextSections.splice(movedIndex, 1)
    if (movedSection === undefined) {
        return sections
    }
    nextSections.splice(targetIndex, 0, movedSection)
    return nextSections
}

/**
 * Редактор report template с branding и reorder секций.
 *
 * @returns UI template editor с section configuration и drag-and-drop reorder.
 */
export function ReportTemplateEditor(): ReactElement {
    const [templateName, setTemplateName] = useState<string>("Weekly engineering report")
    const [brandLogoUrl, setBrandLogoUrl] = useState<string>("https://assets.codenautic.app/logo.svg")
    const [brandAccentColor, setBrandAccentColor] = useState<string>("#2563eb")
    const [sections, setSections] = useState<ReadonlyArray<ITemplateSection>>(DEFAULT_TEMPLATE_SECTIONS)
    const [draggedSectionId, setDraggedSectionId] = useState<string | undefined>()
    const [status, setStatus] = useState<string>("No template changes saved yet.")

    const enabledSections = useMemo((): ReadonlyArray<ITemplateSection> => {
        return sections.filter((section): boolean => section.enabled)
    }, [sections])
    const templatePreviewSummary = useMemo((): string => {
        const enabledSectionTitles = enabledSections.map((section): string => section.title).join(" -> ")
        return `Template: ${templateName} · Brand: ${brandLogoUrl} · Accent: ${brandAccentColor} · Sections: ${enabledSectionTitles}`
    }, [brandAccentColor, brandLogoUrl, enabledSections, templateName])

    const handleSectionToggle = (sectionId: string): void => {
        setSections((currentSections): ReadonlyArray<ITemplateSection> => {
            return currentSections.map((section): ITemplateSection => {
                if (section.id !== sectionId) {
                    return section
                }
                return {
                    ...section,
                    enabled: section.enabled === false,
                }
            })
        })
    }
    const handleMoveSection = (sectionId: string, direction: "up" | "down"): void => {
        setSections((currentSections): ReadonlyArray<ITemplateSection> => {
            const currentIndex = currentSections.findIndex((section): boolean => section.id === sectionId)
            if (currentIndex < 0) {
                return currentSections
            }
            const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
            if (targetIndex < 0 || targetIndex >= currentSections.length) {
                return currentSections
            }

            const reordered = [...currentSections]
            const [section] = reordered.splice(currentIndex, 1)
            if (section === undefined) {
                return currentSections
            }
            reordered.splice(targetIndex, 0, section)
            return reordered
        })
    }
    const handleDragStart = (event: DragEvent<HTMLLIElement>, sectionId: string): void => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", sectionId)
        setDraggedSectionId(sectionId)
    }
    const handleDrop = (event: DragEvent<HTMLLIElement>, targetSectionId: string): void => {
        event.preventDefault()
        const movedSectionId = draggedSectionId ?? event.dataTransfer.getData("text/plain")
        if (movedSectionId.length === 0) {
            return
        }

        setSections((currentSections): ReadonlyArray<ITemplateSection> => {
            return reorderTemplateSections(currentSections, movedSectionId, targetSectionId)
        })
        setDraggedSectionId(undefined)
        showToastInfo("Template section reordered.")
    }
    const handleSaveTemplate = (): void => {
        setStatus(
            `Template saved: ${templateName} with ${String(enabledSections.length)} enabled sections.`,
        )
        showToastSuccess("Report template saved.")
    }

    return (
        <Card>
            <CardHeader>
                <p className="text-base font-semibold text-[var(--foreground)]">Report template editor</p>
            </CardHeader>
            <CardBody className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="space-y-1 text-sm">
                        <span className="font-semibold text-[var(--foreground)]">Template name</span>
                        <input
                            aria-label="Template name"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                            type="text"
                            value={templateName}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                setTemplateName(event.currentTarget.value)
                            }}
                        />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="font-semibold text-[var(--foreground)]">Brand logo URL</span>
                        <input
                            aria-label="Template brand logo"
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                            type="text"
                            value={brandLogoUrl}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                setBrandLogoUrl(event.currentTarget.value)
                            }}
                        />
                    </label>
                    <label className="space-y-1 text-sm">
                        <span className="font-semibold text-[var(--foreground)]">Accent color</span>
                        <input
                            aria-label="Template accent color"
                            className="h-9 w-full rounded border border-slate-300 bg-white px-2 py-1"
                            type="color"
                            value={brandAccentColor}
                            onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                                setBrandAccentColor(event.currentTarget.value)
                            }}
                        />
                    </label>
                </div>
                <ul aria-label="Template sections list" className="space-y-2">
                    {sections.map((section): ReactElement => (
                        <li
                            className="rounded border border-slate-200 bg-slate-50 p-2"
                            draggable={true}
                            key={section.id}
                            onDragStart={(event): void => {
                                handleDragStart(event, section.id)
                            }}
                            onDragOver={(event): void => {
                                event.preventDefault()
                            }}
                            onDrop={(event): void => {
                                handleDrop(event, section.id)
                            }}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    aria-label={`Template section enabled ${section.id}`}
                                    checked={section.enabled}
                                    type="checkbox"
                                    onChange={(): void => {
                                        handleSectionToggle(section.id)
                                    }}
                                />
                                <span className="text-sm font-semibold text-slate-900">
                                    {section.title}
                                </span>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={(): void => {
                                        handleMoveSection(section.id, "up")
                                    }}
                                >
                                    {`Move up section ${section.id}`}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    onPress={(): void => {
                                        handleMoveSection(section.id, "down")
                                    }}
                                >
                                    {`Move down section ${section.id}`}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
                <Alert color="primary" title="Template preview" variant="flat">
                    <span aria-label="Template preview summary">{templatePreviewSummary}</span>
                </Alert>
                <Button onPress={handleSaveTemplate}>Save template</Button>
                <Alert color="primary" title="Template status" variant="flat">
                    {status}
                </Alert>
            </CardBody>
        </Card>
    )
}
