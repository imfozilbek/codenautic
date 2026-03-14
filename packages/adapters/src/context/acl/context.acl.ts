import type {
    IAntiCorruptionLayer,
    IAsanaTask,
    IExternalContext,
    IJiraTicket,
    ILinearIssue,
    ISentryError,
} from "@codenautic/core"

import {
    mapAsanaContext,
    mapExternalAsanaTask,
    mapExternalJiraTicket,
    mapExternalLinearIssue,
    mapExternalSentryError,
    mapJiraContext,
    mapLinearContext,
    mapSentryContext,
} from "./context-acl-mapper"

/**
 * Jira ticket ACL adapter.
 */
export class JiraTicketAcl implements IAntiCorruptionLayer<unknown, IJiraTicket> {
    /**
     * Creates Jira ticket ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Jira ticket payload to domain DTO.
     *
     * @param external External Jira payload.
     * @returns Domain Jira ticket DTO.
     */
    public toDomain(external: unknown): IJiraTicket {
        return mapExternalJiraTicket(external)
    }
}

/**
 * Linear issue ACL adapter.
 */
export class LinearIssueAcl implements IAntiCorruptionLayer<unknown, ILinearIssue> {
    /**
     * Creates Linear issue ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Linear issue payload to domain DTO.
     *
     * @param external External Linear payload.
     * @returns Domain Linear issue DTO.
     */
    public toDomain(external: unknown): ILinearIssue {
        return mapExternalLinearIssue(external)
    }
}

/**
 * Asana task ACL adapter.
 */
export class AsanaTaskAcl implements IAntiCorruptionLayer<unknown, IAsanaTask> {
    /**
     * Creates Asana task ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Asana payload to domain DTO.
     *
     * @param external External Asana payload.
     * @returns Domain Asana task DTO.
     */
    public toDomain(external: unknown): IAsanaTask {
        return mapExternalAsanaTask(external)
    }
}

/**
 * Jira context ACL adapter.
 */
export class JiraContextAcl implements IAntiCorruptionLayer<unknown, IExternalContext> {
    /**
     * Creates Jira context ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Jira payload to shared external context.
     *
     * @param external External Jira payload.
     * @returns Shared external context.
     */
    public toDomain(external: unknown): IExternalContext {
        return mapJiraContext(external)
    }
}

/**
 * Linear context ACL adapter.
 */
export class LinearContextAcl implements IAntiCorruptionLayer<unknown, IExternalContext> {
    /**
     * Creates Linear context ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Linear payload to shared external context.
     *
     * @param external External Linear payload.
     * @returns Shared external context.
     */
    public toDomain(external: unknown): IExternalContext {
        return mapLinearContext(external)
    }
}

/**
 * Asana context ACL adapter.
 */
export class AsanaContextAcl implements IAntiCorruptionLayer<unknown, IExternalContext> {
    /**
     * Creates Asana context ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Asana payload to shared external context.
     *
     * @param external External Asana payload.
     * @returns Shared external context.
     */
    public toDomain(external: unknown): IExternalContext {
        return mapAsanaContext(external)
    }
}

/**
 * Sentry error ACL adapter.
 */
export class SentryErrorAcl implements IAntiCorruptionLayer<unknown, ISentryError> {
    /**
     * Creates Sentry error ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Sentry error payload to domain DTO.
     *
     * @param external External Sentry payload.
     * @returns Domain Sentry error DTO.
     */
    public toDomain(external: unknown): ISentryError {
        return mapExternalSentryError(external)
    }
}

/**
 * Sentry context ACL adapter.
 */
export class SentryContextAcl implements IAntiCorruptionLayer<unknown, IExternalContext> {
    /**
     * Creates Sentry context ACL adapter.
     */
    public constructor() {}

    /**
     * Converts external Sentry payload to shared external context.
     *
     * @param external External Sentry payload.
     * @returns Shared external context.
     */
    public toDomain(external: unknown): IExternalContext {
        return mapSentryContext(external)
    }
}
