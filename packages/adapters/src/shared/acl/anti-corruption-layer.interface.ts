import {type Result} from "@codenautic/core"

/**
 * Generic Anti-Corruption Layer contract.
 *
 * @template TExternal External provider payload.
 * @template TDomain Stable domain-facing DTO.
 * @template TError Normalized adapter error.
 */
export interface IAntiCorruptionLayer<TExternal, TDomain, TError extends Error = Error> {
    /**
     * Maps external payload into stable domain DTO.
     *
     * @param external External provider data.
     * @returns Mapped domain DTO or normalized error.
     */
    transform(external: TExternal): Result<TDomain, TError>
}
