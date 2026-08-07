import { initClient } from "@ts-rest/core";
import { z } from "zod";
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

type ForwardedErrorStatus = 400 | 401 | 404 | 409 | 429;

type ForwardedError = {
    status: ForwardedErrorStatus;
    body: ErrorMessage;
};

const zodErrorSchema = z.object({
    name: z.literal("ZodError"),
    issues: z.array(
        z.object({
            path: z.array(z.union([z.string(), z.number()])),
            message: z.string(),
        }),
    ),
});

/**
 * Kick rejects a malformed request before it reaches a controller, and that
 * answer is a ts-rest validation envelope rather than the usual `{ message }`.
 * Reports have by far the most validatable query parameters in this demo, so
 * without unwrapping it a plain "startDate must be on or before endDate" would
 * reach the caller as an opaque 502.
 */
const requestValidationErrorSchema = z.object({
    paramsResult: zodErrorSchema.nullish(),
    queryResult: zodErrorSchema.nullish(),
    headersResult: zodErrorSchema.nullish(),
    bodyResult: zodErrorSchema.nullish(),
});

const VALIDATION_SECTIONS = [
    ["paramsResult", "path"],
    ["queryResult", "query"],
    ["headersResult", "header"],
    ["bodyResult", "body"],
] as const;

function toRequestValidationError(body: unknown): ErrorMessage | null {
    const parsedBody = requestValidationErrorSchema.safeParse(body);
    if (!parsedBody.success) {
        return null;
    }
    const problems = VALIDATION_SECTIONS.flatMap(([field, section]) => {
        const zodError = parsedBody.data[field];
        if (zodError === null || zodError === undefined) {
            return [];
        }
        return zodError.issues.map((issue) => {
            const path = issue.path.join(".");
            return path !== ""
                ? `${section} ${path}: ${issue.message}`
                : `${section}: ${issue.message}`;
        });
    });
    if (problems.length === 0) {
        return null;
    }
    return { message: `Kick rejected the request (${problems.join("; ")})` };
}

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
    const body = parsedBody.success
        ? parsedBody.data
        : toRequestValidationError(result.body);
    if (body === null) {
        throw new UpstreamError(result.status, result.body);
    }
    switch (result.status) {
        case 400:
        case 401:
        case 404:
        case 409:
        case 429:
            return { status: result.status, body };
        default:
            throw new UpstreamError(result.status, result.body);
    }
}
