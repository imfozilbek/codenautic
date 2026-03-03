import {BaseDomainEvent, type DomainEventPayload} from "./base-domain-event"

/**
 * Payload for GraphUpdated event.
 */
export interface IGraphUpdatedPayload extends DomainEventPayload {
    /**
     * Repository identifier that had graph update.
     */
    readonly repositoryId: string

    /**
     * Node identifiers that changed during graph recomputation.
     */
    readonly changedNodeIds: readonly string[]
}

/**
 * Event emitted when repository code graph is updated.
 */
export class GraphUpdated extends BaseDomainEvent<IGraphUpdatedPayload> {
    /**
     * Creates GraphUpdated event.
     *
     * @param repositoryId Repository id in `<platform>:<id>` format.
     * @param changedNodeIds Updated node identifiers.
     * @param occurredAt Optional event timestamp.
     */
    public constructor(
        repositoryId: string,
        changedNodeIds: readonly string[],
        occurredAt?: Date,
    ) {
        super(
            repositoryId,
            {
                repositoryId,
                changedNodeIds: [...changedNodeIds],
            },
            occurredAt,
        )
    }

    /**
     * Resolves event name.
     *
     * @returns Event name.
     */
    protected resolveEventName(): string {
        return "GraphUpdated"
    }
}
