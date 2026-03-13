import {
    createToken,
    type IGitBlame,
    type IGitProvider,
    type IRepositoryWorkspaceProvider,
} from "@codenautic/core"

import type {IGitProviderFactory} from "./git-provider.factory"

/**
 * DI tokens for git adapter domain.
 */
export const GIT_TOKENS = {
    Blame: createToken<IGitBlame>("adapters.git.blame"),
    Provider: createToken<IGitProvider>("adapters.git.provider"),
    ProviderFactory: createToken<IGitProviderFactory>("adapters.git.provider-factory"),
    RepositoryWorkspaceProvider: createToken<IRepositoryWorkspaceProvider>(
        "adapters.git.repository-workspace-provider",
    ),
} as const
