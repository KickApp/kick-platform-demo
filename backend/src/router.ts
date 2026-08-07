import { initServer } from "@ts-rest/express";
import { platformContract } from "@kick-demo/shared";
import { forwardUpstreamError, kickClient } from "./kick-client";

const s = initServer();

/**
 * Pass-through handlers: the BFF exposes the same contract it consumes, so
 * each handler forwards the validated request upstream and relays the
 * response. The only thing added server-side is the bearer token.
 */
export const platformRouter = s.router(platformContract, {
    workspaces: {
        list: async ({ query }) => {
            const result = await kickClient.workspaces.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.workspaces.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        get: async ({ params }) => {
            const result = await kickClient.workspaces.get({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
    entities: {
        list: async ({ query }) => {
            const result = await kickClient.entities.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.entities.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        get: async ({ params }) => {
            const result = await kickClient.entities.get({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
    plaidConnections: {
        list: async ({ query }) => {
            const result = await kickClient.plaidConnections.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.plaidConnections.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        // The upstream 200 carries no body, so neither does this one.
        delete: async ({ params }) => {
            const result = await kickClient.plaidConnections.delete({ params });
            if (result.status === 200) {
                return { status: 200, body: undefined };
            }
            return forwardUpstreamError(result);
        },
    },
    transactions: {
        list: async ({ params, query }) => {
            const result = await kickClient.transactions.list({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
});
