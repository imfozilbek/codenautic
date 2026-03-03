import {ValueObject} from "../value-object"

/**
 * Immutable expert prompt profile.
 */
export interface IExpertProps {
    readonly name: string
    readonly role: string
    readonly responsibilities: readonly string[]
    readonly priority: number
}

/**
 * Expert value object used by prompt assembly.
 */
export class Expert extends ValueObject<IExpertProps> {
    /**
     * Creates immutable expert profile.
     *
     * @param props Raw expert properties.
     */
    private constructor(props: IExpertProps) {
        super(normalizeExpertProps(props))
    }

    /**
     * Creates expert value object with strict validation.
     *
     * @param props Raw expert properties.
     * @returns Expert value object.
     */
    public static create(props: IExpertProps): Expert {
        return new Expert(props)
    }

    /**
     * Expert display name.
     *
     * @returns Normalized expert name.
     */
    public get name(): string {
        return this.props.name
    }

    /**
     * Expert role in the panel.
     *
     * @returns Normalized role.
     */
    public get role(): string {
        return this.props.role
    }

    /**
     * Expert responsibilities list.
     *
     * @returns Immutable copy of responsibilities.
     */
    public get responsibilities(): readonly string[] {
        return [...this.props.responsibilities]
    }

    /**
     * Expert priority where lower value means higher priority.
     *
     * @returns Non-negative priority value.
     */
    public get priority(): number {
        return this.props.priority
    }

    /**
     * Formats expert data for prompt injection.
     *
     * @returns Prompt-ready multiline expert block.
     */
    public formatForPrompt(): string {
        const responsibilityLines =
            this.props.responsibilities.length === 0
                ? ["- none"]
                : this.props.responsibilities.map((responsibility) => {
                    return `- ${responsibility}`
                })

        return [
            `Name: ${this.props.name}`,
            `Role: ${this.props.role}`,
            "Responsibilities:",
            ...responsibilityLines,
            `Priority: ${this.props.priority}`,
        ].join("\n")
    }

    /**
     * Serializes expert to plain object.
     *
     * @returns Serializable expert payload.
     */
    public toJSON(): IExpertProps {
        return {
            name: this.props.name,
            role: this.props.role,
            responsibilities: [...this.props.responsibilities],
            priority: this.props.priority,
        }
    }

    /**
     * Validates expert invariants.
     *
     * @param props Candidate expert properties.
     */
    protected validate(props: IExpertProps): void {
        normalizeRequiredText(props.name, "Expert name cannot be empty")
        normalizeRequiredText(props.role, "Expert role cannot be empty")
        normalizeResponsibilities(props.responsibilities)
        normalizePriority(props.priority)
    }
}

/**
 * Normalizes expert props and guarantees immutable arrays.
 *
 * @param props Raw expert properties.
 * @returns Normalized properties.
 */
function normalizeExpertProps(props: IExpertProps): IExpertProps {
    return {
        name: normalizeRequiredText(props.name, "Expert name cannot be empty"),
        role: normalizeRequiredText(props.role, "Expert role cannot be empty"),
        responsibilities: normalizeResponsibilities(props.responsibilities),
        priority: normalizePriority(props.priority),
    }
}

/**
 * Normalizes required text field.
 *
 * @param value Raw field value.
 * @param errorMessage Error message for invalid value.
 * @returns Trimmed non-empty text.
 */
function normalizeRequiredText(value: string, errorMessage: string): string {
    const normalizedValue = value.trim()
    if (normalizedValue.length === 0) {
        throw new Error(errorMessage)
    }

    return normalizedValue
}

/**
 * Normalizes responsibilities list.
 *
 * @param responsibilities Raw responsibilities.
 * @returns Immutable normalized list.
 */
function normalizeResponsibilities(responsibilities: readonly string[]): readonly string[] {
    if (Array.isArray(responsibilities) === false) {
        throw new Error("Expert responsibilities must be an array")
    }

    const normalizedResponsibilities: string[] = []
    for (const responsibility of responsibilities) {
        if (typeof responsibility !== "string") {
            throw new Error("Expert responsibility must be a string")
        }

        const normalizedResponsibility = responsibility.trim()
        if (normalizedResponsibility.length === 0) {
            throw new Error("Expert responsibility cannot be empty")
        }

        normalizedResponsibilities.push(normalizedResponsibility)
    }

    return Object.freeze([...normalizedResponsibilities])
}

/**
 * Normalizes priority field.
 *
 * @param value Raw priority.
 * @returns Valid non-negative finite priority.
 */
function normalizePriority(value: number): number {
    if (typeof value !== "number" || Number.isFinite(value) === false) {
        throw new Error("Expert priority must be a finite number")
    }

    if (value < 0) {
        throw new Error("Expert priority must be greater than or equal to 0")
    }

    return value
}
