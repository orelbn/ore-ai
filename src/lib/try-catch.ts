type Success<T> = {
	data: T;
	error: null;
};

type Failure<E> = {
	data: null;
	error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

function normalizeError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

function toSuccess<TResult>(data: TResult): Result<TResult> {
	return { data, error: null };
}

function toFailure<TResult>(error: unknown): Result<TResult> {
	return { data: null, error: normalizeError(error) };
}

export function tryCatch<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => TResult,
): (...args: TArgs) => Result<TResult> {
	return (...args) => {
		try {
			return toSuccess(fn(...args));
		} catch (error) {
			return toFailure(error);
		}
	};
}

export function tryCatchAsync<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<Result<TResult>> {
	return async (...args) => {
		try {
			return toSuccess(await fn(...args));
		} catch (error) {
			return toFailure(error);
		}
	};
}
