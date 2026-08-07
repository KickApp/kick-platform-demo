import { errorMessageSchema } from "@kick-demo/shared";

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export function toApiError(result: {
    status: number;
    body: unknown;
}): ApiError {
    const parsedBody = errorMessageSchema.safeParse(result.body);
    const message = parsedBody.success
        ? parsedBody.data.message
        : `Request failed with status ${result.status}`;
    return new ApiError(result.status, message);
}
