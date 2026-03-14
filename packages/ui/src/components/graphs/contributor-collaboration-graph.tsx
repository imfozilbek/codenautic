import type { KeyboardEvent, ReactElement } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

/**
 * Количество символов для инициалов контрибьютора в графе.
 */
const CONTRIBUTOR_INITIALS_LENGTH = 2

/**
 * Узел графа контрибьютора.
 */
export interface IContributorCollaborationNode {
    /** Уникальный идентификатор контрибьютора. */
    readonly contributorId: string
    /** Имя для отображения. */
    readonly label: string
    /** Количество коммитов для масштабирования размера узла. */
    readonly commitCount: number
}

/**
 * Ребро графа совместной работы.
 */
export interface IContributorCollaborationEdge {
    /** Идентификатор source-контрибьютора. */
    readonly sourceContributorId: string
    /** Идентификатор target-контрибьютора. */
    readonly targetContributorId: string
    /** Частота co-authoring между участниками. */
    readonly coAuthorCount: number
}

/**
 * Пропсы contributor collaboration graph.
 */
export interface IContributorCollaborationGraphProps {
    /** Ноды контрибьюторов. */
    readonly contributors: ReadonlyArray<IContributorCollaborationNode>
    /** Ребра совместной работы. */
    readonly collaborations: ReadonlyArray<IContributorCollaborationEdge>
    /** Активный контрибьютор для подсветки. */
    readonly activeContributorId?: string
    /** Обработчик выбора контрибьютора. */
    readonly onSelectContributor?: (contributorId: string) => void
}

interface IContributorNodeLayout {
    readonly contributor: IContributorCollaborationNode
    readonly x: number
    readonly y: number
    readonly radius: number
}

const LAYOUT_WIDTH = 720
const LAYOUT_HEIGHT = 320
const MIN_RADIUS = 10
const MAX_RADIUS = 24
const FORCE_ITERATIONS = 32

function resolveNodeRadius(
    contributors: ReadonlyArray<IContributorCollaborationNode>,
    commitCount: number,
): number {
    const commitCounts = contributors.map((entry): number => Math.max(0, entry.commitCount))
    const maxCount = Math.max(...commitCounts, 1)
    const minCount = Math.min(...commitCounts, maxCount)

    if (maxCount <= minCount) {
        return MIN_RADIUS
    }

    const normalized = (commitCount - minCount) / (maxCount - minCount)
    return MIN_RADIUS + normalized * (MAX_RADIUS - MIN_RADIUS)
}

/**
 * Рассчитывает force-like layout для contributor graph.
 *
 * @param contributors Список участников.
 * @param collaborations Список связей co-authoring.
 * @returns Layout по contributorId.
 */
function buildContributorGraphLayout(
    contributors: ReadonlyArray<IContributorCollaborationNode>,
    collaborations: ReadonlyArray<IContributorCollaborationEdge>,
): ReadonlyMap<string, IContributorNodeLayout> {
    const nodeCount = contributors.length
    if (nodeCount === 0) {
        return new Map<string, IContributorNodeLayout>()
    }

    const centerX = LAYOUT_WIDTH / 2
    const centerY = LAYOUT_HEIGHT / 2
    const baseRadius = Math.min(LAYOUT_WIDTH, LAYOUT_HEIGHT) / 3
    const positionById = new Map<string, { x: number; y: number }>()

    contributors.forEach((contributor, index): void => {
        const angle = (Math.PI * 2 * index) / nodeCount
        positionById.set(contributor.contributorId, {
            x: centerX + Math.cos(angle) * baseRadius,
            y: centerY + Math.sin(angle) * baseRadius,
        })
    })

    for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration += 1) {
        const forceById = new Map<string, { x: number; y: number }>()
        for (const contributor of contributors) {
            forceById.set(contributor.contributorId, { x: 0, y: 0 })
        }

        for (let sourceIndex = 0; sourceIndex < contributors.length; sourceIndex += 1) {
            const source = contributors[sourceIndex]
            if (source === undefined) {
                continue
            }
            const sourcePosition = positionById.get(source.contributorId)
            if (sourcePosition === undefined) {
                continue
            }
            for (
                let targetIndex = sourceIndex + 1;
                targetIndex < contributors.length;
                targetIndex += 1
            ) {
                const target = contributors[targetIndex]
                if (target === undefined) {
                    continue
                }
                const targetPosition = positionById.get(target.contributorId)
                if (targetPosition === undefined) {
                    continue
                }
                const deltaX = sourcePosition.x - targetPosition.x
                const deltaY = sourcePosition.y - targetPosition.y
                const distance = Math.max(12, Math.sqrt(deltaX * deltaX + deltaY * deltaY))
                const repulsion = 2200 / (distance * distance)
                const normalizedX = deltaX / distance
                const normalizedY = deltaY / distance
                const sourceForce = forceById.get(source.contributorId)
                const targetForce = forceById.get(target.contributorId)
                if (sourceForce !== undefined) {
                    sourceForce.x += normalizedX * repulsion
                    sourceForce.y += normalizedY * repulsion
                }
                if (targetForce !== undefined) {
                    targetForce.x -= normalizedX * repulsion
                    targetForce.y -= normalizedY * repulsion
                }
            }
        }

        for (const edge of collaborations) {
            const sourcePosition = positionById.get(edge.sourceContributorId)
            const targetPosition = positionById.get(edge.targetContributorId)
            if (sourcePosition === undefined || targetPosition === undefined) {
                continue
            }
            const deltaX = targetPosition.x - sourcePosition.x
            const deltaY = targetPosition.y - sourcePosition.y
            const distance = Math.max(10, Math.sqrt(deltaX * deltaX + deltaY * deltaY))
            const spring = (distance - 140) * 0.008 * Math.max(1, edge.coAuthorCount / 2)
            const normalizedX = deltaX / distance
            const normalizedY = deltaY / distance
            const sourceForce = forceById.get(edge.sourceContributorId)
            const targetForce = forceById.get(edge.targetContributorId)

            if (sourceForce !== undefined) {
                sourceForce.x += normalizedX * spring
                sourceForce.y += normalizedY * spring
            }
            if (targetForce !== undefined) {
                targetForce.x -= normalizedX * spring
                targetForce.y -= normalizedY * spring
            }
        }

        for (const contributor of contributors) {
            const position = positionById.get(contributor.contributorId)
            const force = forceById.get(contributor.contributorId)
            if (position === undefined || force === undefined) {
                continue
            }
            position.x = Math.min(LAYOUT_WIDTH - 24, Math.max(24, position.x + force.x * 0.6))
            position.y = Math.min(LAYOUT_HEIGHT - 24, Math.max(24, position.y + force.y * 0.6))
        }
    }

    const layoutById = new Map<string, IContributorNodeLayout>()
    for (const contributor of contributors) {
        const position = positionById.get(contributor.contributorId)
        if (position === undefined) {
            continue
        }

        layoutById.set(contributor.contributorId, {
            contributor,
            radius: resolveNodeRadius(contributors, Math.max(0, contributor.commitCount)),
            x: position.x,
            y: position.y,
        })
    }

    return layoutById
}

/**
 * Force-like визуализация совместной работы контрибьюторов.
 *
 * @param props Ноды/ребра графа и обработчик выбора.
 * @returns React-компонент contributor graph.
 */
export function ContributorCollaborationGraph(
    props: IContributorCollaborationGraphProps,
): ReactElement {
    const { t } = useTranslation(["code-city"])
    const layoutById = useMemo(
        (): ReadonlyMap<string, IContributorNodeLayout> =>
            buildContributorGraphLayout(props.contributors, props.collaborations),
        [props.collaborations, props.contributors],
    )

    const handleContributorSelect = (contributorId: string): void => {
        props.onSelectContributor?.(contributorId)
    }

    const handleContributorKeyDown = (
        event: KeyboardEvent<SVGGElement>,
        contributorId: string,
    ): void => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleContributorSelect(contributorId)
        }
    }

    return (
        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <p className="text-sm font-semibold text-foreground">
                {t("code-city:contributorCollaboration.title")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
                {t("code-city:contributorCollaboration.description")}
            </p>
            <div
                aria-label={t("code-city:contributorCollaboration.ariaLabelViewport")}
                className="mt-3 overflow-x-auto"
            >
                <svg
                    aria-label={t("code-city:contributorCollaboration.ariaLabelGraph")}
                    className="h-auto w-full min-w-[680px]"
                    viewBox={`0 0 ${String(LAYOUT_WIDTH)} ${String(LAYOUT_HEIGHT)}`}
                >
                    {props.collaborations.map((edge): ReactElement | null => {
                        const sourceNode = layoutById.get(edge.sourceContributorId)
                        const targetNode = layoutById.get(edge.targetContributorId)
                        if (sourceNode === undefined || targetNode === undefined) {
                            return null
                        }

                        return (
                            <line
                                key={`${edge.sourceContributorId}-${edge.targetContributorId}`}
                                stroke="hsl(198 93% 60%)"
                                strokeOpacity={0.35}
                                strokeWidth={1 + Math.min(5, edge.coAuthorCount)}
                                x1={sourceNode.x}
                                x2={targetNode.x}
                                y1={sourceNode.y}
                                y2={targetNode.y}
                            />
                        )
                    })}
                    {props.contributors.map((contributor): ReactElement | null => {
                        const layout = layoutById.get(contributor.contributorId)
                        if (layout === undefined) {
                            return null
                        }
                        const isActive = props.activeContributorId === contributor.contributorId

                        return (
                            <g
                                aria-label={t("code-city:contributorCollaboration.ariaLabelFocus", {
                                    label: contributor.label,
                                })}
                                className="cursor-pointer"
                                key={contributor.contributorId}
                                role="button"
                                tabIndex={0}
                                onClick={(): void => {
                                    handleContributorSelect(contributor.contributorId)
                                }}
                                onKeyDown={(event): void => {
                                    handleContributorKeyDown(event, contributor.contributorId)
                                }}
                            >
                                <circle
                                    cx={layout.x}
                                    cy={layout.y}
                                    data-testid={`contributor-node-${contributor.contributorId}`}
                                    fill={isActive ? "hsl(198 100% 30%)" : "hsl(198 100% 40%)"}
                                    r={layout.radius}
                                    stroke="hsl(210 40% 96%)"
                                    strokeWidth={isActive ? 3 : 2}
                                />
                                <text
                                    fill="hsl(210 40% 98%)"
                                    fontSize={12}
                                    fontWeight={600}
                                    textAnchor="middle"
                                    x={layout.x}
                                    y={layout.y + 4}
                                >
                                    {contributor.label
                                        .slice(0, CONTRIBUTOR_INITIALS_LENGTH)
                                        .toUpperCase()}
                                </text>
                                <text
                                    fill="hsl(222 47% 11%)"
                                    fontSize={11}
                                    fontWeight={500}
                                    textAnchor="middle"
                                    x={layout.x}
                                    y={layout.y + layout.radius + 16}
                                >
                                    {contributor.label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </section>
    )
}
