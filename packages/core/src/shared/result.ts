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
    public get isSuccess(): boolean {
        return this._isSuccess
    }

    /**
     * Indicates failure state.
     *
     * @returns True for failure.
     */
    public get isFailure(): boolean {
        return this._isSuccess === false
    }

    /**
     * Success payload when available.
     *
     * @returns Value for success result.
     */
    public get value(): TValue | undefined {
        if (this._value === null) {
            return undefined
        }
        return this._value
    }

    /**
     * Failure payload when available.
     *
     * @returns Error for failed result.
     */
    public get error(): TError | undefined {
        if (this._error === null) {
            return undefined
        }
        return this._error
    }
}
