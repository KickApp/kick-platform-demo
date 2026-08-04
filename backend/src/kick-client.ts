import { initClient } from "@ts-rest/core";
import { errorMessageSchema, platformContract } from "@kick-demo/shared";
import type { ErrorMessage } from "@kick-demo/shared";
import { config } from "./config";

/**
 * Typed client for the upstream Kick Platform API. The organization access
 * token stays server-side; the frontend only ever talks to this BFF.
 */
export const kickClient = initClient(platformContract, {
    baseUrl: config.kickApiBaseUrl,
    baseHeaders: {
        authorization: `Bearer ${config.kickPlatformApiToken}`,
    },
});

export class UpstreamError extends Error {
    constructor(
        readonly status: number,
        readonly body: unknown,
    ) {
        super(`Unexpected upstream response (status ${status})`);
    }
}

type ForwardedErrorStatus = 400 | 401 | 404 | 429;

type ForwardedError = {
    status: ForwardedErrorStatus;
    body: ErrorMessage;
};

/**
 * Passes a declared upstream error response through to the BFF caller with
 * its original status and message. Anything outside the contract (e.g. 500,
 * HTML from a wrong base URL) is surfaced as a 502 via {@link UpstreamError}.
 */
export function forwardUpstreamError(result: {
    status: number;
    body: unknown;
}): ForwardedError {
    const parsedBody = errorMessageSchema.safeParse(result.body);
    if (!parsedBody.success) {
        throw new UpstreamError(result.status, result.body);
    }
    switch (result.status) {
        case 400:
        case 401:
        case 404:
        case 429:
            return { status: result.status, body: parsedBody.data };
        default:
            throw new UpstreamError(result.status, result.body);
    }
}
