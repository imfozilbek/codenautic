import {Container, type IGitProvider} from "@codenautic/core"

import {bindConstantSingleton} from "../shared/bind-constant-singleton"
import type {IGitProviderFactory} from "./git-provider.factory"
import {GIT_TOKENS} from "./git.tokens"

/**
 * Registration options for git adapter module.
 */
export interface IRegisterGitModuleOptions {
    /**
     * Git provider implementation.
     */
    readonly provider: IGitProvider

    /**
     * Optional git provider factory.
     */
    readonly providerFactory?: IGitProviderFactory
}

/**
 * Registers git adapters in DI container.
 *
 * @param container Target container.
 * @param options Module options.
 */
export function registerGitModule(container: Container, options: IRegisterGitModuleOptions): void {
    bindConstantSingleton(container, GIT_TOKENS.Provider, options.provider)

    if (options.providerFactory !== undefined) {
        bindConstantSingleton(
            container,
            GIT_TOKENS.ProviderFactory,
            options.providerFactory,
        )
    }
}
