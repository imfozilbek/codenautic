/**
 * Functional-style result wrapper for expected failures.
 *
 * @template TValue Success payload type.
 * @template TError Failure payload type.
 */
export class Result<TValue, TError extends Error> {
    private readonly _isSuccess: boolean
    private readonly _value: TValue | null
    private readonly _error: TError | null

    /**
     * Creates result container.
     *
     * @param isSuccess Success state flag.
     * @param value Success payload.
     * @param error Failure payload.
     */
    private constructor(isSuccess: boolean, value: TValue | null, error: TError | null) {
        this._isSuccess = isSuccess
        this._value = value
        this._error = error
    }

    /**
     * Creates successful result.
     *
     * @param value Success payload.
     * @returns Successful result.
     */
    public static ok<TValue, TError extends Error = Error>(value: TValue): Result<TValue, TError> {
        return new Result<TValue, TError>(true, value, null)
    }

    /**
     * Creates failed result.
     *
     * @param error Failure payload.
     * @returns Failed result.
     */
    public static fail<TValue, TError extends Error>(error: TError): Result<TValue, TError> {
        return new Result<TValue, TError>(false, null, error)
    }

    /**
     * Indicates success state.
     *
     * @returns True for success.
     */
    public get isOk(): boolean {
        return this._isSuccess
    }

    /**
     * Indicates failure state.
     *
     * @returns True for failure.
     */
    public get isFail(): boolean {
        return this._isSuccess === false
    }

    /**
     * Backward-compatible success alias.
     *
     * @returns True for success.
     */
    public get isSuccess(): boolean {
        return this.isOk
    }

    /**
     * Backward-compatible failure alias.
     *
     * @returns True for failure.
     */
    public get isFailure(): boolean {
        return this.isFail
    }

    /**
     * Success payload.
     *
     * @returns Value for success result.
     * @throws Error When accessed on failed result.
     */
    public get value(): TValue {
        if (this._value === null || this.isFail) {
            throw new Error("Cannot access value from failed result")
        }

        return this._value
    }

    /**
     * Failure payload.
     *
     * @returns Error for failed result.
     * @throws Error When accessed on successful result.
     */
    public get error(): TError {
        if (this._error === null || this.isOk) {
            throw new Error("Cannot access error from successful result")
        }

        return this._error
    }

    /**
     * Maps successful value and leaves failed result untouched.
     *
     * @template TNextValue Mapped success type.
     * @param mapper Mapping function for success value.
     * @returns Result with mapped value or original error.
     */
    public map<TNextValue>(mapper: (value: TValue) => TNextValue): Result<TNextValue, TError> {
        if (this.isFail) {
            return Result.fail<TNextValue, TError>(this.error)
        }

        return Result.ok<TNextValue, TError>(mapper(this.value))
    }

    /**
     * Chains another result-producing operation for success branch.
     *
     * @template TNextValue Next success type.
     * @param mapper Result-returning mapper.
     * @returns Next result for success or original error.
     */
    public flatMap<TNextValue>(
        mapper: (value: TValue) => Result<TNextValue, TError>,
    ): Result<TNextValue, TError> {
        if (this.isFail) {
            return Result.fail<TNextValue, TError>(this.error)
        }

        return mapper(this.value)
    }

    /**
     * Returns success value or fallback when failed.
     *
     * @param fallback Fallback value.
     * @returns Success value or fallback.
     */
    public unwrapOr(fallback: TValue): TValue {
        if (this.isOk) {
            return this.value
        }

        return fallback
    }
}
