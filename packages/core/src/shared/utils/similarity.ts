/**
 * Computes cosine similarity in range [-1, 1].
 *
 * @param left First vector.
 * @param right Second vector.
 * @returns Cosine similarity.
 * @throws Error When vectors are empty or lengths differ.
 */
export function similarity(left: readonly number[], right: readonly number[]): number {
    if (left.length === 0 || right.length === 0) {
        throw new Error("Vectors must not be empty")
    }

    if (left.length !== right.length) {
        throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let leftNorm = 0
    let rightNorm = 0

    for (let index = 0; index < left.length; index++) {
        const leftValue = left[index]
        const rightValue = right[index]

        if (leftValue === undefined || rightValue === undefined) {
            throw new Error("Vector value is missing")
        }

        dotProduct += leftValue * rightValue
        leftNorm += leftValue ** 2
        rightNorm += rightValue ** 2
    }

    const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm)
    if (denominator === 0) {
        throw new Error("Vectors must have non-zero magnitude")
    }

    const score = dotProduct / denominator
    return Math.max(-1, Math.min(1, score))
}
