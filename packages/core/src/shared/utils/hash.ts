import {createHash} from "node:crypto"

/**
 * Computes deterministic SHA-256 digest for input string.
 *
 * @param value Source string.
 * @returns Hex-encoded SHA-256 digest.
 */
export function hash(value: string): string {
    return createHash("sha256").update(value).digest("hex")
}
