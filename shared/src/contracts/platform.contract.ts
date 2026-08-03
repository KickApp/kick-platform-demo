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
    createPlatformWorkspaceBodySchema,
    platformWorkspacePathParamsSchema,
    platformWorkspaceResponseSchema,
    platformWorkspacesListResponseSchema,
} from "../schemas/workspace.schema";

const c = initContract();

/**
 * Vendored mirror of the Kick Platform API contracts
 * (`common/contracts/platform/*.platform.contract.ts` in the kick repo),
 * restricted to the resources this demo uses. Paths match the upstream API
 * exactly, so the same contract drives both the backend's upstream client
 * (base `https://use-dev.kick.co/api`) and the frontend's client against the
 * BFF (base `/api`).
 *
 * Error responses are declared as the superset {400, 401, 404, 429} on every
 * route so the BFF can pass upstream errors through uniformly.
 */
const errorResponses = {
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
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

export const platformContract = c.router({
    workspaces: workspacesContract,
    entities: entitiesContract,
});
