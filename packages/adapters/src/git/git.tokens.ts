import {
    createToken,
    type IGitBlame,
    type IGitPipelineStatusProvider,
    type IGitProvider,
    type IRepositoryWorkspaceProvider,
} from "@codenautic/core"

import type {IGitProviderFactory} from "./git-provider.factory"
import type {IGitProviderHealthMonitor} from "./git-provider-health-monitor"

/**
 * DI tokens for git adapter domain.
 */
export const GIT_TOKENS = {
    Blame: createToken<IGitBlame>("adapters.git.blame"),
    HealthMonitor: createToken<IGitProviderHealthMonitor>("adapters.git.health-monitor"),
    PipelineStatus: createToken<IGitPipelineStatusProvider>("adapters.git.pipeline-status"),
    Provider: createToken<IGitProvider>("adapters.git.provider"),
    ProviderFactory: createToken<IGitProviderFactory>("adapters.git.provider-factory"),
    RepositoryWorkspaceProvider: createToken<IRepositoryWorkspaceProvider>(
        "adapters.git.repository-workspace-provider",
    ),
} as const
