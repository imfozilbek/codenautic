import {ValueObject} from "../value-object"
import {Expert, type IExpertProps} from "./expert"

/**
 * Immutable expert panel payload.
 */
export interface IExpertPanelProps {
    readonly experts: readonly Expert[]
}

/**
 * Serializable expert panel snapshot.
 */
export interface IExpertPanelSnapshot {
    readonly experts: readonly IExpertProps[]
}

/**
 * Expert panel value object for prompt injection.
 */
export class ExpertPanel extends ValueObject<IExpertPanelProps> {
    /**
     * Creates immutable expert panel.
     *
     * @param props Expert panel properties.
     */
    private constructor(props: IExpertPanelProps) {
        super(normalizeExpertPanelProps(props))
    }

    /**
     * Creates expert panel from expert list.
     *
     * @param experts Expert profiles.
     * @returns Expert panel value object.
     */
    public static create(experts: readonly Expert[]): ExpertPanel {
        return new ExpertPanel({
            experts,
        })
    }

    /**
     * Expert profiles.
     *
     * @returns Immutable expert list snapshot.
     */
    public get experts(): readonly Expert[] {
        return [...this.props.experts]
    }

    /**
     * Number of experts in panel.
     *
     * @returns Expert count.
     */
    public get size(): number {
        return this.props.experts.length
    }

    /**
     * Formats panel for prompt injection.
     *
     * @returns Prompt-ready multiline expert panel.
     */
    public formatForPrompt(): string {
        if (this.props.experts.length === 0) {
            return "Experts:\n- none"
        }

        const sortedExperts = [...this.props.experts].sort(compareExperts)
        const sections = sortedExperts.map((expert, index) => {
            return `Expert ${index + 1}:\n${expert.formatForPrompt()}`
        })

        return sections.join("\n\n")
    }

    /**
     * Serializes expert panel to plain object.
     *
     * @returns Serializable snapshot.
     */
    public toJSON(): IExpertPanelSnapshot {
        return {
            experts: this.props.experts.map((expert) => expert.toJSON()),
        }
    }

    /**
     * Validates expert panel invariants.
     *
     * @param props Candidate properties.
     */
    protected validate(props: IExpertPanelProps): void {
        normalizeExperts(props.experts)
    }
}

/**
 * Normalizes panel properties.
 *
 * @param props Raw panel properties.
 * @returns Normalized panel properties.
 */
function normalizeExpertPanelProps(props: IExpertPanelProps): IExpertPanelProps {
    return {
        experts: normalizeExperts(props.experts),
    }
}

/**
 * Validates and freezes expert list.
 *
 * @param experts Raw expert list.
 * @returns Immutable expert list.
 */
function normalizeExperts(experts: readonly Expert[]): readonly Expert[] {
    if (Array.isArray(experts) === false) {
        throw new Error("ExpertPanel experts must be an array")
    }

    const normalizedExperts: Expert[] = []
    for (const expert of experts) {
        if (!(expert instanceof Expert)) {
            throw new Error("ExpertPanel experts must contain Expert value objects")
        }

        normalizedExperts.push(expert)
    }

    return Object.freeze([...normalizedExperts])
}

/**
 * Stable expert ordering for deterministic prompts.
 *
 * @param left Left expert.
 * @param right Right expert.
 * @returns Sort delta by priority then name.
 */
function compareExperts(left: Expert, right: Expert): number {
    if (left.priority !== right.priority) {
        return left.priority - right.priority
    }

    return left.name.localeCompare(right.name)
}
