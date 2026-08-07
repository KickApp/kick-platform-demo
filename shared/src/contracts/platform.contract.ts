import { initContract } from "@ts-rest/core";
import { errorMessageSchema } from "../schemas/error.schema";
import { platformPaginationQuerySchema } from "../schemas/pagination.schema";
import {
    createPlatformEntityBodySchema,
    platformEntitiesListQuerySchema,
    platformEntitiesListResponseSchema,
    platformEntityPathParamsSchema,
    platformEntityResponseSchema,
} from "../schemas/entity.schema";
import {
    createPlatformPlaidConnectionBodySchema,
    platformPlaidConnectionListQuerySchema,
    platformPlaidConnectionListResponseSchema,
    platformPlaidConnectionPathParamsSchema,
    platformPlaidConnectionResponseSchema,
} from "../schemas/plaid-connection.schema";
import {
    platformTransactionsListQuerySchema,
    platformTransactionsListResponseSchema,
    platformTransactionsPathParamsSchema,
} from "../schemas/transaction.schema";
import {
    createPlatformWorkspaceBodySchema,
    platformWorkspacePathParamsSchema,
    platformWorkspaceResponseSchema,
    platformWorkspacesListResponseSchema,
} from "../schemas/workspace.schema";

const c = initContract();

/**
 * Vendored mirror of the Kick Platform API, restricted to the resources this
 * demo uses. Paths match the upstream API
 * exactly, so the same contract drives both the backend's upstream client
 * (base `https://use-dev.kick.co/api`) and the frontend's client against the
 * BFF (base `/api`).
 *
 * Error responses are declared as the superset {400, 401, 404, 409, 429} on
 * every route so the BFF can pass upstream errors through uniformly. Only
 * deleting a Plaid connection actually answers 409 today.
 */
const errorResponses = {
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
    429: errorMessageSchema,
};

const workspacesContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformPaginationQuerySchema,
            responses: {
                200: platformWorkspacesListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformWorkspaceBodySchema,
            responses: {
                201: platformWorkspaceResponseSchema,
                ...errorResponses,
            },
        },
        get: {
            method: "GET",
            path: "/:workspaceId",
            pathParams: platformWorkspacePathParamsSchema,
            responses: {
                200: platformWorkspaceResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/workspaces" },
);

const entitiesContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformEntitiesListQuerySchema,
            responses: {
                200: platformEntitiesListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformEntityBodySchema,
            responses: {
                201: platformEntityResponseSchema,
                ...errorResponses,
            },
        },
        get: {
            method: "GET",
            path: "/:entityId",
            pathParams: platformEntityPathParamsSchema,
            responses: {
                200: platformEntityResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/entities" },
);

/**
 * The partner runs Plaid Link under its own credentials and passes Kick the
 * resulting processor token, so creation needs no link/public token exchange.
 * Listing is scoped to one workspace and only ever returns the connections the
 * partner created.
 */
const plaidConnectionsContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformPlaidConnectionListQuerySchema,
            responses: {
                200: platformPlaidConnectionListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformPlaidConnectionBodySchema,
            responses: {
                201: platformPlaidConnectionResponseSchema,
                ...errorResponses,
            },
        },
        delete: {
            method: "DELETE",
            path: "/:connectionId",
            pathParams: platformPlaidConnectionPathParamsSchema,
            body: c.noBody(),
            responses: {
                200: c.noBody(),
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/plaid-connections" },
);

/**
 * Transactions are read across every entity of a workspace, so the route is
 * nested under the workspace uuid. Only listing is vendored: the demo does not
 * update transactions.
 */
const transactionsContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            pathParams: platformTransactionsPathParamsSchema,
            query: platformTransactionsListQuerySchema,
            responses: {
                200: platformTransactionsListResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/workspaces/:workspaceId/transactions" },
);

export const platformContract = c.router({
    workspaces: workspacesContract,
    entities: entitiesContract,
    plaidConnections: plaidConnectionsContract,
    transactions: transactionsContract,
});
