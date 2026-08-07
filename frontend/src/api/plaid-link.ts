import { initClient } from "@ts-rest/core";
import {
    plaidLinkContract,
    type CreatePlaidLinkConnectionBody,
} from "@kick-demo/shared";
import { toApiError } from "./errors";

/**
 * The demo BFF's own Plaid Link endpoints. These have no Platform API
 * counterpart: the BFF holds the Plaid credentials and turns the browser's
 * public token into the processor token Kick expects.
 */
const api = initClient(plaidLinkContract, { baseUrl: "/api" });

export async function fetchPlaidLinkConfig() {
    const result = await api.getConfig();
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function createPlaidLinkToken() {
    const result = await api.createLinkToken();
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function createPlaidLinkConnection(
    body: CreatePlaidLinkConnectionBody,
) {
    const result = await api.createConnection({ body });
    if (result.status === 201) {
        return result.body;
    }
    throw toApiError(result);
}
