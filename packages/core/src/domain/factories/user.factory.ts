import {User, type IUserProps} from "../entities/user.entity"
import {MemberRole} from "../value-objects/member-role.value-object"
import {UserPreferences, type IUserPreferencesProps} from "../value-objects/user-preferences.value-object"
import {UniqueId} from "../value-objects/unique-id.value-object"
import {type IEntityFactory} from "./entity-factory.interface"

/**
 * Input payload for creating new user.
 */
export interface ICreateUserProps {
    email: string
    displayName: string
    roles: string[]
    preferences: IUserPreferencesProps | undefined
    authProviders: string[]
}

/**
 * Snapshot from persistence.
 */
export interface IReconstituteUserProps {
    id: string
    email: string
    displayName: string
    roles: string[]
    preferences: IUserPreferencesProps
    authProviders: string[]
}

/**
 * Factory for user entity.
 */
export class UserFactory implements IEntityFactory<User, ICreateUserProps, IReconstituteUserProps> {
    /**
     * Creates factory instance.
     */
    public constructor() {
    }

    /**
     * Creates new user.
     *
     * @param input New user payload.
     * @returns User entity.
     */
    public create(input: ICreateUserProps): User {
        const props: IUserProps = {
            email: input.email,
            displayName: input.displayName,
            roles: input.roles.map((role) => MemberRole.create(role)),
            preferences: UserPreferences.create(input.preferences),
            authProviders: input.authProviders,
        }

        return new User(UniqueId.create(), props)
    }

    /**
     * Reconstitutes user from persistence.
     *
     * @param input Persistence snapshot.
     * @returns Reconstituted user entity.
     */
    public reconstitute(input: IReconstituteUserProps): User {
        const props: IUserProps = {
            email: input.email,
            displayName: input.displayName,
            roles: input.roles.map((role) => MemberRole.create(role)),
            preferences: UserPreferences.create(input.preferences),
            authProviders: input.authProviders,
        }

        return new User(UniqueId.create(input.id), props)
    }
}
