import { initContract } from "@ts-rest/core";
import { errorMessageSchema } from "../schemas/error.schema";
import { platformPlaidConnectionResponseSchema } from "../schemas/plaid-connection.schema";
import {
    createPlaidLinkConnectionBodySchema,
    createPlaidLinkTokenResponseSchema,
    plaidLinkConfigResponseSchema,
} from "../schemas/plaid-link.schema";

const c = initContract();

/**
 * The demo BFF's own endpoints, deliberately kept out of
 * `platform.contract.ts`: that file is a byte-for-byte mirror of the Kick
 * Platform API, and none of these routes exist upstream.
 *
 * They exist because minting a Plaid `processor_token` is the partner's
 * responsibility. The browser runs Plaid Link, and the BFF — the only side
 * holding the Plaid API credentials — exchanges the resulting public token,
 * creates a `kick` processor token from it, and passes that to the Platform
 * API. The `/demo/` prefix keeps them visibly distinct from `/platform/v1/`.
 *
 * 503 means the BFF has no Plaid credentials configured; the demo still works
 * for every other resource in that state.
 */
const errorResponses = {
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
    429: errorMessageSchema,
    503: errorMessageSchema,
};

export const plaidLinkContract = c.router(
    {
        getConfig: {
            method: "GET",
            path: "/config",
            responses: {
                200: plaidLinkConfigResponseSchema,
                ...errorResponses,
            },
        },
        createLinkToken: {
            method: "POST",
            path: "/link-token",
            body: c.noBody(),
            responses: {
                200: createPlaidLinkTokenResponseSchema,
                ...errorResponses,
            },
        },
        createConnection: {
            method: "POST",
            path: "/connections",
            body: createPlaidLinkConnectionBodySchema,
            responses: {
                201: platformPlaidConnectionResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/demo/v1/plaid-link" },
);
