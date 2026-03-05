import {RepositoryId} from "../value-objects/repository-id.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {Team, type ITeamProps} from "../entities/team.entity"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Payload for creating a new team.
 */
export interface ICreateTeamProps {
    name: string
    organizationId: string
    memberIds?: readonly string[]
    repoIds?: readonly string[]
    ruleIds?: readonly string[]
    disabledRuleUuids?: readonly string[]
}

/**
 * Persistence snapshot for team reconstitution.
 */
export interface IReconstituteTeamProps {
    id: string
    name: string
    organizationId: string
    memberIds: readonly string[]
    repoIds: readonly string[]
    ruleIds: readonly string[]
    disabledRuleUuids: readonly string[]
}

/**
 * Factory for team entity.
 */
export class TeamFactory implements IEntityFactory<Team, ICreateTeamProps, IReconstituteTeamProps> {
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new team entity.
     *
     * @param input Input payload.
     * @returns New team entity.
     */
    public create(input: ICreateTeamProps): Team {
        const props: ITeamProps = {
            name: input.name,
            organizationId: UniqueId.create(input.organizationId),
            memberIds: (input.memberIds ?? []).map((memberId) => UniqueId.create(memberId)),
            repoIds: (input.repoIds ?? []).map((repoId) => RepositoryId.parse(repoId)),
            ruleIds: (input.ruleIds ?? []).map((ruleId) => UniqueId.create(ruleId)),
            disabledRuleUuids:
                (input.disabledRuleUuids ?? []).map((ruleId) => UniqueId.create(ruleId)),
        }
        return new Team(UniqueId.create(), props)
    }

    /**
     * Restores team from persistence snapshot.
     *
     * @param input Snapshot input.
     * @returns Restored team entity.
     */
    public reconstitute(input: IReconstituteTeamProps): Team {
        const props: ITeamProps = {
            name: input.name,
            organizationId: UniqueId.create(input.organizationId),
            memberIds: input.memberIds.map((memberId) => UniqueId.create(memberId)),
            repoIds: input.repoIds.map((repoId) => RepositoryId.parse(repoId)),
            ruleIds: input.ruleIds.map((ruleId) => UniqueId.create(ruleId)),
            disabledRuleUuids: input.disabledRuleUuids.map((ruleId) => UniqueId.create(ruleId)),
        }
        return new Team(UniqueId.create(input.id), props)
    }
}
