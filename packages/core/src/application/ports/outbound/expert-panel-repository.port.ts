import type {ExpertPanel} from "../../../domain/value-objects/prompt/expert-panel"

/**
 * Outbound contract for expert panel persistence.
 */
export interface IExpertPanelRepository {
    /**
     * Finds expert panel by name.
     *
     * @param name Panel name.
     * @returns Expert panel or null.
     */
    findByName(name: string): Promise<ExpertPanel | null>
}
